/**
 * Server Configuration
 * 
 * This module configures the MCP server with tools and resources
 * for n8n workflow management.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { getEnvConfig } from './environment.js';
import { WorkflowToolHandler, getWorkflowToolsMap } from '../tools/workflow/index.js';
import { setupExecutionTools } from '../tools/execution/index.js';
import { setupResourceHandlers } from '../resources/index.js';
import { createApiService } from '../api/n8n-client.js';
import { ClaudeCommunicationHandler } from '../tools/claude/index.js';

// Import types
import { ToolCallResult } from '../types/index.js';

// Global singleton for Claude communication to maintain conversation state
let claudeHandlerInstance: ClaudeCommunicationHandler | null = null;

function getClaudeHandlerSingleton(): ClaudeCommunicationHandler {
  if (!claudeHandlerInstance) {
    claudeHandlerInstance = new ClaudeCommunicationHandler();
  }
  return claudeHandlerInstance;
}

/**
 * Configure and return an MCP server instance with all tools and resources
 * 
 * @returns Configured MCP server instance
 */
export async function configureServer(): Promise<Server> {
  // Get validated environment configuration
  const envConfig = getEnvConfig();
  
  // Create n8n API service
  const apiService = createApiService(envConfig);
  
  // Verify n8n API connectivity
  try {
    console.error('Verifying n8n API connectivity...');
    await apiService.checkConnectivity();
    console.error(`Successfully connected to n8n API at ${envConfig.n8nApiUrl}`);
  } catch (error) {
    console.error('ERROR: Failed to connect to n8n API:', error instanceof Error ? error.message : error);
    throw error;
  }

  // Create server instance
  const server = new Server(
    {
      name: 'n8n-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Set up all request handlers
  setupToolListRequestHandler(server);
  setupToolCallRequestHandler(server);
  setupResourceHandlers(server, envConfig);

  return server;
}

/**
 * Set up the tool list request handler for the server
 * 
 * @param server MCP server instance
 */
function setupToolListRequestHandler(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    // Get workflow tools from the new system
    const workflowToolsMap = getWorkflowToolsMap();
    const workflowTools = Array.from(workflowToolsMap.values());
    
    // Get execution tools
    const executionTools = await setupExecutionTools();

    // Get Claude communication tools - use singleton to maintain state
    const claudeHandler = getClaudeHandlerSingleton();
    const claudeTools = claudeHandler.getToolDefinitions();

    return {
      tools: [...workflowTools, ...executionTools, ...claudeTools],
    };
  });
}

/**
 * Set up the tool call request handler for the server
 * 
 * @param server MCP server instance
 */
function setupToolCallRequestHandler(server: Server): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    try {
      // Handle "prompts/list" as a special case, returning an empty success response
      // This is to address client calls for a method not central to n8n-mcp-server's direct n8n integration.
      if (toolName === 'prompts/list') {
        return {
          content: [{ type: 'text', text: 'Prompts list acknowledged.' }],
          isError: false,
        };
      }

      // Check if it's a Claude communication tool - USE SINGLETON to maintain conversation state
      const claudeToolNames = ['send_message_to_claude', 'get_claude_conversation', 'clear_claude_conversation', 'get_claude_conversation_stats'];
      if (claudeToolNames.includes(toolName)) {
        console.error(`Handling Claude tool: ${toolName}`);
        const result = await getClaudeHandlerSingleton().handleToolCall(toolName, args);
        console.error('Claude tool result:', JSON.stringify(result, null, 2));
        
        return {
          content: result.content,
          isError: result.isError || false,
        };
      }

      // Check if it's a workflow tool
      const workflowToolsMap = getWorkflowToolsMap();
      if (workflowToolsMap.has(toolName)) {
        const workflowHandler = new WorkflowToolHandler();
        const result = await workflowHandler.handle(toolName, args);
        
        return {
          content: result.content,
          isError: result.isError,
        };
      }

      // Handle execution tools
      const {
        ListExecutionsHandler,
        GetExecutionHandler,
        DeleteExecutionHandler,
        RunWebhookHandler
      } = await import('../tools/execution/index.js');
      
      let result: ToolCallResult;
      
      if (toolName === 'list_executions') {
        const handler = new ListExecutionsHandler();
        result = await handler.execute(args);
      } else if (toolName === 'get_execution') {
        const handler = new GetExecutionHandler();
        result = await handler.execute(args);
      } else if (toolName === 'delete_execution') {
        const handler = new DeleteExecutionHandler();
        result = await handler.execute(args);
      } else if (toolName === 'run_webhook') {
        const handler = new RunWebhookHandler();
        result = await handler.execute(args);
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        content: result.content,
        isError: result.isError,
      };
    } catch (error) {
      console.error(`Error handling tool call to ${toolName}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  });
}

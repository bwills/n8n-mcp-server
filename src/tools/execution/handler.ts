/**
 * Execution Tools Handler
 * 
 * This module handles calls to execution-related tools.
 */

import { ToolDefinition, ToolCallResult } from '../../types/index.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode } from '../../errors/error-codes.js';
import { getErrorMessage } from '../../errors/index.js';
import { 
  ListExecutionsHandler, 
  GetExecutionHandler,
  DeleteExecutionHandler,
  RunWebhookHandler
} from './index.js';
import { ExecuteWorkflowHandler } from './execute.js';
import { ExecutionStatusHandler } from './status.js';

/**
 * Handle execution tool calls
 * 
 * @param toolName Name of the tool being called
 * @param args Arguments passed to the tool
 * @returns Tool call result
 */
export default async function executionHandler(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  try {
    // Route to the appropriate handler based on tool name
    switch (toolName) {
      case 'list_executions':
        return await new ListExecutionsHandler().execute(args);
        
      case 'get_execution':
        return await new GetExecutionHandler().execute(args);
        
      case 'delete_execution':
        return await new DeleteExecutionHandler().execute(args);
        
      case 'run_webhook':
        return await new RunWebhookHandler().execute(args);
        
      case 'execute_workflow':
        return await new ExecuteWorkflowHandler().executeWorkflow(args as {
          workflowId: string;
          inputData?: any;
          waitForCompletion?: boolean;
          timeout?: number;
        });
      
      case 'execute_workflow_async':
        return await new ExecuteWorkflowHandler().executeWorkflowAsync(args as {
          workflowId: string;
          inputData?: any;
        });
      
      case 'get_execution_status':
        return await new ExecutionStatusHandler().getExecutionStatus(args as { executionId: string });
      
      case 'list_recent_executions':
        return await new ExecutionStatusHandler().listRecentExecutions(args as {
          workflowId?: string;
          status?: string;
          limit?: number;
          includeData?: boolean;
        });
      
      case 'cancel_execution':
        return await new ExecutionStatusHandler().cancelExecution(args as { executionId: string });
        
      default:
        throw new McpError(
          ErrorCode.NotImplemented,
          `Unknown execution tool: '${toolName}'`
        );
    }
  } catch (error) {
    // Get appropriate error message
    const errorMessage = getErrorMessage(error);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error executing execution tool: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Get execution tool definitions for MCP server
 */
export function getExecutionToolsMap(): Record<string, ToolDefinition> {
  return {
    execute_workflow: {
      name: 'execute_workflow',
      description: 'Execute a workflow by ID with optional input data and wait for completion',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to execute'
          },
          inputData: {
            type: 'object',
            description: 'Optional input data for Manual Trigger'
          },
          waitForCompletion: {
            type: 'boolean',
            description: 'Wait for execution completion (default: true)'
          },
          timeout: {
            type: 'number',
            description: 'Timeout in seconds (default: 300)'
          }
        },
        required: ['workflowId'],
        additionalProperties: false
      }
    },
    
    execute_workflow_async: {
      name: 'execute_workflow_async',
      description: 'Execute a workflow asynchronously (fire-and-forget)',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'The ID of the workflow to execute'
          },
          inputData: {
            type: 'object',
            description: 'Optional input data for Manual Trigger'
          }
        },
        required: ['workflowId'],
        additionalProperties: false
      }
    },
    
    get_execution_status: {
      name: 'get_execution_status',
      description: 'Check the status of a running or completed execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'The ID of the execution to check'
          }
        },
        required: ['executionId'],
        additionalProperties: false
      }
    },
    
    list_recent_executions: {
      name: 'list_recent_executions',
      description: 'Get recent executions with optional filtering',
      inputSchema: {
        type: 'object',
        properties: {
          workflowId: {
            type: 'string',
            description: 'Optional: Filter by workflow ID'
          },
          status: {
            type: 'string',
            description: 'Optional: Filter by execution status'
          },
          limit: {
            type: 'number',
            description: 'Optional: Maximum number of results (default: 10)'
          },
          includeData: {
            type: 'boolean',
            description: 'Optional: Include execution data (default: false)'
          }
        },
        additionalProperties: false
      }
    },
    
    cancel_execution: {
      name: 'cancel_execution',
      description: 'Cancel a running execution',
      inputSchema: {
        type: 'object',
        properties: {
          executionId: {
            type: 'string',
            description: 'The ID of the execution to cancel'
          }
        },
        required: ['executionId'],
        additionalProperties: false
      }
    }
  };
}

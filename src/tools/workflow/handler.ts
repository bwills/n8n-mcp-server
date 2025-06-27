/**
 * Workflow Tools Handler
 * 
 * This module handles calls to workflow-related tools.
 */

import { ToolCallResult, ToolDefinition } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

// Core workflow operations
import { ListWorkflowsHandler, getListWorkflowsToolDefinition } from './list.js';
import { GetWorkflowHandler, getGetWorkflowToolDefinition } from './get.js';
import { CreateWorkflowHandler, getCreateWorkflowToolDefinition } from './create.js';
import { UpdateWorkflowHandler, getUpdateWorkflowToolDefinition } from './update.js';
import { DeleteWorkflowHandler, getDeleteWorkflowToolDefinition } from './delete.js';
import { ActivateWorkflowHandler, getActivateWorkflowToolDefinition } from './activate.js';
import { DeactivateWorkflowHandler, getDeactivateWorkflowToolDefinition } from './deactivate.js';

// Node manipulation tools
import { UpdateNodeNameHandler, getUpdateNodeNameToolDefinition } from './update-node-name.js';
import { UpdateNodeParametersHandler, getUpdateNodeParametersToolDefinition } from './update-node-parameters.js';
import { AddNodeHandler, getAddNodeToolDefinition } from './add-node.js';
import { DeleteNodeHandler, getDeleteNodeToolDefinition } from './delete-node.js';
import { MoveNodeHandler, getMoveNodeToolDefinition } from './move-node.js';

// Connection manipulation tools
import { AddConnectionHandler, getAddConnectionToolDefinition } from './add-connection.js';
import { RemoveConnectionHandler, getRemoveConnectionToolDefinition } from './remove-connection.js';

// Bulk operation tools
import { UpdateMultipleNodesHandler, getUpdateMultipleNodesToolDefinition } from './update-multiple-nodes.js';

/**
 * Workflow tool handler class
 */
export class WorkflowToolHandler {
  /**
   * Handle workflow tool calls
   * 
   * @param toolName Name of the tool being called
   * @param args Arguments passed to the tool
   * @returns Tool call result
   */
  async handle(toolName: string, args: Record<string, any>): Promise<ToolCallResult> {
    try {
      // Route to the appropriate handler based on the tool name
      switch (toolName) {
        // Core workflow operations
        case 'list_workflows':
          return await new ListWorkflowsHandler().execute(args);
        case 'get_workflow':
          return await new GetWorkflowHandler().execute(args);
        case 'create_workflow':
          return await new CreateWorkflowHandler().execute(args);
        case 'update_workflow':
          return await new UpdateWorkflowHandler().execute(args);
        case 'delete_workflow':
          return await new DeleteWorkflowHandler().execute(args);
        case 'activate_workflow':
          return await new ActivateWorkflowHandler().execute(args);
        case 'deactivate_workflow':
          return await new DeactivateWorkflowHandler().execute(args);
          
        // Node manipulation tools
        case 'update_node_name':
          return await new UpdateNodeNameHandler().execute(args);
        case 'update_node_parameters':
          return await new UpdateNodeParametersHandler().execute(args);
        case 'add_node':
          return await new AddNodeHandler().execute(args);
        case 'delete_node':
          return await new DeleteNodeHandler().execute(args);
        case 'move_node':
          return await new MoveNodeHandler().execute(args);
          
        // Connection manipulation tools
        case 'add_connection':
          return await new AddConnectionHandler().execute(args);
        case 'remove_connection':
          return await new RemoveConnectionHandler().execute(args);
          
        // Bulk operation tools
        case 'update_multiple_nodes':
          return await new UpdateMultipleNodesHandler().execute(args);
          
        default:
          throw new N8nApiError(`Unknown workflow tool: ${toolName}`);
      }
    } catch (error) {
      if (error instanceof N8nApiError) {
        return {
          content: [
            {
              type: 'text',
              text: error.message,
            },
          ],
          isError: true,
        };
      }
      
      // Handle unexpected errors
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
        
      return {
        content: [
          {
            type: 'text',
            text: `Error executing workflow tool: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}

/**
 * Get workflow tools map with all tool definitions
 * 
 * @returns Map of tool names to definitions
 */
export function getWorkflowToolsMap(): Map<string, ToolDefinition> {
  const toolsMap = new Map<string, ToolDefinition>();
  
  // Core workflow operations
  toolsMap.set('list_workflows', getListWorkflowsToolDefinition());
  toolsMap.set('get_workflow', getGetWorkflowToolDefinition());
  toolsMap.set('create_workflow', getCreateWorkflowToolDefinition());
  toolsMap.set('update_workflow', getUpdateWorkflowToolDefinition());
  toolsMap.set('delete_workflow', getDeleteWorkflowToolDefinition());
  toolsMap.set('activate_workflow', getActivateWorkflowToolDefinition());
  toolsMap.set('deactivate_workflow', getDeactivateWorkflowToolDefinition());
  
  // Node manipulation tools
  toolsMap.set('update_node_name', getUpdateNodeNameToolDefinition());
  toolsMap.set('update_node_parameters', getUpdateNodeParametersToolDefinition());
  toolsMap.set('add_node', getAddNodeToolDefinition());
  toolsMap.set('delete_node', getDeleteNodeToolDefinition());
  toolsMap.set('move_node', getMoveNodeToolDefinition());
  
  // Connection manipulation tools
  toolsMap.set('add_connection', getAddConnectionToolDefinition());
  toolsMap.set('remove_connection', getRemoveConnectionToolDefinition());
  
  // Bulk operation tools
  toolsMap.set('update_multiple_nodes', getUpdateMultipleNodesToolDefinition());
  
  return toolsMap;
}

/**
 * Default export for backwards compatibility
 */
export default async function workflowHandler(
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  const handler = new WorkflowToolHandler();
  return handler.handle(toolName, args);
}

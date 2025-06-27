/**
 * Add Connection Tool
 * 
 * This tool adds a connection between two nodes in a workflow.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition, ConnectionSpec } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the add_connection tool
 */
export class AddConnectionHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing connection details
   * @returns Connection addition confirmation
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { 
        workflowId, 
        sourceNodeId, 
        targetNodeId, 
        sourceIndex = 0, 
        targetIndex = 0, 
        connectionType = 'main' 
      } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!sourceNodeId) {
        throw new N8nApiError('Missing required parameter: sourceNodeId');
      }
      
      if (!targetNodeId) {
        throw new N8nApiError('Missing required parameter: targetNodeId');
      }
      
      if (sourceNodeId === targetNodeId) {
        throw new N8nApiError('Cannot create connection: source and target nodes cannot be the same');
      }
      
      const connection: ConnectionSpec = {
        sourceNodeId,
        targetNodeId,
        sourceIndex,
        targetIndex,
        connectionType
      };
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Validate both nodes exist
        this.validateNodesExist(workflow, [sourceNodeId, targetNodeId]);
        
        // Add the connection
        const success = this.workflowUtils.addConnectionToWorkflow(workflow, connection);
        
        if (!success) {
          throw new N8nApiError(`Failed to add connection from ${sourceNodeId} to ${targetNodeId}`);
        }
      });
      
      return this.formatSuccess(
        {
          connection,
          workflowId: updatedWorkflow.id
        },
        `Connection added successfully: ${sourceNodeId}[${sourceIndex}] → ${targetNodeId}[${targetIndex}] (${connectionType})`
      );
    }, args);
  }
}

/**
 * Get tool definition for the add_connection tool
 * 
 * @returns Tool definition
 */
export function getAddConnectionToolDefinition(): ToolDefinition {
  return {
    name: 'add_connection',
    description: 'Add a connection between two nodes in a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to modify',
        },
        sourceNodeId: {
          type: 'string',
          description: 'ID of the source node',
        },
        targetNodeId: {
          type: 'string',
          description: 'ID of the target node',
        },
        sourceIndex: {
          type: 'number',
          description: 'Output index of the source node (defaults to 0)',
          default: 0,
        },
        targetIndex: {
          type: 'number',
          description: 'Input index of the target node (defaults to 0)',
          default: 0,
        },
        connectionType: {
          type: 'string',
          description: 'Type of connection (defaults to "main")',
          default: 'main',
        },
      },
      required: ['workflowId', 'sourceNodeId', 'targetNodeId'],
      additionalProperties: false,
    },
  };
} 
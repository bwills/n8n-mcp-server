/**
 * Update Node Name Tool
 * 
 * This tool updates the name of a specific node in a workflow.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the update_node_name tool
 */
export class UpdateNodeNameHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId, nodeId, and newName
   * @returns Updated node information
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeId, newName } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!nodeId) {
        throw new N8nApiError('Missing required parameter: nodeId');
      }
      
      if (!newName || typeof newName !== 'string') {
        throw new N8nApiError('Missing or invalid required parameter: newName');
      }
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Validate node exists
        this.validateNodeExists(workflow, nodeId);
        
        // Update the node name
        const updatedNode = this.workflowUtils.updateNodeInWorkflow(workflow, nodeId, { name: newName });
        
        if (!updatedNode) {
          throw new N8nApiError(`Failed to update node ${nodeId}`);
        }
      });
      
      // Find the updated node for response
      const updatedNode = this.workflowUtils.findNodeById(updatedWorkflow, nodeId);
      
      return this.formatSuccess(
        {
          nodeId: updatedNode?.id,
          name: updatedNode?.name,
          workflowId: updatedWorkflow.id
        },
        `Node name updated successfully: "${nodeId}" → "${newName}"`
      );
    }, args);
  }
}

/**
 * Get tool definition for the update_node_name tool
 * 
 * @returns Tool definition
 */
export function getUpdateNodeNameToolDefinition(): ToolDefinition {
  return {
    name: 'update_node_name',
    description: 'Update the name of a specific node in a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow containing the node',
        },
        nodeId: {
          type: 'string',
          description: 'ID of the node to update',
        },
        newName: {
          type: 'string',
          description: 'New name for the node',
        },
      },
      required: ['workflowId', 'nodeId', 'newName'],
      additionalProperties: false,
    },
  };
} 
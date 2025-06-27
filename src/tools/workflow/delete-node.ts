/**
 * Delete Node Tool
 * 
 * This tool removes a node from a workflow and cleans up all its connections.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition, ConnectionSpec } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the delete_node tool
 */
export class DeleteNodeHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId and nodeId
   * @returns Deletion confirmation and removed connections
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeId } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!nodeId) {
        throw new N8nApiError('Missing required parameter: nodeId');
      }
      
      let removedConnections: ConnectionSpec[] = [];
      let deletedNodeName: string = '';
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Validate node exists
        this.validateNodeExists(workflow, nodeId);
        
        // Get node name before deletion
        const nodeToDelete = this.workflowUtils.findNodeById(workflow, nodeId);
        if (nodeToDelete) {
          deletedNodeName = nodeToDelete.name;
        }
        
        // Remove the node and get removed connections
        removedConnections = this.workflowUtils.removeNodeFromWorkflow(workflow, nodeId);
      });
      
      return this.formatSuccess(
        {
          deletedNodeId: nodeId,
          deletedNodeName,
          removedConnections: removedConnections.length,
          connectionDetails: removedConnections,
          workflowId: updatedWorkflow.id
        },
        `Node "${deletedNodeName}" (${nodeId}) deleted successfully. Removed ${removedConnections.length} connections.`
      );
    }, args);
  }
}

/**
 * Get tool definition for the delete_node tool
 * 
 * @returns Tool definition
 */
export function getDeleteNodeToolDefinition(): ToolDefinition {
  return {
    name: 'delete_node',
    description: 'Remove a node from a workflow and clean up all its connections',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow containing the node',
        },
        nodeId: {
          type: 'string',
          description: 'ID of the node to delete',
        },
      },
      required: ['workflowId', 'nodeId'],
      additionalProperties: false,
    },
  };
} 
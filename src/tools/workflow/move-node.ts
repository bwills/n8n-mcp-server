/**
 * Move Node Tool
 * 
 * This tool updates the position of a specific node in a workflow.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the move_node tool
 */
export class MoveNodeHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId, nodeId, and newPosition
   * @returns Updated node position information
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeId, newPosition } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!nodeId) {
        throw new N8nApiError('Missing required parameter: nodeId');
      }
      
      if (!Array.isArray(newPosition) || newPosition.length !== 2) {
        throw new N8nApiError('Invalid newPosition: must be an array of [x, y] coordinates');
      }
      
      if (!newPosition.every(coord => typeof coord === 'number')) {
        throw new N8nApiError('Invalid newPosition: coordinates must be numbers');
      }
      
      let oldPosition: [number, number] = [0, 0];
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Validate node exists
        this.validateNodeExists(workflow, nodeId);
        
        // Get current position
        const currentNode = this.workflowUtils.findNodeById(workflow, nodeId);
        if (currentNode) {
          oldPosition = currentNode.position;
        }
        
        // Update the node position
        const updatedNode = this.workflowUtils.updateNodeInWorkflow(workflow, nodeId, { 
          position: [newPosition[0], newPosition[1]] as [number, number]
        });
        
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
          oldPosition,
          newPosition: updatedNode?.position,
          workflowId: updatedWorkflow.id
        },
        `Node "${updatedNode?.name}" (${nodeId}) moved from [${oldPosition.join(', ')}] to [${newPosition.join(', ')}]`
      );
    }, args);
  }
}

/**
 * Get tool definition for the move_node tool
 * 
 * @returns Tool definition
 */
export function getMoveNodeToolDefinition(): ToolDefinition {
  return {
    name: 'move_node',
    description: 'Update the position of a specific node in a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow containing the node',
        },
        nodeId: {
          type: 'string',
          description: 'ID of the node to move',
        },
        newPosition: {
          type: 'array',
          description: 'New position [x, y] coordinates for the node',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ['workflowId', 'nodeId', 'newPosition'],
      additionalProperties: false,
    },
  };
} 
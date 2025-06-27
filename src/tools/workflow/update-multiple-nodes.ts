/**
 * Update Multiple Nodes Tool
 * 
 * This tool updates multiple nodes in a workflow with a single operation.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition, NodeUpdate } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the update_multiple_nodes tool
 */
export class UpdateMultipleNodesHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId and nodeUpdates
   * @returns Bulk update confirmation
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeUpdates } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!Array.isArray(nodeUpdates) || nodeUpdates.length === 0) {
        throw new N8nApiError('Missing or invalid required parameter: nodeUpdates (must be a non-empty array)');
      }
      
      // Validate each update object
      for (let i = 0; i < nodeUpdates.length; i++) {
        const update = nodeUpdates[i];
        if (!update.nodeId) {
          throw new N8nApiError(`Invalid nodeUpdate at index ${i}: missing nodeId`);
        }
        if (!update.updates || typeof update.updates !== 'object') {
          throw new N8nApiError(`Invalid nodeUpdate at index ${i}: missing or invalid updates object`);
        }
      }
      
      const appliedUpdates: Array<{ nodeId: string; applied: string[] }> = [];
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Extract all node IDs to validate they exist
        const nodeIds = nodeUpdates.map((update: NodeUpdate) => update.nodeId);
        this.validateNodesExist(workflow, nodeIds);
        
        // Apply each update
        for (const update of nodeUpdates) {
          const { nodeId, updates } = update;
          const appliedFields: string[] = [];
          
          // Get current node
          const currentNode = this.workflowUtils.findNodeById(workflow, nodeId);
          if (!currentNode) {
            throw new N8nApiError(`Node ${nodeId} not found`);
          }
          
          // Apply updates one by one to track what was changed
          for (const [field, value] of Object.entries(updates)) {
            if (field === 'parameters') {
              // Special handling for parameters - merge by default
              const newParameters = { ...currentNode.parameters, ...(value as Record<string, any>) };
              const success = this.workflowUtils.updateNodeInWorkflow(workflow, nodeId, { parameters: newParameters });
              if (success) appliedFields.push('parameters');
            } else {
              // Direct field update
              const success = this.workflowUtils.updateNodeInWorkflow(workflow, nodeId, { [field]: value });
              if (success) appliedFields.push(field);
            }
          }
          
          appliedUpdates.push({
            nodeId,
            applied: appliedFields
          });
        }
      });
      
      return this.formatSuccess(
        {
          updatedNodes: appliedUpdates.length,
          updates: appliedUpdates,
          workflowId: updatedWorkflow.id
        },
        `Successfully updated ${appliedUpdates.length} nodes in workflow`
      );
    }, args);
  }
}

/**
 * Get tool definition for the update_multiple_nodes tool
 * 
 * @returns Tool definition
 */
export function getUpdateMultipleNodesToolDefinition(): ToolDefinition {
  return {
    name: 'update_multiple_nodes',
    description: 'Update multiple nodes in a workflow with a single operation',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to modify',
        },
        nodeUpdates: {
          type: 'array',
          description: 'Array of node updates to apply',
          items: {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'ID of the node to update',
              },
              updates: {
                type: 'object',
                description: 'Object containing the fields to update',
                properties: {
                  name: {
                    type: 'string',
                    description: 'New name for the node',
                  },
                  parameters: {
                    type: 'object',
                    description: 'Parameters to merge with existing parameters',
                  },
                  position: {
                    type: 'array',
                    description: 'New position [x, y] for the node',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                  },
                  credentials: {
                    type: 'object',
                    description: 'New credentials for the node',
                  },
                },
              },
            },
            required: ['nodeId', 'updates'],
          },
          minItems: 1,
        },
      },
      required: ['workflowId', 'nodeUpdates'],
      additionalProperties: false,
    },
  };
} 
/**
 * Update Node Parameters Tool
 * 
 * This tool updates the parameters of a specific node in a workflow.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the update_node_parameters tool
 */
export class UpdateNodeParametersHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId, nodeId, and parameters
   * @returns Updated node information
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeId, parameters, mergeParameters = true } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!nodeId) {
        throw new N8nApiError('Missing required parameter: nodeId');
      }
      
      if (!parameters || typeof parameters !== 'object') {
        throw new N8nApiError('Missing or invalid required parameter: parameters');
      }
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Validate node exists
        this.validateNodeExists(workflow, nodeId);
        
        // Get current node
        const currentNode = this.workflowUtils.findNodeById(workflow, nodeId);
        if (!currentNode) {
          throw new N8nApiError(`Node ${nodeId} not found`);
        }
        
        // Merge or replace parameters
        const newParameters = mergeParameters 
          ? { ...currentNode.parameters, ...parameters }
          : parameters;
        
        // Update the node parameters
        const updatedNode = this.workflowUtils.updateNodeInWorkflow(workflow, nodeId, { 
          parameters: newParameters 
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
          parameters: updatedNode?.parameters,
          workflowId: updatedWorkflow.id
        },
        `Node parameters updated successfully for "${nodeId}" (${mergeParameters ? 'merged' : 'replaced'})`
      );
    }, args);
  }
}

/**
 * Get tool definition for the update_node_parameters tool
 * 
 * @returns Tool definition
 */
export function getUpdateNodeParametersToolDefinition(): ToolDefinition {
  return {
    name: 'update_node_parameters',
    description: 'Update the parameters of a specific node in a workflow',
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
        parameters: {
          type: 'object',
          description: 'New parameters for the node',
        },
        mergeParameters: {
          type: 'boolean',
          description: 'Whether to merge with existing parameters (true) or replace them (false)',
          default: true,
        },
      },
      required: ['workflowId', 'nodeId', 'parameters'],
      additionalProperties: false,
    },
  };
} 
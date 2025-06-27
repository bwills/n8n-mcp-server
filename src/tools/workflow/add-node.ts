/**
 * Add Node Tool
 * 
 * This tool adds a new node to a workflow.
 */

import { BaseNodeHandler } from './base-node-handler.js';
import { ToolCallResult, ToolDefinition, WorkflowNode } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Handler for the add_node tool
 */
export class AddNodeHandler extends BaseNodeHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflowId and node configuration
   * @returns Added node information
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, nodeConfig, position } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      if (!nodeConfig || typeof nodeConfig !== 'object') {
        throw new N8nApiError('Missing or invalid required parameter: nodeConfig');
      }
      
      if (!nodeConfig.type) {
        throw new N8nApiError('Missing required field in nodeConfig: type');
      }
      
      let addedNode: WorkflowNode;
      
      // Update the workflow
      const updatedWorkflow = await this.updateWorkflowSafely(workflowId, (workflow) => {
        // Prepare node configuration
        const nodeToAdd = {
          ...nodeConfig,
          position: position || nodeConfig.position || [0, 0],
          parameters: nodeConfig.parameters || {}
        };
        
        // Add the node
        addedNode = this.workflowUtils.addNodeToWorkflow(workflow, nodeToAdd);
      });
      
      return this.formatSuccess(
        {
          nodeId: addedNode!.id,
          name: addedNode!.name,
          type: addedNode!.type,
          position: addedNode!.position,
          parameters: addedNode!.parameters,
          workflowId: updatedWorkflow.id
        },
        `Node added successfully: "${addedNode!.name}" (${addedNode!.id})`
      );
    }, args);
  }
}

/**
 * Get tool definition for the add_node tool
 * 
 * @returns Tool definition
 */
export function getAddNodeToolDefinition(): ToolDefinition {
  return {
    name: 'add_node',
    description: 'Add a new node to a workflow',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to add the node to',
        },
        nodeConfig: {
          type: 'object',
          description: 'Configuration for the new node',
          properties: {
            name: {
              type: 'string',
              description: 'Name for the node (optional, will be auto-generated if not provided)',
            },
            type: {
              type: 'string',
              description: 'Node type (e.g., "n8n-nodes-base.httpRequest")',
            },
            typeVersion: {
              type: 'number',
              description: 'Node type version (optional, defaults to 1)',
            },
            parameters: {
              type: 'object',
              description: 'Node parameters (optional)',
            },
            credentials: {
              type: 'object',
              description: 'Node credentials (optional)',
            },
            position: {
              type: 'array',
              description: 'Node position [x, y] (optional)',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
            },
          },
          required: ['type'],
        },
        position: {
          type: 'array',
          description: 'Node position [x, y] (overrides position in nodeConfig)',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
        },
      },
      required: ['workflowId', 'nodeConfig'],
      additionalProperties: false,
    },
  };
} 
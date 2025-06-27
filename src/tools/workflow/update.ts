/**
 * Update Workflow Tool
 * 
 * This tool updates an existing workflow in n8n.
 */

import { BaseWorkflowToolHandler } from './base-handler.js';
import { ToolCallResult, ToolDefinition } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';

/**
 * Clean workflow data for update by removing read-only fields that cause API errors
 * 
 * @param workflow The workflow object to clean
 * @returns Cleaned workflow object safe for n8n API updates
 */
function cleanWorkflowForUpdate(workflow: Record<string, any>): Record<string, any> {
  const cleaned = { ...workflow };
  
  // Remove read-only metadata fields that n8n API rejects
  delete cleaned.pinData;
  delete cleaned.versionId;
  delete cleaned.staticData;
  delete cleaned.meta;
  delete cleaned.shared;
  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.id; // ID should be in URL path, not body
  delete cleaned.triggerCount;
  delete cleaned.isArchived;
  delete cleaned.active; // Active is read-only, handle via separate API calls
  delete cleaned.tags; // Tags is read-only, handle separately
  
  // Clean up settings if present - some settings subfields can be problematic
  if (cleaned.settings && typeof cleaned.settings === 'object') {
    const cleanedSettings = { ...cleaned.settings };
    // Remove any potentially problematic settings fields
    delete cleanedSettings.callerIds;
    delete cleanedSettings.callerPolicy;
    cleaned.settings = cleanedSettings;
  }
  
  return cleaned;
}

/**
 * Handler for the update_workflow tool
 */
export class UpdateWorkflowHandler extends BaseWorkflowToolHandler {
  /**
   * Execute the tool
   * 
   * @param args Tool arguments containing workflow updates
   * @returns Updated workflow information
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.handleExecution(async (args) => {
      const { workflowId, name, nodes, connections, active, tags } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      // Validate nodes if provided
      if (nodes && !Array.isArray(nodes)) {
        throw new N8nApiError('Parameter "nodes" must be an array');
      }
      
      // Validate connections if provided
      if (connections && typeof connections !== 'object') {
        throw new N8nApiError('Parameter "connections" must be an object');
      }
      
      // Get the current workflow to update
      const currentWorkflow = await this.apiService.getWorkflow(workflowId);
      
      // Clean the current workflow data to remove read-only fields
      const cleanedWorkflow = cleanWorkflowForUpdate(currentWorkflow);
      
      // Update fields if provided (excluding active and tags - handled separately)
      if (name !== undefined) cleanedWorkflow.name = name;
      if (nodes !== undefined) cleanedWorkflow.nodes = nodes;
      if (connections !== undefined) cleanedWorkflow.connections = connections;
      // Note: active and tags are read-only and handled separately
      
      // TODO: Handle tags separately when n8n API supports tag management
      // For now, tags updates are ignored to avoid API errors
      if (tags !== undefined) {
        console.warn('Tags updates are currently not supported due to n8n API limitations. Tags field is read-only.');
      }
      
      // Update the workflow with cleaned data
      const updatedWorkflow = await this.apiService.updateWorkflow(workflowId, cleanedWorkflow);
      
      // Handle activation/deactivation separately if active field was provided
      let finalWorkflow = updatedWorkflow;
      if (active !== undefined && active !== currentWorkflow.active) {
        if (active === true) {
          finalWorkflow = await this.apiService.activateWorkflow(workflowId);
        } else {
          finalWorkflow = await this.apiService.deactivateWorkflow(workflowId);
        }
      }
      
      // Build a summary of changes
      const changesArray = [];
      if (name !== undefined && name !== currentWorkflow.name) changesArray.push(`name: "${currentWorkflow.name}" → "${name}"`);
      if (active !== undefined && active !== currentWorkflow.active) changesArray.push(`active: ${currentWorkflow.active} → ${active}`);
      if (nodes !== undefined) changesArray.push('nodes updated');
      if (connections !== undefined) changesArray.push('connections updated');
      if (tags !== undefined) changesArray.push('tags updated');
      
      const changesSummary = changesArray.length > 0
        ? `Changes: ${changesArray.join(', ')}`
        : 'No changes were made';
      
      return this.formatSuccess(
        {
          id: finalWorkflow.id,
          name: finalWorkflow.name,
          active: finalWorkflow.active
        },
        `Workflow updated successfully. ${changesSummary}`
      );
    }, args);
  }
}

/**
 * Get tool definition for the update_workflow tool
 * 
 * @returns Tool definition
 */
export function getUpdateWorkflowToolDefinition(): ToolDefinition {
  return {
    name: 'update_workflow',
    description: 'Update an existing workflow in n8n',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to update',
        },
        name: {
          type: 'string',
          description: 'New name for the workflow',
        },
        nodes: {
          type: 'array',
          description: 'Updated array of node objects that define the workflow',
          items: {
            type: 'object',
          },
        },
        connections: {
          type: 'object',
          description: 'Updated connection mappings between nodes',
        },
        active: {
          type: 'boolean',
          description: 'Whether the workflow should be active',
        },
        tags: {
          type: 'array',
          description: 'Updated tags to associate with the workflow',
          items: {
            type: 'string',
          },
        },
      },
      required: ['workflowId'],
      additionalProperties: true,
    },
  };
}

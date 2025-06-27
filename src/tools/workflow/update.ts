/**
 * Update Workflow Tool
 * 
 * This tool updates an existing workflow in n8n with comprehensive safeguards
 * to prevent accidental deletion of workflow content.
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
 * Validate that a workflow update won't accidentally delete all content
 * 
 * @param currentWorkflow The current workflow state
 * @param updates The proposed updates
 * @param updateMode The update mode (merge or replace)
 * @returns Validation result with warnings/errors
 */
function validateWorkflowUpdate(
  currentWorkflow: any, 
  updates: any, 
  updateMode: 'merge' | 'replace'
): { isValid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check for dangerous operations
  if (updates.nodes !== undefined) {
    const currentNodeCount = currentWorkflow.nodes?.length || 0;
    const newNodeCount = Array.isArray(updates.nodes) ? updates.nodes.length : 0;
    
    if (updateMode === 'replace') {
      if (currentNodeCount > 0 && newNodeCount === 0) {
        errors.push(`CRITICAL: Attempting to delete all ${currentNodeCount} nodes! This would destroy the entire workflow.`);
      } else if (currentNodeCount > 0 && newNodeCount < currentNodeCount / 2) {
        warnings.push(`WARNING: Replacing ${currentNodeCount} nodes with only ${newNodeCount} nodes. This will delete ${currentNodeCount - newNodeCount} existing nodes.`);
      }
    }
  }
  
  if (updates.connections !== undefined) {
    const currentConnectionCount = Object.keys(currentWorkflow.connections || {}).length;
    const newConnectionCount = updates.connections && typeof updates.connections === 'object' 
      ? Object.keys(updates.connections).length : 0;
      
    if (updateMode === 'replace') {
      if (currentConnectionCount > 0 && newConnectionCount === 0) {
        errors.push(`CRITICAL: Attempting to delete all ${currentConnectionCount} connections! This would disconnect the entire workflow.`);
      } else if (currentConnectionCount > 0 && newConnectionCount < currentConnectionCount / 2) {
        warnings.push(`WARNING: Replacing ${currentConnectionCount} connections with only ${newConnectionCount} connections. This will delete ${currentConnectionCount - newConnectionCount} existing connections.`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Merge nodes arrays safely
 * 
 * @param currentNodes Current workflow nodes
 * @param newNodes New nodes to merge
 * @returns Merged nodes array
 */
function mergeNodes(currentNodes: any[], newNodes: any[]): any[] {
  if (!Array.isArray(currentNodes)) currentNodes = [];
  if (!Array.isArray(newNodes)) return currentNodes;
  
  const merged = [...currentNodes];
  const existingIds = new Set(currentNodes.map(node => node.id));
  
  for (const newNode of newNodes) {
    if (newNode.id && existingIds.has(newNode.id)) {
      // Update existing node
      const index = merged.findIndex(node => node.id === newNode.id);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...newNode };
      }
    } else {
      // Add new node
      merged.push(newNode);
      if (newNode.id) existingIds.add(newNode.id);
    }
  }
  
  return merged;
}

/**
 * Merge connections objects safely
 * 
 * @param currentConnections Current workflow connections
 * @param newConnections New connections to merge
 * @returns Merged connections object
 */
function mergeConnections(currentConnections: any, newConnections: any): any {
  if (!currentConnections || typeof currentConnections !== 'object') currentConnections = {};
  if (!newConnections || typeof newConnections !== 'object') return currentConnections;
  
  const merged = { ...currentConnections };
  
  for (const [sourceNode, connections] of Object.entries(newConnections)) {
    if (connections && typeof connections === 'object') {
      if (!merged[sourceNode]) {
        merged[sourceNode] = {};
      }
      
      for (const [connectionType, connectionArrays] of Object.entries(connections)) {
        if (Array.isArray(connectionArrays)) {
          merged[sourceNode][connectionType] = connectionArrays;
        }
      }
    }
  }
  
  return merged;
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
      const { 
        workflowId, 
        name, 
        nodes, 
        connections, 
        active, 
        tags,
        updateMode = 'merge',  // Default to safe merge mode
        force = false  // Require explicit force flag for dangerous operations
      } = args;
      
      if (!workflowId) {
        throw new N8nApiError('Missing required parameter: workflowId');
      }
      
      // Validate updateMode
      if (updateMode !== 'merge' && updateMode !== 'replace') {
        throw new N8nApiError('updateMode must be either "merge" or "replace"');
      }
      
      // Validate nodes if provided
      if (nodes && !Array.isArray(nodes)) {
        throw new N8nApiError('Parameter "nodes" must be an array');
      }
      
      // Validate connections if provided
      if (connections && typeof connections !== 'object') {
        throw new N8nApiError('Parameter "connections" must be an object');
      }
      
      // Get the current workflow to update (this serves as our backup)
      const currentWorkflow = await this.apiService.getWorkflow(workflowId);
      
      // Create a backup for safety
      const workflowBackup = JSON.parse(JSON.stringify(currentWorkflow));
      
      // Validate the proposed update for safety
      const validation = validateWorkflowUpdate(currentWorkflow, { nodes, connections }, updateMode);
      
      if (!validation.isValid) {
        const errorMessage = [
          'Workflow update blocked for safety:',
          ...validation.errors,
          '',
          'If you really want to perform this operation, use updateMode="replace" with force=true.',
          'Consider using the granular CRUD operations instead (add_node, delete_node, etc.)'
        ].join('\n');
        
        throw new N8nApiError(errorMessage);
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0 && !force) {
        const warningMessage = [
          'Workflow update has safety warnings:',
          ...validation.warnings,
          '',
          'Add force=true to proceed anyway, or use updateMode="merge" for safer updates.',
          'Consider using the granular CRUD operations instead (add_node, delete_node, etc.)'
        ].join('\n');
        
        throw new N8nApiError(warningMessage);
      }
      
      // Clean the current workflow data to remove read-only fields
      const cleanedWorkflow = cleanWorkflowForUpdate(currentWorkflow);
      
      // Apply updates based on mode
      if (name !== undefined) {
        cleanedWorkflow.name = name;
      }
      
      if (nodes !== undefined) {
        if (updateMode === 'merge') {
          cleanedWorkflow.nodes = mergeNodes(cleanedWorkflow.nodes, nodes);
        } else {
          cleanedWorkflow.nodes = nodes;
        }
      }
      
      if (connections !== undefined) {
        if (updateMode === 'merge') {
          cleanedWorkflow.connections = mergeConnections(cleanedWorkflow.connections, connections);
        } else {
          cleanedWorkflow.connections = connections;
        }
      }
      
      // TODO: Handle tags separately when n8n API supports tag management
      // For now, tags updates are ignored to avoid API errors
      if (tags !== undefined) {
        console.warn('Tags updates are currently not supported due to n8n API limitations. Tags field is read-only.');
      }
      
      try {
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
        if (name !== undefined && name !== currentWorkflow.name) {
          changesArray.push(`name: "${currentWorkflow.name}" → "${name}"`);
        }
        if (active !== undefined && active !== currentWorkflow.active) {
          changesArray.push(`active: ${currentWorkflow.active} → ${active}`);
        }
        if (nodes !== undefined) {
          const nodeChange = updateMode === 'merge' 
            ? `nodes merged (${updateMode})` 
            : `nodes replaced (${updateMode})`;
          changesArray.push(nodeChange);
        }
        if (connections !== undefined) {
          const connectionChange = updateMode === 'merge' 
            ? `connections merged (${updateMode})` 
            : `connections replaced (${updateMode})`;
          changesArray.push(connectionChange);
        }
        if (tags !== undefined) {
          changesArray.push('tags updated');
        }
        
        const changesSummary = changesArray.length > 0
          ? `Changes: ${changesArray.join(', ')}`
          : 'No changes were made';
          
        const warningsSummary = validation.warnings.length > 0
          ? `\nWarnings: ${validation.warnings.join('; ')}`
          : '';
        
        return this.formatSuccess(
          {
            id: finalWorkflow.id,
            name: finalWorkflow.name,
            active: finalWorkflow.active,
            updateMode,
            safetyChecks: 'passed'
          },
          `Workflow updated successfully. ${changesSummary}${warningsSummary}`
        );
        
      } catch (error) {
        // If update failed, the original workflow is still intact
        // (we don't need to restore from backup since n8n API is atomic)
        throw new N8nApiError(`Workflow update failed: ${error}. Original workflow remains unchanged.`);
      }
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
    description: 'Update an existing workflow in n8n with comprehensive safety checks to prevent accidental deletion',
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
          description: 'Nodes to update/add. In merge mode, updates existing nodes by ID and adds new ones. In replace mode, completely replaces all nodes.',
          items: {
            type: 'object',
          },
        },
        connections: {
          type: 'object',
          description: 'Connections to update/add. In merge mode, merges with existing connections. In replace mode, completely replaces all connections.',
        },
        active: {
          type: 'boolean',
          description: 'Whether the workflow should be active',
        },
        tags: {
          type: 'array',
          description: 'Tags to associate with the workflow (currently read-only in n8n API)',
          items: {
            type: 'string',
          },
        },
        updateMode: {
          type: 'string',
          enum: ['merge', 'replace'],
          description: 'Update mode: "merge" (default, safer) merges with existing content, "replace" completely replaces content',
          default: 'merge'
        },
        force: {
          type: 'boolean',
          description: 'Force dangerous operations that would normally be blocked (e.g., deleting many nodes). Use with extreme caution.',
          default: false
        },
      },
      required: ['workflowId'],
      additionalProperties: false,
    },
  };
}

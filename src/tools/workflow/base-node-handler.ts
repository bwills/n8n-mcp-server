/**
 * Base Node Handler
 * 
 * This class provides a base handler for workflow node operations with
 * built-in workflow manipulation utilities and error handling.
 */

import { BaseWorkflowToolHandler } from './base-handler.js';
import { Workflow, WorkflowNode, ConnectionSpec, WorkflowValidationResult } from '../../types/index.js';
import { N8nApiError } from '../../errors/index.js';
import * as WorkflowUtils from '../../utils/workflow-utils.js';

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
 * Base handler for workflow node operations
 */
export abstract class BaseNodeHandler extends BaseWorkflowToolHandler {
  /**
   * Safely update a workflow with validation and cleanup
   * 
   * @param workflowId The workflow ID to update
   * @param workflowUpdater Function that modifies the workflow
   * @param validateIntegrity Whether to validate workflow integrity
   * @returns Updated workflow result
   */
  protected async updateWorkflowSafely(
    workflowId: string, 
    workflowUpdater: (workflow: Workflow) => void | Promise<void>,
    validateIntegrity: boolean = true
  ): Promise<Workflow> {
    // Get current workflow
    const currentWorkflow = await this.apiService.getWorkflow(workflowId);
    
    // Create a working copy
    const workflowCopy: Workflow = JSON.parse(JSON.stringify(currentWorkflow));
    
    try {
      // Apply the updates
      await workflowUpdater(workflowCopy);
      
      // Validate workflow integrity if requested
      if (validateIntegrity) {
        const validation = WorkflowUtils.validateWorkflowIntegrity(workflowCopy);
        if (!validation.isValid) {
          throw new N8nApiError(`Workflow integrity validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Clean the workflow for update
      const cleanedWorkflow = cleanWorkflowForUpdate(workflowCopy);
      
      // Update the workflow
      const updatedWorkflow = await this.apiService.updateWorkflow(workflowId, cleanedWorkflow);
      
      return updatedWorkflow;
    } catch (error) {
      // Re-throw with additional context
      if (error instanceof N8nApiError) {
        throw error;
      }
      throw new N8nApiError(`Failed to update workflow: ${error}`);
    }
  }

  /**
   * Validate that a node exists in a workflow
   * 
   * @param workflow The workflow to check
   * @param nodeId The node ID to validate
   * @throws N8nApiError if node doesn't exist
   */
  protected validateNodeExists(workflow: Workflow, nodeId: string): void {
    const validation = WorkflowUtils.validateNodeExists(workflow, nodeId);
    if (!validation.isValid) {
      throw new N8nApiError(validation.errors.join(', '));
    }
  }

  /**
   * Validate that multiple nodes exist in a workflow
   * 
   * @param workflow The workflow to check
   * @param nodeIds Array of node IDs to validate
   * @throws N8nApiError if any node doesn't exist
   */
  protected validateNodesExist(workflow: Workflow, nodeIds: string[]): void {
    const validation = WorkflowUtils.validateNodesExist(workflow, nodeIds);
    if (!validation.isValid) {
      throw new N8nApiError(validation.errors.join(', '));
    }
  }

  /**
   * Get workflow utility functions
   */
  protected get workflowUtils() {
    return WorkflowUtils;
  }
} 
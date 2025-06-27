/**
 * n8n API Client Interface
 * 
 * This module defines interfaces and types for the n8n API client.
 */

import { N8nApiClient } from './client.js';
import { EnvConfig } from '../config/environment.js';
import { Workflow, Execution } from '../types/index.js';

/**
 * n8n API service - provides functions for interacting with n8n API
 */
export class N8nApiService {
  private client: N8nApiClient;

  /**
   * Create a new n8n API service
   * 
   * @param config Environment configuration
   */
  constructor(config: EnvConfig) {
    this.client = new N8nApiClient(config);
  }

  /**
   * Check connectivity to the n8n API
   */
  async checkConnectivity(): Promise<void> {
    return this.client.checkConnectivity();
  }

  /**
   * Get all workflows from n8n
   * 
   * @returns Array of workflow objects
   */
  async getWorkflows(): Promise<Workflow[]> {
    return this.client.getWorkflows();
  }

  /**
   * Get a specific workflow by ID
   * 
   * @param id Workflow ID
   * @returns Workflow object
   */
  async getWorkflow(id: string): Promise<Workflow> {
    return this.client.getWorkflow(id);
  }

  /**
   * Execute a workflow by ID
   */
  async executeWorkflow(workflowId: string, inputData?: any): Promise<any> {
    try {
      const response = await this.client.getAxiosInstance().post(`/workflows/${workflowId}/run`, {
        inputData: inputData || {}
      });
      return response.data;
    } catch (error) {
      const { handleAxiosError } = await import('../errors/index.js');
      throw handleAxiosError(error, `Failed to execute workflow ${workflowId}`);
    }
  }

  /**
   * Create a new workflow
   * 
   * @param workflow Workflow object to create
   * @returns Created workflow
   */
  async createWorkflow(workflow: Record<string, any>): Promise<Workflow> {
    return this.client.createWorkflow(workflow);
  }

  /**
   * Update an existing workflow
   * 
   * @param id Workflow ID
   * @param workflow Updated workflow object
   * @returns Updated workflow
   */
  async updateWorkflow(id: string, workflow: Record<string, any>): Promise<Workflow> {
    return this.client.updateWorkflow(id, workflow);
  }

  /**
   * Delete a workflow
   * 
   * @param id Workflow ID
   * @returns Deleted workflow or success message
   */
  async deleteWorkflow(id: string): Promise<any> {
    return this.client.deleteWorkflow(id);
  }

  /**
   * Activate a workflow
   * 
   * @param id Workflow ID
   * @returns Activated workflow
   */
  async activateWorkflow(id: string): Promise<Workflow> {
    return this.client.activateWorkflow(id);
  }

  /**
   * Deactivate a workflow
   * 
   * @param id Workflow ID
   * @returns Deactivated workflow
   */
  async deactivateWorkflow(id: string): Promise<Workflow> {
    return this.client.deactivateWorkflow(id);
  }

  /**
   * Get all workflow executions
   * 
   * @returns Array of execution objects
   */
  async getExecutions(): Promise<Execution[]> {
    return this.client.getExecutions();
  }

  /**
   * Get execution details by ID
   */
  async getExecution(executionId: string): Promise<any> {
    try {
      const response = await this.client.getAxiosInstance().get(`/executions/${executionId}`);
      return response.data;
    } catch (error) {
      const { handleAxiosError } = await import('../errors/index.js');
      throw handleAxiosError(error, `Failed to get execution ${executionId}`);
    }
  }

  /**
   * List executions with optional filtering
   */
  async listExecutions(options: {
    workflowId?: string;
    status?: string;
    limit?: number;
    includeData?: boolean;
  } = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (options.workflowId) params.append('workflowId', options.workflowId);
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.includeData) params.append('includeData', 'true');

      const response = await this.client.getAxiosInstance().get(`/executions?${params.toString()}`);
      return response.data;
    } catch (error) {
      const { handleAxiosError } = await import('../errors/index.js');
      throw handleAxiosError(error, 'Failed to list executions');
    }
  }

  /**
   * Cancel/stop a running execution
   */
  async cancelExecution(executionId: string): Promise<any> {
    try {
      const response = await this.client.getAxiosInstance().post(`/executions/${executionId}/stop`);
      return response.data;
    } catch (error) {
      const { handleAxiosError } = await import('../errors/index.js');
      throw handleAxiosError(error, `Failed to cancel execution ${executionId}`);
    }
  }

  /**
   * Delete an execution
   * 
   * @param id Execution ID
   * @returns Deleted execution or success message
   */
  async deleteExecution(id: string): Promise<any> {
    return this.client.deleteExecution(id);
  }
}

/**
 * Create a new n8n API service
 * 
 * @param config Environment configuration
 * @returns n8n API service
 */
export function createApiService(config: EnvConfig): N8nApiService {
  return new N8nApiService(config);
}

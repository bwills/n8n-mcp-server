/**
 * Execute Workflow Tool
 * 
 * This tool allows executing n8n workflows with optional input data,
 * timeout handling, and execution status polling.
 */

import { BaseExecutionToolHandler } from './base-handler.js';
import { ToolCallResult } from '../../types/index.js';

export class ExecuteWorkflowHandler extends BaseExecutionToolHandler {
  /**
   * Execute method required by base class
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.executeWorkflow(args as {
      workflowId: string;
      inputData?: any;
      waitForCompletion?: boolean;
      timeout?: number;
    });
  }

  /**
   * Execute a workflow with polling for completion
   */
  async executeWorkflow(args: {
    workflowId: string;
    inputData?: any;
    waitForCompletion?: boolean;
    timeout?: number;
  }): Promise<ToolCallResult> {
    try {
      const { workflowId, inputData, waitForCompletion = true, timeout = 300 } = args;

      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }

      console.error(`[Execute] Starting execution of workflow ${workflowId}`);
      
      // Start workflow execution
      const execution = await this.apiService.executeWorkflow(workflowId, inputData);
      const executionId = execution.id;

      console.error(`[Execute] Started execution ${executionId}`);

      if (!waitForCompletion) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              executionId,
              status: 'started',
              startTime: new Date().toISOString(),
              message: `Workflow execution ${executionId} started successfully`
            }, null, 2)
          }]
        };
      }

      // Poll for completion with timeout
      const result = await this.pollExecutionCompletion(executionId, timeout);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error executing workflow:', error);
      return {
        content: [{
          type: 'text',
          text: `Error executing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Execute workflow asynchronously (fire-and-forget)
   */
  async executeWorkflowAsync(args: {
    workflowId: string;
    inputData?: any;
  }): Promise<ToolCallResult> {
    try {
      const { workflowId, inputData } = args;

      if (!workflowId) {
        throw new Error('Workflow ID is required');
      }

      console.error(`[Execute Async] Starting async execution of workflow ${workflowId}`);
      
      // Start workflow execution
      const execution = await this.apiService.executeWorkflow(workflowId, inputData);
      const executionId = execution.id;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            executionId,
            status: 'started',
            startTime: new Date().toISOString(),
            message: `Async workflow execution ${executionId} started successfully`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error executing workflow async:', error);
      return {
        content: [{
          type: 'text',
          text: `Error executing workflow async: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Poll execution status until completion or timeout
   */
  private async pollExecutionCompletion(executionId: string, timeoutSeconds: number): Promise<any> {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    
    // Polling strategy from spec:
    // - Poll every 2 seconds for first 30 seconds
    // - Poll every 5 seconds for next 60 seconds  
    // - Poll every 10 seconds until timeout
    
    let pollInterval = 2000; // Start with 2 seconds
    let pollCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const execution = await this.apiService.getExecution(executionId);
        pollCount++;
        
        console.error(`[Poll ${pollCount}] Execution ${executionId} status: ${execution.finished ? 'finished' : 'running'}`);

        if (execution.finished !== undefined && execution.finished !== false) {
          // Execution completed
          const duration = execution.stoppedAt ? 
            new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime() : 
            Date.now() - startTime;

          return {
            executionId,
            workflowId: execution.workflowId,
            status: execution.status || (execution.finished ? 'success' : 'error'),
            startTime: execution.startedAt,
            endTime: execution.stoppedAt || new Date().toISOString(),
            duration,
            data: execution.data,
            error: execution.status === 'error' ? execution.data?.resultData?.error?.message : undefined
          };
        }

        // Adjust polling interval based on elapsed time
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        if (elapsedSeconds > 90) {
          pollInterval = 10000; // 10 seconds after 90 seconds
        } else if (elapsedSeconds > 30) {
          pollInterval = 5000;  // 5 seconds after 30 seconds
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.error(`Error polling execution ${executionId}:`, error);
        throw error;
      }
    }

    // Timeout reached
    return {
      executionId,
      status: 'timeout',
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: timeoutMs,
      error: `Execution timed out after ${timeoutSeconds} seconds`
    };
  }
} 
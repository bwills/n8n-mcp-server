/**
 * Execution Status Tools
 * 
 * Tools for monitoring execution status and listing execution history.
 */

import { BaseExecutionToolHandler } from './base-handler.js';
import { ToolCallResult } from '../../types/index.js';

export class ExecutionStatusHandler extends BaseExecutionToolHandler {
  /**
   * Execute method required by base class - delegates to getExecutionStatus
   */
  async execute(args: Record<string, any>): Promise<ToolCallResult> {
    return this.getExecutionStatus(args as { executionId: string });
  }

  /**
   * Get status of a specific execution
   */
  async getExecutionStatus(args: { executionId: string }): Promise<ToolCallResult> {
    try {
      const { executionId } = args;

      if (!executionId) {
        throw new Error('Execution ID is required');
      }

      console.error(`[Status] Checking status of execution ${executionId}`);
      
      const execution = await this.apiService.getExecution(executionId);
      
      // Calculate duration if available
      const duration = execution.stoppedAt && execution.startedAt ? 
        new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime() : 
        undefined;

      // Extract node execution details if available
      const nodeExecutions: Record<string, any> = {};
      if (execution.data?.resultData?.runData) {
        for (const [nodeId, nodeData] of Object.entries(execution.data.resultData.runData)) {
          const nodeExecution = nodeData as any;
          if (nodeExecution && Array.isArray(nodeExecution) && nodeExecution.length > 0) {
            const lastRun = nodeExecution[nodeExecution.length - 1];
            nodeExecutions[nodeId] = {
              status: lastRun.error ? 'error' : 'success',
              executionTime: lastRun.executionTime || 0,
              data: lastRun.data,
              error: lastRun.error?.message
            };
          }
        }
      }

      const result = {
        executionId,
        workflowId: execution.workflowId,
        status: execution.finished ? (execution.status || 'success') : 'running',
        startTime: execution.startedAt,
        endTime: execution.stoppedAt,
        duration,
        data: execution.data,
        error: execution.status === 'error' ? execution.data?.resultData?.error?.message : undefined,
        nodeExecutions: Object.keys(nodeExecutions).length > 0 ? nodeExecutions : undefined
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error getting execution status:', error);
      return {
        content: [{
          type: 'text',
          text: `Error getting execution status: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * List recent executions with optional filtering
   */
  async listRecentExecutions(args: {
    workflowId?: string;
    status?: string;
    limit?: number;
    includeData?: boolean;
  }): Promise<ToolCallResult> {
    try {
      const { workflowId, status, limit = 10, includeData = false } = args;

      console.error(`[List] Fetching recent executions (limit: ${limit})`);
      
      const response = await this.apiService.listExecutions({
        workflowId,
        status,
        limit,
        includeData
      });

      // Process executions to standardize format
      const executions = (response.data || response || []).map((execution: any) => {
        const duration = execution.stoppedAt && execution.startedAt ? 
          new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime() : 
          undefined;

        return {
          executionId: execution.id,
          workflowId: execution.workflowId,
          workflowName: execution.workflowData?.name || 'Unknown Workflow',
          status: execution.finished ? (execution.status || 'success') : 'running',
          startTime: execution.startedAt,
          endTime: execution.stoppedAt,
          duration,
          data: includeData ? execution.data : undefined
        };
      });

      const result = {
        executions,
        total: executions.length
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error listing executions:', error);
      return {
        content: [{
          type: 'text',
          text: `Error listing executions: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  /**
   * Cancel a running execution
   */
  async cancelExecution(args: { executionId: string }): Promise<ToolCallResult> {
    try {
      const { executionId } = args;

      if (!executionId) {
        throw new Error('Execution ID is required');
      }

      console.error(`[Cancel] Cancelling execution ${executionId}`);
      
      const result = await this.apiService.cancelExecution(executionId);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            executionId,
            status: 'canceled',
            message: `Execution ${executionId} has been canceled successfully`
          }, null, 2)
        }]
      };

    } catch (error) {
      console.error('Error cancelling execution:', error);
      return {
        content: [{
          type: 'text',
          text: `Error cancelling execution: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
} 
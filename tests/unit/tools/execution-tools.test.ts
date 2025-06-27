/**
 * Execution Tools Tests
 * 
 * Tests for workflow execution functionality including execution,
 * status monitoring, and polling capabilities.
 */

import { describe, it, expect } from '@jest/globals';
import { getExecutionToolsMap } from '../../../src/tools/execution/handler';

// Mock execution data for testing
const mockExecution = {
  id: 'exec-123',
  workflowId: 'wf-456',
  finished: true,
  status: 'success',
  startedAt: '2024-01-01T00:00:00.000Z',
  stoppedAt: '2024-01-01T00:01:00.000Z',
  data: {
    resultData: {
      runData: {
        'node1': [{
          executionTime: 100,
          data: { main: [{ json: { result: 'success' } }] }
        }],
        'node2': [{
          executionTime: 200,
          error: { message: 'Node error' }
        }]
      }
    }
  }
};

// Utility function to calculate execution duration
function calculateExecutionDuration(startTime: string, endTime?: string): number | undefined {
  if (!endTime) return undefined;
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

// Utility function to extract node execution status
function extractNodeExecutions(executionData: any): Record<string, any> {
  const nodeExecutions: Record<string, any> = {};
  
  if (executionData?.resultData?.runData) {
    for (const [nodeId, nodeData] of Object.entries(executionData.resultData.runData)) {
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
  
  return nodeExecutions;
}

// Utility function to format execution status response
function formatExecutionStatus(execution: any) {
  const duration = calculateExecutionDuration(execution.startedAt, execution.stoppedAt);
  const nodeExecutions = extractNodeExecutions(execution.data);

  return {
    executionId: execution.id,
    workflowId: execution.workflowId,
    status: execution.finished ? (execution.status || 'success') : 'running',
    startTime: execution.startedAt,
    endTime: execution.stoppedAt,
    duration,
    data: execution.data,
    error: execution.status === 'error' ? execution.data?.resultData?.error?.message : undefined,
    nodeExecutions: Object.keys(nodeExecutions).length > 0 ? nodeExecutions : undefined
  };
}

// Utility function to determine polling interval based on elapsed time
function getPollInterval(elapsedSeconds: number): number {
  if (elapsedSeconds > 90) {
    return 10000; // 10 seconds after 90 seconds
  } else if (elapsedSeconds > 30) {
    return 5000;  // 5 seconds after 30 seconds
  }
  return 2000; // 2 seconds for first 30 seconds
}

describe('Execution Tools Map', () => {
  it('should provide correct tool definitions', () => {
    const toolsMap = getExecutionToolsMap();

    expect(toolsMap).toHaveProperty('execute_workflow');
    expect(toolsMap).toHaveProperty('execute_workflow_async');
    expect(toolsMap).toHaveProperty('get_execution_status');
    expect(toolsMap).toHaveProperty('list_recent_executions');
    expect(toolsMap).toHaveProperty('cancel_execution');

    // Check execute_workflow tool definition
    const executeWorkflowTool = toolsMap.execute_workflow;
    expect(executeWorkflowTool.name).toBe('execute_workflow');
    expect(executeWorkflowTool.description).toContain('Execute a workflow');
    expect(executeWorkflowTool.inputSchema.properties).toHaveProperty('workflowId');
    expect(executeWorkflowTool.inputSchema.properties).toHaveProperty('inputData');
    expect(executeWorkflowTool.inputSchema.properties).toHaveProperty('waitForCompletion');
    expect(executeWorkflowTool.inputSchema.properties).toHaveProperty('timeout');
    expect(executeWorkflowTool.inputSchema.required).toContain('workflowId');

    // Check async execution tool
    const asyncTool = toolsMap.execute_workflow_async;
    expect(asyncTool.name).toBe('execute_workflow_async');
    expect(asyncTool.description).toContain('asynchronously');

    // Check status tool
    const statusTool = toolsMap.get_execution_status;
    expect(statusTool.inputSchema.required).toContain('executionId');

    // Check list tool
    const listTool = toolsMap.list_recent_executions;
    expect(listTool.inputSchema.properties).toHaveProperty('workflowId');
    expect(listTool.inputSchema.properties).toHaveProperty('status');
    expect(listTool.inputSchema.properties).toHaveProperty('limit');

    // Check cancel tool
    const cancelTool = toolsMap.cancel_execution;
    expect(cancelTool.inputSchema.required).toContain('executionId');
  });
});

describe('Execution Utility Functions', () => {
  describe('calculateExecutionDuration', () => {
    it('should calculate duration correctly', () => {
      const startTime = '2024-01-01T00:00:00.000Z';
      const endTime = '2024-01-01T00:01:00.000Z';
      
      const duration = calculateExecutionDuration(startTime, endTime);
      expect(duration).toBe(60000); // 1 minute in milliseconds
    });

    it('should return undefined for running executions', () => {
      const startTime = '2024-01-01T00:00:00.000Z';
      
      const duration = calculateExecutionDuration(startTime);
      expect(duration).toBeUndefined();
    });
  });

  describe('extractNodeExecutions', () => {
    it('should extract node execution details correctly', () => {
      const nodeExecutions = extractNodeExecutions(mockExecution.data);
      
      expect(nodeExecutions).toHaveProperty('node1');
      expect(nodeExecutions).toHaveProperty('node2');
      expect(nodeExecutions.node1.status).toBe('success');
      expect(nodeExecutions.node1.executionTime).toBe(100);
      expect(nodeExecutions.node2.status).toBe('error');
      expect(nodeExecutions.node2.error).toBe('Node error');
    });

    it('should handle empty execution data', () => {
      const nodeExecutions = extractNodeExecutions({});
      expect(nodeExecutions).toEqual({});
    });
  });

  describe('formatExecutionStatus', () => {
    it('should format completed execution correctly', () => {
      const formatted = formatExecutionStatus(mockExecution);
      
      expect(formatted.executionId).toBe('exec-123');
      expect(formatted.workflowId).toBe('wf-456');
      expect(formatted.status).toBe('success');
      expect(formatted.duration).toBe(60000);
      expect(formatted.nodeExecutions).toBeDefined();
    });

    it('should format running execution correctly', () => {
      const runningExecution = {
        ...mockExecution,
        finished: false,
        stoppedAt: undefined
      };
      
      const formatted = formatExecutionStatus(runningExecution);
      
      expect(formatted.status).toBe('running');
      expect(formatted.duration).toBeUndefined();
    });
  });

  describe('getPollInterval', () => {
    it('should return correct intervals based on elapsed time', () => {
      expect(getPollInterval(10)).toBe(2000);  // First 30 seconds
      expect(getPollInterval(45)).toBe(5000);  // 30-90 seconds
      expect(getPollInterval(120)).toBe(10000); // After 90 seconds
    });
  });
});

describe('Execution Tool Schemas', () => {
  const toolsMap = getExecutionToolsMap();

  it('should have valid execute_workflow schema', () => {
    const tool = toolsMap.execute_workflow;
    
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties.workflowId.type).toBe('string');
    expect(tool.inputSchema.properties.inputData.type).toBe('object');
    expect(tool.inputSchema.properties.waitForCompletion.type).toBe('boolean');
    expect(tool.inputSchema.properties.timeout.type).toBe('number');
  });

  it('should have valid execute_workflow_async schema', () => {
    const tool = toolsMap.execute_workflow_async;
    
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties.workflowId.type).toBe('string');
    expect(tool.inputSchema.properties.inputData.type).toBe('object');
  });

  it('should have valid get_execution_status schema', () => {
    const tool = toolsMap.get_execution_status;
    
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties.executionId.type).toBe('string');
    expect(tool.inputSchema.required).toEqual(['executionId']);
  });

  it('should have valid list_recent_executions schema', () => {
    const tool = toolsMap.list_recent_executions;
    
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties.workflowId.type).toBe('string');
    expect(tool.inputSchema.properties.status.type).toBe('string');
    expect(tool.inputSchema.properties.limit.type).toBe('number');
    expect(tool.inputSchema.properties.includeData.type).toBe('boolean');
  });

  it('should have valid cancel_execution schema', () => {
    const tool = toolsMap.cancel_execution;
    
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.additionalProperties).toBe(false);
    expect(tool.inputSchema.properties.executionId.type).toBe('string');
    expect(tool.inputSchema.required).toEqual(['executionId']);
  });
}); 
/**
 * Simple workflow tool tests without complex dependencies
 */

import { describe, it, expect } from '@jest/globals';

interface MockWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: any[];
}

interface WorkflowFilter {
  active?: boolean;
}

// Mock workflow data
const mockWorkflows: MockWorkflow[] = [
  {
    id: '1234abc',
    name: 'Test Workflow 1',
    active: true,
    createdAt: '2025-03-01T12:00:00.000Z',
    updatedAt: '2025-03-02T14:30:00.000Z',
    nodes: []
  },
  {
    id: '5678def',
    name: 'Test Workflow 2',
    active: false,
    createdAt: '2025-03-01T12:00:00.000Z',
    updatedAt: '2025-03-12T10:15:00.000Z',
    nodes: []
  }
];

// Simple function to test tool definition
function getListWorkflowsToolDefinition() {
  return {
    name: 'list_workflows',
    description: 'List all workflows with optional filtering by status',
    inputSchema: {
      type: 'object',
      properties: {
        active: {
          type: 'boolean',
          description: 'Filter workflows by active status'
        }
      },
      required: []
    }
  };
}

// Simple function to test workflow filtering
function filterWorkflows(workflows: MockWorkflow[], filter: WorkflowFilter): MockWorkflow[] {
  if (filter && typeof filter.active === 'boolean') {
    return workflows.filter(workflow => workflow.active === filter.active);
  }
  return workflows;
}

// Function to clean workflow data for update (copied from update.ts for testing)
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

describe('Workflow Tools', () => {
  describe('getListWorkflowsToolDefinition', () => {
    it('should return the correct tool definition', () => {
      const definition = getListWorkflowsToolDefinition();
      
      expect(definition.name).toBe('list_workflows');
      expect(definition.description).toBeTruthy();
      expect(definition.inputSchema).toBeDefined();
      expect(definition.inputSchema.properties).toHaveProperty('active');
      expect(definition.inputSchema.required).toEqual([]);
    });
  });
  
  describe('filterWorkflows', () => {
    it('should return all workflows when no filter is provided', () => {
      const result = filterWorkflows(mockWorkflows, {});
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockWorkflows);
    });
    
    it('should filter workflows by active status when active is true', () => {
      const result = filterWorkflows(mockWorkflows, { active: true });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1234abc');
      expect(result[0].active).toBe(true);
    });
    
    it('should filter workflows by active status when active is false', () => {
      const result = filterWorkflows(mockWorkflows, { active: false });
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('5678def');
      expect(result[0].active).toBe(false);
    });
  });

  describe('cleanWorkflowForUpdate', () => {
    it('should remove all read-only metadata fields', () => {
      const dirtyWorkflow = {
        id: '123',
        name: 'Test Workflow',
        nodes: [{ id: 'node1' }],
        connections: {},
        active: true,
        // Read-only fields that should be removed
        pinData: { somePin: 'data' },
        versionId: 42,
        staticData: { someStatic: 'data' },
        meta: { metaInfo: 'data' },
        shared: true,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        triggerCount: 5,
        isArchived: false,
        tags: ['tag1', 'tag2']
      };

      const cleaned = cleanWorkflowForUpdate(dirtyWorkflow);

      // Should preserve essential fields
      expect(cleaned.name).toBe('Test Workflow');
      expect(cleaned.nodes).toEqual([{ id: 'node1' }]);
      expect(cleaned.connections).toEqual({});

      // Should remove read-only fields
      expect(cleaned.id).toBeUndefined();
      expect(cleaned.active).toBeUndefined(); // Active is read-only
      expect(cleaned.pinData).toBeUndefined();
      expect(cleaned.versionId).toBeUndefined();
      expect(cleaned.staticData).toBeUndefined();
      expect(cleaned.meta).toBeUndefined();
      expect(cleaned.shared).toBeUndefined();
      expect(cleaned.createdAt).toBeUndefined();
      expect(cleaned.updatedAt).toBeUndefined();
      expect(cleaned.triggerCount).toBeUndefined();
      expect(cleaned.isArchived).toBeUndefined();
      expect(cleaned.tags).toBeUndefined();
    });

    it('should clean problematic settings fields', () => {
      const workflowWithSettings = {
        name: 'Test',
        settings: {
          saveExecutionProgress: true,
          timezone: 'UTC',
          // Problematic fields
          callerIds: ['caller1'],
          callerPolicy: 'strict'
        }
      };

      const cleaned = cleanWorkflowForUpdate(workflowWithSettings);

      expect(cleaned.settings.saveExecutionProgress).toBe(true);
      expect(cleaned.settings.timezone).toBe('UTC');
      expect(cleaned.settings.callerIds).toBeUndefined();
      expect(cleaned.settings.callerPolicy).toBeUndefined();
    });

    it('should handle workflows without settings', () => {
      const simpleWorkflow = {
        name: 'Simple Workflow',
        nodes: [],
        connections: {},
        active: false
      };

      const cleaned = cleanWorkflowForUpdate(simpleWorkflow);

      expect(cleaned.name).toBe('Simple Workflow');
      expect(cleaned.nodes).toEqual([]);
      expect(cleaned.connections).toEqual({});
      expect(cleaned.active).toBeUndefined(); // Active is read-only and should be removed
    });

    it('should not modify the original workflow object', () => {
      const original = {
        id: '123',
        name: 'Original',
        createdAt: '2025-01-01T00:00:00.000Z'
      };

      const cleaned = cleanWorkflowForUpdate(original);

      // Original should be unchanged
      expect(original.id).toBe('123');
      expect(original.createdAt).toBe('2025-01-01T00:00:00.000Z');
      
      // Cleaned should have fields removed
      expect(cleaned.id).toBeUndefined();
      expect(cleaned.createdAt).toBeUndefined();
      expect(cleaned.name).toBe('Original');
    });
  });
});

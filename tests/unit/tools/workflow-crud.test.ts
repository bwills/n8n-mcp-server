/**
 * Workflow CRUD Operations Tests
 * 
 * Tests for the comprehensive node and connection manipulation tools
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Workflow, WorkflowNode, ConnectionSpec } from '../../../src/types/index.js';
import * as WorkflowUtils from '../../../src/utils/workflow-utils.js';

// Sample workflow for testing
const createSampleWorkflow = (): Workflow => ({
  id: 'workflow-123',
  name: 'Test Workflow',
  active: false,
  nodes: [
    {
      id: 'node1',
      name: 'Start Node',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [100, 200],
      parameters: {}
    },
    {
      id: 'node2',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [300, 200],
      parameters: {
        url: 'https://api.example.com',
        method: 'GET'
      }
    }
  ],
  connections: {
    node1: {
      main: [
        [{
          node: 'node2',
          type: 'main',
          index: 0
        }]
      ]
    }
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z'
});

describe('Workflow Utilities', () => {
  let workflow: Workflow;

  beforeEach(() => {
    workflow = createSampleWorkflow();
  });

  describe('Node ID Generation', () => {
    it('should generate unique node IDs', () => {
      const id1 = WorkflowUtils.generateNodeId(workflow);
      
      // Add the first generated node to the workflow to ensure the next ID is different
      WorkflowUtils.addNodeToWorkflow(workflow, { type: 'test' }, id1);
      
      const id2 = WorkflowUtils.generateNodeId(workflow);
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^node\d+$/);
      expect(id2).toMatch(/^node\d+$/);
    });

    it('should avoid collisions with existing IDs', () => {
      const newId = WorkflowUtils.generateNodeId(workflow);
      expect(newId).not.toBe('node1');
      expect(newId).not.toBe('node2');
    });

    it('should support custom prefix', () => {
      const id = WorkflowUtils.generateNodeId(workflow, 'test');
      expect(id).toMatch(/^test\d+$/);
    });
  });

  describe('Node Finding and Validation', () => {
    it('should find existing nodes', () => {
      const node = WorkflowUtils.findNodeById(workflow, 'node1');
      expect(node).toBeDefined();
      expect(node?.name).toBe('Start Node');
    });

    it('should return undefined for non-existent nodes', () => {
      const node = WorkflowUtils.findNodeById(workflow, 'nonexistent');
      expect(node).toBeUndefined();
    });

    it('should validate node existence correctly', () => {
      const validResult = WorkflowUtils.validateNodeExists(workflow, 'node1');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = WorkflowUtils.validateNodeExists(workflow, 'nonexistent');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain("Node with ID 'nonexistent' not found in workflow");
    });

    it('should validate multiple nodes', () => {
      const allValidResult = WorkflowUtils.validateNodesExist(workflow, ['node1', 'node2']);
      expect(allValidResult.isValid).toBe(true);

      const someInvalidResult = WorkflowUtils.validateNodesExist(workflow, ['node1', 'nonexistent']);
      expect(someInvalidResult.isValid).toBe(false);
      expect(someInvalidResult.nodeErrors).toHaveLength(1);
    });
  });

  describe('Node Operations', () => {
    it('should add nodes to workflow', () => {
      const nodeConfig = {
        name: 'New Node',
        type: 'n8n-nodes-base.set',
        position: [500, 200] as [number, number],
        parameters: { value: 'test' }
      };

      const addedNode = WorkflowUtils.addNodeToWorkflow(workflow, nodeConfig);
      
      expect(addedNode.id).toBeDefined();
      expect(addedNode.name).toBe('New Node');
      expect(addedNode.type).toBe('n8n-nodes-base.set');
      expect(workflow.nodes).toHaveLength(3);
    });

    it('should update existing nodes', () => {
      const updated = WorkflowUtils.updateNodeInWorkflow(workflow, 'node1', {
        name: 'Updated Start Node',
        parameters: { newParam: 'value' }
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Start Node');
      expect(updated?.parameters.newParam).toBe('value');
    });

    it('should remove nodes and clean up connections', () => {
      const removedConnections = WorkflowUtils.removeNodeFromWorkflow(workflow, 'node1');
      
      expect(workflow.nodes).toHaveLength(1);
      expect(workflow.nodes[0].id).toBe('node2');
      expect(removedConnections).toHaveLength(1);
      expect(removedConnections[0].sourceNodeId).toBe('node1');
      expect(removedConnections[0].targetNodeId).toBe('node2');
    });
  });

  describe('Connection Operations', () => {
    it('should add connections between nodes', () => {
      // First add a third node
      const node3 = WorkflowUtils.addNodeToWorkflow(workflow, {
        name: 'End Node',
        type: 'n8n-nodes-base.set',
        position: [500, 200]
      });

      const connectionSpec: ConnectionSpec = {
        sourceNodeId: 'node2',
        targetNodeId: node3.id,
        sourceIndex: 0,
        targetIndex: 0,
        connectionType: 'main'
      };

      const success = WorkflowUtils.addConnectionToWorkflow(workflow, connectionSpec);
      expect(success).toBe(true);
      
      // Verify connection was added
      expect(workflow.connections.node2).toBeDefined();
      expect(workflow.connections.node2.main[0]).toContainEqual({
        node: node3.id,
        type: 'main',
        index: 0
      });
    });

    it('should remove connections', () => {
      const connectionSpec: ConnectionSpec = {
        sourceNodeId: 'node1',
        targetNodeId: 'node2',
        sourceIndex: 0,
        targetIndex: 0,
        connectionType: 'main'
      };

      const success = WorkflowUtils.removeConnectionFromWorkflow(workflow, connectionSpec);
      expect(success).toBe(true);
      
      // Verify connection was removed - the structure may be cleaned up when empty
      const node1Connections = workflow.connections.node1?.main?.[0];
      expect(node1Connections).toBeUndefined();
    });

    it('should handle non-existent connections gracefully', () => {
      const connectionSpec: ConnectionSpec = {
        sourceNodeId: 'node1',
        targetNodeId: 'nonexistent',
        sourceIndex: 0,
        targetIndex: 0,
        connectionType: 'main'
      };

      const success = WorkflowUtils.addConnectionToWorkflow(workflow, connectionSpec);
      expect(success).toBe(false);
    });
  });

  describe('Workflow Integrity Validation', () => {
    it('should validate clean workflows', () => {
      const validation = WorkflowUtils.validateWorkflowIntegrity(workflow);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect duplicate node IDs', () => {
      // Add duplicate node ID
      workflow.nodes.push({
        id: 'node1', // Duplicate!
        name: 'Duplicate Node',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [600, 200],
        parameters: {}
      });

      const validation = WorkflowUtils.validateWorkflowIntegrity(workflow);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Duplicate node ID found: node1');
    });

    it('should detect orphaned connections', () => {
      // Add connection to non-existent node
      workflow.connections.node2 = {
        main: [[{
          node: 'nonexistent',
          type: 'main',
          index: 0
        }]]
      };

      const validation = WorkflowUtils.validateWorkflowIntegrity(workflow);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Connection target node 'nonexistent' does not exist");
    });

    it('should detect connections from non-existent sources', () => {
      workflow.connections.nonexistent = {
        main: [[{
          node: 'node2',
          type: 'main',
          index: 0
        }]]
      };

      const validation = WorkflowUtils.validateWorkflowIntegrity(workflow);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Connection source node 'nonexistent' does not exist");
    });
  });

  describe('Complex Node Operations', () => {
    it('should handle cascading node deletion', () => {
      // Add a third node connected to node2
      const node3 = WorkflowUtils.addNodeToWorkflow(workflow, {
        name: 'End Node',
        type: 'n8n-nodes-base.set',
        position: [500, 200]
      });

      WorkflowUtils.addConnectionToWorkflow(workflow, {
        sourceNodeId: 'node2',
        targetNodeId: node3.id
      });

      // Delete node2 - should remove connections to/from it
      const removedConnections = WorkflowUtils.removeNodeFromWorkflow(workflow, 'node2');
      
      expect(removedConnections).toHaveLength(2); // Incoming from node1 and outgoing to node3
      expect(workflow.nodes).toHaveLength(2); // node1 and node3 remaining
      expect(workflow.connections.node1).toBeUndefined(); // No more outgoing connections from node1
    });

    it('should preserve workflow structure during updates', () => {
      const originalConnections = JSON.stringify(workflow.connections);
      
      WorkflowUtils.updateNodeInWorkflow(workflow, 'node1', {
        name: 'Updated Node',
        parameters: { newParam: 'value' }
      });

      // Connections should remain unchanged
      expect(JSON.stringify(workflow.connections)).toBe(originalConnections);
    });
  });
}); 
/**
 * Workflow Manipulation Utilities
 * 
 * This module provides utility functions for safe workflow manipulation
 * including node and connection operations, validation, and ID generation.
 */

import { Workflow, WorkflowNode, WorkflowConnections, NodeConnection, ConnectionSpec, NodeValidationResult, WorkflowValidationResult } from '../types/index.js';

/**
 * Generate a unique node ID for a workflow
 * 
 * @param workflow The workflow to generate ID for
 * @param prefix Optional prefix for the node ID
 * @returns Unique node ID
 */
export function generateNodeId(workflow: Workflow, prefix: string = 'node'): string {
  const existingIds = new Set(workflow.nodes.map(node => node.id));
  let counter = 1;
  let newId = `${prefix}${counter}`;
  
  while (existingIds.has(newId)) {
    counter++;
    newId = `${prefix}${counter}`;
  }
  
  return newId;
}

/**
 * Find a node by ID in a workflow
 * 
 * @param workflow The workflow to search
 * @param nodeId The node ID to find
 * @returns The node if found, undefined otherwise
 */
export function findNodeById(workflow: Workflow, nodeId: string): WorkflowNode | undefined {
  return workflow.nodes.find(node => node.id === nodeId);
}

/**
 * Validate that a node exists in a workflow
 * 
 * @param workflow The workflow to check
 * @param nodeId The node ID to validate
 * @returns Validation result
 */
export function validateNodeExists(workflow: Workflow, nodeId: string): NodeValidationResult {
  const node = findNodeById(workflow, nodeId);
  if (!node) {
    return {
      isValid: false,
      errors: [`Node with ID '${nodeId}' not found in workflow`],
      nodeId
    };
  }
  
  return {
    isValid: true,
    errors: [],
    nodeId
  };
}

/**
 * Validate multiple nodes exist in a workflow
 * 
 * @param workflow The workflow to check
 * @param nodeIds Array of node IDs to validate
 * @returns Workflow validation result
 */
export function validateNodesExist(workflow: Workflow, nodeIds: string[]): WorkflowValidationResult {
  const nodeErrors: NodeValidationResult[] = [];
  const allErrors: string[] = [];
  
  for (const nodeId of nodeIds) {
    const validation = validateNodeExists(workflow, nodeId);
    if (!validation.isValid) {
      nodeErrors.push(validation);
      allErrors.push(...validation.errors);
    }
  }
  
  return {
    isValid: nodeErrors.length === 0,
    errors: allErrors,
    nodeErrors
  };
}

/**
 * Add a node to a workflow
 * 
 * @param workflow The workflow to modify
 * @param nodeConfig The node configuration
 * @param nodeId Optional specific node ID to use
 * @returns The added node with its assigned ID
 */
export function addNodeToWorkflow(workflow: Workflow, nodeConfig: Partial<WorkflowNode>, nodeId?: string): WorkflowNode {
  const id = nodeId || generateNodeId(workflow);
  
  const newNode: WorkflowNode = {
    id,
    name: nodeConfig.name || id,
    type: nodeConfig.type || 'n8n-nodes-base.set',
    typeVersion: nodeConfig.typeVersion || 1,
    position: nodeConfig.position || [0, 0],
    parameters: nodeConfig.parameters || {},
    ...nodeConfig
  };
  
  workflow.nodes.push(newNode);
  return newNode;
}

/**
 * Remove a node from a workflow and clean up its connections
 * 
 * @param workflow The workflow to modify
 * @param nodeId The node ID to remove
 * @returns Array of removed connections
 */
export function removeNodeFromWorkflow(workflow: Workflow, nodeId: string): ConnectionSpec[] {
  // Find and remove the node
  const nodeIndex = workflow.nodes.findIndex(node => node.id === nodeId);
  if (nodeIndex === -1) {
    return [];
  }
  
  workflow.nodes.splice(nodeIndex, 1);
  
  // Find and remove all connections involving this node
  const removedConnections: ConnectionSpec[] = [];
  
  // Remove outgoing connections (where this node is the source)
  if (workflow.connections[nodeId]) {
    for (const [connectionType, connectionArrays] of Object.entries(workflow.connections[nodeId])) {
      for (const connectionArray of connectionArrays) {
        for (const connection of connectionArray) {
          removedConnections.push({
            sourceNodeId: nodeId,
            targetNodeId: connection.node,
            sourceIndex: connection.index,
            connectionType
          });
        }
      }
    }
    delete workflow.connections[nodeId];
  }
  
  // Remove incoming connections (where this node is the target)
  for (const [sourceNodeId, connections] of Object.entries(workflow.connections)) {
    for (const [connectionType, connectionArrays] of Object.entries(connections)) {
      for (let i = connectionArrays.length - 1; i >= 0; i--) {
        const connectionArray = connectionArrays[i];
        for (let j = connectionArray.length - 1; j >= 0; j--) {
          if (connectionArray[j].node === nodeId) {
            removedConnections.push({
              sourceNodeId,
              targetNodeId: nodeId,
              sourceIndex: i,
              targetIndex: connectionArray[j].index,
              connectionType
            });
            connectionArray.splice(j, 1);
          }
        }
        // Remove empty connection arrays
        if (connectionArray.length === 0) {
          connectionArrays.splice(i, 1);
        }
      }
      // Remove empty connection types
      if (connectionArrays.length === 0) {
        delete connections[connectionType];
      }
    }
    // Remove empty source nodes
    if (Object.keys(connections).length === 0) {
      delete workflow.connections[sourceNodeId];
    }
  }
  
  return removedConnections;
}

/**
 * Update a node in a workflow
 * 
 * @param workflow The workflow to modify
 * @param nodeId The node ID to update
 * @param updates The updates to apply
 * @returns The updated node
 */
export function updateNodeInWorkflow(workflow: Workflow, nodeId: string, updates: Partial<WorkflowNode>): WorkflowNode | null {
  const node = findNodeById(workflow, nodeId);
  if (!node) {
    return null;
  }
  
  // Apply updates
  Object.assign(node, updates);
  
  return node;
}

/**
 * Add a connection between two nodes
 * 
 * @param workflow The workflow to modify
 * @param connection The connection specification
 * @returns True if connection was added successfully
 */
export function addConnectionToWorkflow(workflow: Workflow, connection: ConnectionSpec): boolean {
  const { sourceNodeId, targetNodeId, sourceIndex = 0, targetIndex = 0, connectionType = 'main' } = connection;
  
  // Validate both nodes exist
  const validation = validateNodesExist(workflow, [sourceNodeId, targetNodeId]);
  if (!validation.isValid) {
    return false;
  }
  
  // Initialize connection structure if needed
  if (!workflow.connections[sourceNodeId]) {
    workflow.connections[sourceNodeId] = {};
  }
  
  if (!workflow.connections[sourceNodeId][connectionType]) {
    workflow.connections[sourceNodeId][connectionType] = [];
  }
  
  // Ensure we have enough source index arrays
  while (workflow.connections[sourceNodeId][connectionType].length <= sourceIndex) {
    workflow.connections[sourceNodeId][connectionType].push([]);
  }
  
  // Add the connection
  const connectionArray = workflow.connections[sourceNodeId][connectionType][sourceIndex];
  
  // Check if connection already exists
  const existingConnection = connectionArray.find(conn => 
    conn.node === targetNodeId && conn.index === targetIndex && conn.type === connectionType
  );
  
  if (!existingConnection) {
    connectionArray.push({
      node: targetNodeId,
      type: connectionType,
      index: targetIndex
    });
  }
  
  return true;
}

/**
 * Remove a connection between two nodes
 * 
 * @param workflow The workflow to modify
 * @param connection The connection specification
 * @returns True if connection was removed successfully
 */
export function removeConnectionFromWorkflow(workflow: Workflow, connection: ConnectionSpec): boolean {
  const { sourceNodeId, targetNodeId, sourceIndex = 0, targetIndex = 0, connectionType = 'main' } = connection;
  
  if (!workflow.connections[sourceNodeId]?.[connectionType]?.[sourceIndex]) {
    return false;
  }
  
  const connectionArray = workflow.connections[sourceNodeId][connectionType][sourceIndex];
  const connectionIndex = connectionArray.findIndex(conn => 
    conn.node === targetNodeId && conn.index === targetIndex && conn.type === connectionType
  );
  
  if (connectionIndex === -1) {
    return false;
  }
  
  connectionArray.splice(connectionIndex, 1);
  
  // Clean up empty structures
  if (connectionArray.length === 0) {
    workflow.connections[sourceNodeId][connectionType].splice(sourceIndex, 1);
    
    if (workflow.connections[sourceNodeId][connectionType].length === 0) {
      delete workflow.connections[sourceNodeId][connectionType];
      
      if (Object.keys(workflow.connections[sourceNodeId]).length === 0) {
        delete workflow.connections[sourceNodeId];
      }
    }
  }
  
  return true;
}

/**
 * Validate workflow integrity
 * 
 * @param workflow The workflow to validate
 * @returns Validation result
 */
export function validateWorkflowIntegrity(workflow: Workflow): WorkflowValidationResult {
  const errors: string[] = [];
  const nodeErrors: NodeValidationResult[] = [];
  
  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  const nodeNames = new Set<string>();
  
  for (const node of workflow.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID found: ${node.id}`);
    }
    nodeIds.add(node.id);
    
    // Also track node names since connections use names as keys
    if (nodeNames.has(node.name)) {
      errors.push(`Duplicate node name found: ${node.name}`);
    }
    nodeNames.add(node.name);
  }
  
  // Validate all connections reference existing nodes
  // IMPORTANT: n8n connections use node NAMES as keys, not node IDs
  for (const [sourceNodeName, connections] of Object.entries(workflow.connections)) {
    if (!nodeNames.has(sourceNodeName)) {
      errors.push(`Connection source node '${sourceNodeName}' does not exist`);
      continue;
    }
    
    for (const [connectionType, connectionArrays] of Object.entries(connections)) {
      for (const connectionArray of connectionArrays) {
        for (const connection of connectionArray) {
          if (!nodeNames.has(connection.node)) {
            errors.push(`Connection target node '${connection.node}' does not exist`);
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    nodeErrors
  };
} 
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
 * Find a node by its name
 * 
 * @param workflow The workflow to search
 * @param nodeName The node name to find
 * @returns The node if found, undefined otherwise
 */
export function findNodeByName(workflow: Workflow, nodeName: string): WorkflowNode | undefined {
  return workflow.nodes.find(node => node.name === nodeName);
}

/**
 * Find a node by its ID
 * 
 * @param workflow The workflow to search
 * @param nodeId The node ID to find
 * @returns The node if found, undefined otherwise
 */
export function findNodeById(workflow: Workflow, nodeId: string): WorkflowNode | undefined {
  return workflow.nodes.find(node => node.id === nodeId);
}

/**
 * Get node name from node ID
 * 
 * @param workflow The workflow to search
 * @param nodeId The node ID
 * @returns The node name if found, undefined otherwise
 */
export function getNodeNameById(workflow: Workflow, nodeId: string): string | undefined {
  const node = findNodeById(workflow, nodeId);
  return node?.name;
}

/**
 * Get node ID from node name
 * 
 * @param workflow The workflow to search
 * @param nodeName The node name
 * @returns The node ID if found, undefined otherwise
 */
export function getNodeIdByName(workflow: Workflow, nodeName: string): string | undefined {
  const node = findNodeByName(workflow, nodeName);
  return node?.id;
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
  
  // Get the node name before removal (needed for connection cleanup)
  const nodeToRemove = findNodeById(workflow, nodeId);
  const nodeNameToRemove = nodeToRemove?.name;
  
  // Remove outgoing connections (where this node is the source)
  // IMPORTANT: n8n connections use node NAMES as keys, not node IDs
  if (nodeNameToRemove && workflow.connections[nodeNameToRemove]) {
    for (const [connectionType, connectionArrays] of Object.entries(workflow.connections[nodeNameToRemove])) {
      for (const connectionArray of connectionArrays) {
        for (const connection of connectionArray) {
          removedConnections.push({
            sourceNodeId: nodeId,
            targetNodeId: getNodeIdByName(workflow, connection.node) || connection.node,
            sourceIndex: connection.index,
            connectionType
          });
        }
      }
    }
    delete workflow.connections[nodeNameToRemove];
  }
  
  // Remove incoming connections (where this node is the target)
  // Note: connections use node NAMES as keys
  
  for (const [sourceNodeName, connections] of Object.entries(workflow.connections)) {
    for (const [connectionType, connectionArrays] of Object.entries(connections)) {
      for (let i = connectionArrays.length - 1; i >= 0; i--) {
        const connectionArray = connectionArrays[i];
        for (let j = connectionArray.length - 1; j >= 0; j--) {
          // Check if connection targets the node being removed (by name)
          if (connectionArray[j].node === nodeNameToRemove) {
            removedConnections.push({
              sourceNodeId: getNodeIdByName(workflow, sourceNodeName) || sourceNodeName,
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
      delete workflow.connections[sourceNodeName];
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
 * @param connection The connection specification (expects node IDs, converts to names for n8n)
 * @returns True if connection was added successfully
 */
export function addConnectionToWorkflow(workflow: Workflow, connection: ConnectionSpec): boolean {
  const { sourceNodeId, targetNodeId, sourceIndex = 0, targetIndex = 0, connectionType = 'main' } = connection;
  
  // Validate both nodes exist by ID
  const validation = validateNodesExist(workflow, [sourceNodeId, targetNodeId]);
  if (!validation.isValid) {
    return false;
  }
  
  // Convert node IDs to names (n8n uses names in connections)
  const sourceNodeName = getNodeNameById(workflow, sourceNodeId);
  const targetNodeName = getNodeNameById(workflow, targetNodeId);
  
  if (!sourceNodeName || !targetNodeName) {
    return false;
  }
  
  // Initialize connection structure if needed (using node names)
  if (!workflow.connections[sourceNodeName]) {
    workflow.connections[sourceNodeName] = {};
  }
  
  if (!workflow.connections[sourceNodeName][connectionType]) {
    workflow.connections[sourceNodeName][connectionType] = [];
  }
  
  // Ensure we have enough source index arrays
  while (workflow.connections[sourceNodeName][connectionType].length <= sourceIndex) {
    workflow.connections[sourceNodeName][connectionType].push([]);
  }
  
  // Add the connection
  const connectionArray = workflow.connections[sourceNodeName][connectionType][sourceIndex];
  
  // Check if connection already exists (using target node name)
  const existingConnection = connectionArray.find(conn => 
    conn.node === targetNodeName && conn.index === targetIndex && conn.type === connectionType
  );
  
  if (!existingConnection) {
    connectionArray.push({
      node: targetNodeName,
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
 * @param connection The connection specification (expects node IDs, converts to names for n8n)
 * @returns True if connection was removed successfully
 */
export function removeConnectionFromWorkflow(workflow: Workflow, connection: ConnectionSpec): boolean {
  const { sourceNodeId, targetNodeId, sourceIndex = 0, targetIndex = 0, connectionType = 'main' } = connection;
  
  // Convert node IDs to names (n8n uses names in connections)
  const sourceNodeName = getNodeNameById(workflow, sourceNodeId);
  const targetNodeName = getNodeNameById(workflow, targetNodeId);
  
  if (!sourceNodeName || !targetNodeName) {
    return false;
  }
  
  if (!workflow.connections[sourceNodeName]?.[connectionType]?.[sourceIndex]) {
    return false;
  }
  
  const connectionArray = workflow.connections[sourceNodeName][connectionType][sourceIndex];
  const connectionIndex = connectionArray.findIndex(conn => 
    conn.node === targetNodeName && conn.index === targetIndex && conn.type === connectionType
  );
  
  if (connectionIndex === -1) {
    return false;
  }
  
  connectionArray.splice(connectionIndex, 1);
  
  // Clean up empty structures
  if (connectionArray.length === 0) {
    workflow.connections[sourceNodeName][connectionType].splice(sourceIndex, 1);
    
    if (workflow.connections[sourceNodeName][connectionType].length === 0) {
      delete workflow.connections[sourceNodeName][connectionType];
      
      if (Object.keys(workflow.connections[sourceNodeName]).length === 0) {
        delete workflow.connections[sourceNodeName];
      }
    }
  }
  
  return true;
}

/**
 * Clean up corrupted connections that use node IDs as keys instead of names
 * This fixes workflows that were corrupted by the previous bug in removeNodeFromWorkflow
 * 
 * @param workflow The workflow to clean up
 * @returns Number of corrupted connections fixed
 */
export function cleanupCorruptedConnections(workflow: Workflow): number {
  let fixedCount = 0;
  const connectionsToFix: Array<{ oldKey: string, newKey: string, connections: { [connectionType: string]: NodeConnection[][] } }> = [];
  
  // Find connection keys that are node IDs instead of names
  for (const [connectionKey, connections] of Object.entries(workflow.connections)) {
    // Check if this key is a node ID (exists in nodes array by ID but not by name)
    const nodeById = findNodeById(workflow, connectionKey);
    const nodeByName = findNodeByName(workflow, connectionKey);
    
    if (nodeById && !nodeByName) {
      // This is a node ID being used as a connection key - needs fixing
      connectionsToFix.push({
        oldKey: connectionKey,
        newKey: nodeById.name,
        connections
      });
    }
  }
  
  // Apply the fixes
  for (const fix of connectionsToFix) {
    // Remove the corrupted entry
    delete workflow.connections[fix.oldKey];
    
    // Add it back with the correct node name as key
    if (!workflow.connections[fix.newKey]) {
      workflow.connections[fix.newKey] = fix.connections;
      fixedCount++;
    } else {
      // Merge if there's already a connection with the correct name
      for (const [connectionType, connectionArrays] of Object.entries(fix.connections)) {
        if (Array.isArray(connectionArrays)) {
          if (!workflow.connections[fix.newKey][connectionType]) {
            workflow.connections[fix.newKey][connectionType] = connectionArrays;
          } else {
            // Merge connection arrays
            for (let i = 0; i < connectionArrays.length; i++) {
              if (!workflow.connections[fix.newKey][connectionType][i]) {
                workflow.connections[fix.newKey][connectionType][i] = connectionArrays[i];
              } else {
                // Merge individual connections
                workflow.connections[fix.newKey][connectionType][i].push(...connectionArrays[i]);
              }
            }
          }
        }
      }
      fixedCount++;
    }
  }
  
  return fixedCount;
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
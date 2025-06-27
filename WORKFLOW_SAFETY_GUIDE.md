# Workflow Safety Guide

## 🛡️ Protection Against Accidental Workflow Deletion

The n8n MCP server now includes comprehensive safety measures to prevent accidental deletion of workflow content during updates.

## ⚠️ The Problem

Previously, the `update_workflow` tool would **completely replace** nodes and connections when provided, leading to accidental deletion of entire workflows. For example:

```javascript
// DANGEROUS - This would delete all existing nodes!
await updateWorkflow({
  workflowId: "abc123",
  nodes: [newNode]  // Only this node would remain, all others deleted!
});
```

## ✅ The Solution

### **1. Safe Merge Mode (Default)**

By default, `update_workflow` now uses **merge mode** which safely combines new content with existing content:

```javascript
// SAFE - This adds/updates nodes without deleting existing ones
await updateWorkflow({
  workflowId: "abc123",
  nodes: [newNode],  // Adds newNode, keeps all existing nodes
  updateMode: "merge"  // Default mode
});
```

### **2. Safety Validation**

The system now validates updates and blocks dangerous operations:

- ❌ **Blocks**: Attempts to delete all nodes or connections
- ⚠️ **Warns**: Operations that would delete more than 50% of content
- ✅ **Allows**: Safe updates and explicit force operations

### **3. Multiple Update Modes**

| Mode | Behavior | Safety | Use Case |
|------|----------|--------|----------|
| `merge` | Combines with existing content | ✅ Safe | Adding/updating specific nodes |
| `replace` | Completely replaces content | ⚠️ Dangerous | Full workflow reconstruction |

### **4. Force Override**

For legitimate destructive operations, use the `force` flag:

```javascript
// Explicitly force a dangerous operation
await updateWorkflow({
  workflowId: "abc123",
  nodes: [],  // Delete all nodes
  updateMode: "replace",
  force: true  // Required for dangerous operations
});
```

## 🛠️ Recommended Workflow Patterns

### **✅ Safe: Use Granular CRUD Operations**

Instead of updating entire workflows, use specific operations:

```javascript
// Add a single node
await addNode({
  workflowId: "abc123",
  nodeConfig: { type: "n8n-nodes-base.http", name: "API Call" }
});

// Update a specific node
await updateNodeParameters({
  workflowId: "abc123", 
  nodeId: "node123",
  parameters: { url: "https://api.example.com" }
});

// Add a connection
await addConnection({
  workflowId: "abc123",
  sourceNodeId: "node1",
  targetNodeId: "node2"
});
```

### **✅ Safe: Use Merge Mode for Bulk Updates**

```javascript
// Safely add multiple nodes
await updateWorkflow({
  workflowId: "abc123",
  nodes: [newNode1, newNode2],
  updateMode: "merge"  // Won't delete existing nodes
});
```

### **⚠️ Careful: Replace Mode with Validation**

```javascript
// System will warn if this deletes many nodes
await updateWorkflow({
  workflowId: "abc123", 
  nodes: [node1, node2],
  updateMode: "replace",  // Replaces ALL nodes
  force: true  // Required if deleting >50% of content
});
```

## 🚨 Error Messages

### **Critical Error (Blocked)**
```
Workflow update blocked for safety:
CRITICAL: Attempting to delete all 5 nodes! This would destroy the entire workflow.

If you really want to perform this operation, use updateMode="replace" with force=true.
Consider using the granular CRUD operations instead (add_node, delete_node, etc.)
```

### **Warning (Requires Force)**
```
Workflow update has safety warnings:
WARNING: Replacing 6 nodes with only 2 nodes. This will delete 4 existing nodes.

Add force=true to proceed anyway, or use updateMode="merge" for safer updates.
Consider using the granular CRUD operations instead (add_node, delete_node, etc.)
```

## 📋 Best Practices

1. **Default to Merge Mode**: Use `updateMode: "merge"` for most operations
2. **Use Granular Operations**: Prefer `add_node`, `delete_node`, etc. for specific changes
3. **Validate Before Replace**: Always review what will be deleted in replace mode
4. **Use Force Sparingly**: Only use `force: true` when you're certain about destructive operations
5. **Test with Small Changes**: Start with small updates before making large changes

## 🔧 Migration Guide

If you have existing code using `update_workflow`, here's how to migrate:

### **Before (Dangerous)**
```javascript
// This could accidentally delete nodes!
await updateWorkflow({
  workflowId: "abc123",
  nodes: someNodes
});
```

### **After (Safe)**
```javascript
// Option 1: Use merge mode (recommended)
await updateWorkflow({
  workflowId: "abc123", 
  nodes: someNodes,
  updateMode: "merge"
});

// Option 2: Use granular operations
for (const node of someNodes) {
  await addNode({
    workflowId: "abc123",
    nodeConfig: node
  });
}

// Option 3: Explicit replace (if you really mean it)
await updateWorkflow({
  workflowId: "abc123",
  nodes: someNodes,
  updateMode: "replace",
  force: true
});
```

## 🆘 Emergency Recovery

If a workflow gets accidentally damaged:

1. **Check n8n History**: n8n keeps workflow version history
2. **Use n8n UI**: Restore from the n8n web interface
3. **Recreate from Backup**: Use the workflow backup that was created before the update

The system creates automatic backups before each update operation for safety. 
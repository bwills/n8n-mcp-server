# Claude Sr. User Guide - Enhanced n8n MCP Server

## 🎯 **Quick Start for Claude Sr.**

The n8n MCP server has been completely enhanced with safety features and your original validation issues have been fixed. You can now safely add AI analysis components to existing workflows!

## ✅ **Your Original Problem - SOLVED**

**Before (Broken):**
```
Workflow integrity validation failed: Connection source node 'webhook-trigger' does not exist, 
Connection source node 'read-jira-file' does not exist, Connection source node 'format-data' does not exist
```

**After (Fixed):**
- ✅ **Root Cause Found**: The `removeNodeFromWorkflow` function was incorrectly using node IDs as connection keys instead of node names
- ✅ **Automatic Cleanup**: Corrupted workflows are automatically fixed when accessed
- ✅ **Connection validation** now properly handles node names vs IDs
- ✅ **No more false "node does not exist" errors**
- ✅ **All existing workflow nodes are properly recognized**

**Technical Details:**
The bug was in `src/utils/workflow-utils.ts` where connections were being created with node IDs as keys (`workflow.connections[nodeId]`) when n8n requires node names as keys (`workflow.connections[nodeName]`). This created corrupted connection data that caused validation failures.

## 🛠️ **Available Tools (19 Total)**

### **Core Workflow Operations (7 tools)**
- `list_workflows` - List all workflows
- `get_workflow` - Get workflow details  
- `create_workflow` - Create new workflow
- `update_workflow` - **ENHANCED** with safety features
- `delete_workflow` - Delete workflow
- `activate_workflow` - Activate workflow
- `deactivate_workflow` - Deactivate workflow

### **Node Operations (5 tools) - NEW!**
- `add_node` - Add single node to workflow
- `delete_node` - Remove node and cleanup connections
- `update_node_name` - Change node name
- `update_node_parameters` - Update node configuration
- `move_node` - Change node position

### **Connection Operations (2 tools) - NEW!**
- `add_connection` - Connect two nodes
- `remove_connection` - Disconnect nodes

### **Bulk Operations (1 tool) - NEW!**
- `update_multiple_nodes` - Update several nodes at once

### **Execution Operations (4 tools)**
- `execute_workflow` - Run workflow
- `get_execution_status` - Check execution status
- `list_recent_executions` - List recent runs
- `cancel_execution` - Stop running execution

## 🎯 **Recommended Approach for Your Use Case**

### **Goal: Add Ollama AI Analysis to PM Helper Workflow**

**✅ RECOMMENDED: Use Granular Operations**

```javascript
// 1. Add Ollama node
const ollamaNode = await add_node({
  workflowId: "wct1FWVr9UF4wIBS",
  nodeConfig: {
    type: "n8n-nodes-base.ollama",
    name: "AI Analysis Agent",
    parameters: {
      model: "llama2",
      prompt: "Analyze this PM data: {{$json.data}}",
      options: {
        temperature: 0.7
      }
    },
    position: [600, 300]
  }
});

// 2. Add analysis processing node  
const processNode = await add_node({
  workflowId: "wct1FWVr9UF4wIBS", 
  nodeConfig: {
    type: "n8n-nodes-base.function",
    name: "Process AI Response",
    parameters: {
      functionCode: `
        const aiResponse = $input.first().json;
        return [{
          json: {
            originalData: $input.first().json,
            aiAnalysis: aiResponse.response,
            timestamp: new Date().toISOString(),
            confidence: aiResponse.confidence || 0.8
          }
        }];
      `
    },
    position: [800, 300]
  }
});

// 3. Connect the nodes
await add_connection({
  workflowId: "wct1FWVr9UF4wIBS",
  sourceNodeId: "format-data", // Existing node
  targetNodeId: ollamaNode.nodeId
});

await add_connection({
  workflowId: "wct1FWVr9UF4wIBS", 
  sourceNodeId: ollamaNode.nodeId,
  targetNodeId: processNode.nodeId
});
```

## 🛡️ **New Safety Features**

### **1. Safe Update Mode (Default)**

The `update_workflow` tool now defaults to **merge mode** which is safe:

```javascript
// SAFE - Adds nodes without deleting existing ones
await update_workflow({
  workflowId: "wct1FWVr9UF4wIBS",
  nodes: [newOllamaNode, newProcessNode],
  updateMode: "merge"  // Default - keeps existing nodes
});
```

### **2. Dangerous Operation Protection**

```javascript
// This would be BLOCKED with safety error:
await update_workflow({
  workflowId: "wct1FWVr9UF4wIBS", 
  nodes: [],  // Would delete all nodes!
  updateMode: "replace"
});

// Error: "CRITICAL: Attempting to delete all 5 nodes! This would destroy the entire workflow."
```

### **3. Force Override for Legitimate Operations**

```javascript
// If you REALLY want to replace everything:
await update_workflow({
  workflowId: "wct1FWVr9UF4wIBS",
  nodes: [completeNewWorkflow],
  updateMode: "replace",
  force: true  // Required for dangerous operations
});
```

## 📋 **Best Practices for Claude Sr.**

### **✅ DO: Use Granular Operations**
```javascript
// Add specific components
await add_node({...});
await add_connection({...});
await update_node_parameters({...});
```

### **✅ DO: Use Safe Merge Mode**
```javascript
await update_workflow({
  workflowId: "abc123",
  updateMode: "merge"  // Safe default
});
```

### **⚠️ CAREFUL: Replace Mode**
```javascript
await update_workflow({
  workflowId: "abc123", 
  updateMode: "replace",  // Dangerous!
  force: true  // Required
});
```

### **❌ DON'T: Ignore Safety Warnings**
If you get safety warnings, use granular operations instead.

## 🔧 **Common Workflows for PM Helper Enhancement**

### **Scenario 1: Add AI Analysis After Data Processing**

```javascript
// Get current workflow to understand structure
const workflow = await get_workflow({
  workflowId: "wct1FWVr9UF4wIBS"
});

// Add Ollama analysis node
const aiNode = await add_node({
  workflowId: "wct1FWVr9UF4wIBS",
  nodeConfig: {
    type: "n8n-nodes-base.ollama",
    name: "PM Data Analyzer", 
    parameters: {
      model: "llama2",
      prompt: `Analyze this project management data and provide insights:
      
      Data: {{$json}}
      
      Please provide:
      1. Key insights
      2. Risk assessment  
      3. Recommendations
      4. Priority actions`,
      options: {
        temperature: 0.3,  // More focused responses
        max_tokens: 500
      }
    }
  }
});

// Connect after the format-data node
await add_connection({
  workflowId: "wct1FWVr9UF4wIBS",
  sourceNodeId: "format-data",  // Existing node ID
  targetNodeId: aiNode.nodeId
});
```

### **Scenario 2: Add Summary Generation**

```javascript
// Add summary node
const summaryNode = await add_node({
  workflowId: "wct1FWVr9UF4wIBS",
  nodeConfig: {
    type: "n8n-nodes-base.function",
    name: "Generate Summary",
    parameters: {
      functionCode: `
        const data = $input.first().json;
        
        return [{
          json: {
            summary: {
              totalItems: Array.isArray(data) ? data.length : 1,
              aiAnalysis: data.aiAnalysis || "No AI analysis available",
              timestamp: new Date().toISOString(),
              workflowId: "{{$workflow.id}}",
              executionId: "{{$execution.id}}"
            },
            originalData: data
          }
        }];
      `
    }
  }
});

// Chain after AI analysis
await add_connection({
  workflowId: "wct1FWVr9UF4wIBS",
  sourceNodeId: aiNode.nodeId,
  targetNodeId: summaryNode.nodeId  
});
```

## 🚨 **Error Handling**

### **If You Get Validation Errors:**

1. **Check node IDs exist:**
   ```javascript
   const workflow = await get_workflow({workflowId: "wct1FWVr9UF4wIBS"});
   console.log(workflow.nodes.map(n => ({id: n.id, name: n.name})));
   ```

2. **Use correct node references:**
   - Node IDs for tool parameters
   - Node names are used internally by n8n

3. **Verify connections:**
   ```javascript
   console.log(workflow.connections);
   ```

### **If Updates Fail:**

1. **Use granular operations instead of bulk updates**
2. **Check the safety warnings and use merge mode**
3. **Verify the workflow isn't corrupted:**
   ```javascript
   const workflow = await get_workflow({workflowId: "wct1FWVr9UF4wIBS"});
   ```

## 🎉 **Success Indicators**

You'll know everything is working when:

✅ **No validation errors** about missing nodes  
✅ **AI nodes added successfully** to existing workflows  
✅ **Connections created** between existing and new nodes  
✅ **Workflow executes** with AI analysis included  
✅ **No accidental deletion** of existing workflow components  

## 🆘 **Emergency Recovery**

If something goes wrong:

1. **Check n8n UI** - workflows have version history
2. **Use n8n's built-in restore** from the web interface  
3. **Recreate from backup** - the system creates automatic backups before updates

## 📞 **Quick Reference**

**Your specific workflow ID:** `wct1FWVr9UF4wIBS`

**Key existing nodes to connect to:**
- `webhook-trigger` - Entry point
- `read-jira-file` - Data source  
- `format-data` - Processed data (good connection point for AI)

**Recommended AI integration point:** After `format-data` node

Now you can safely enhance the PM Helper workflow with AI analysis without any of the previous validation issues or accidental deletions! 
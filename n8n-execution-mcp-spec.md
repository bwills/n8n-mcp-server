# n8n-control MCP Server: Workflow Execution Enhancement Specification

**Version:** 1.0  
**Date:** June 21, 2025  
**Purpose:** Add workflow execution capabilities to enable Claude Sr to directly execute n8n workflows  
**Requester:** Bryan Wills / Claude Sr  
**Implementer:** Claude Jr  

---

## 🎯 **Objective**

Enhance the existing n8n-control MCP server to support workflow execution, allowing Claude Sr to:
- Execute workflows directly via MCP calls
- Monitor execution status and retrieve results
- Pass custom input data to workflows
- Handle execution errors gracefully

This eliminates the need for manual workflow execution and enables true automation testing.

---

## 📋 **Required New MCP Functions**

### **1. `n8n-control:execute_workflow`**
Execute a workflow by ID with optional input data.

**Parameters:**
```typescript
{
  workflowId: string;           // Required: n8n workflow ID
  inputData?: object;           // Optional: Custom input data for Manual Trigger
  waitForCompletion?: boolean;  // Optional: Wait for completion (default: true)
  timeout?: number;             // Optional: Timeout in seconds (default: 300)
}
```

**Returns:**
```typescript
{
  executionId: string;
  status: "running" | "success" | "error" | "timeout";
  startTime: string;           // ISO timestamp
  endTime?: string;            // ISO timestamp (if completed)
  data?: object;               // Execution results (if completed)
  error?: string;              // Error message (if failed)
}
```

**Example Usage:**
```typescript
// Simple execution
n8n-control:execute_workflow({
  workflowId: "OAvJ8qKEG1nYsFn8"
})

// With custom input data
n8n-control:execute_workflow({
  workflowId: "OAvJ8qKEG1nYsFn8",
  inputData: { testMode: true, priority: "high" },
  timeout: 120
})
```

### **2. `n8n-control:execute_workflow_async`**
Execute a workflow asynchronously (fire-and-forget).

**Parameters:**
```typescript
{
  workflowId: string;
  inputData?: object;
}
```

**Returns:**
```typescript
{
  executionId: string;
  status: "started";
  startTime: string;
  message: string;
}
```

### **3. `n8n-control:get_execution_status`**
Check the status of a running or completed execution.

**Parameters:**
```typescript
{
  executionId: string;
}
```

**Returns:**
```typescript
{
  executionId: string;
  workflowId: string;
  status: "running" | "success" | "error" | "canceled";
  startTime: string;
  endTime?: string;
  duration?: number;           // Execution time in milliseconds
  data?: object;               // Final execution data
  error?: string;              // Error details if failed
  nodeExecutions?: {           // Per-node execution details
    [nodeId: string]: {
      status: "success" | "error";
      executionTime: number;
      data?: object;
      error?: string;
    }
  }
}
```

### **4. `n8n-control:list_recent_executions`**
Get recent executions with optional filtering.

**Parameters:**
```typescript
{
  workflowId?: string;         // Optional: Filter by workflow
  status?: string;             // Optional: Filter by status
  limit?: number;              // Optional: Max results (default: 10)
  includeData?: boolean;       // Optional: Include execution data (default: false)
}
```

**Returns:**
```typescript
{
  executions: Array<{
    executionId: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    data?: object;             // Only if includeData: true
  }>;
  total: number;
}
```

### **5. `n8n-control:cancel_execution`**
Cancel a running execution.

**Parameters:**
```typescript
{
  executionId: string;
}
```

**Returns:**
```typescript
{
  executionId: string;
  status: "canceled";
  message: string;
}
```

---

## 🔧 **Technical Implementation Details**

### **n8n REST API Endpoints to Use:**
```bash
# Execute workflow
POST /api/v1/workflows/{id}/run
Content-Type: application/json
{
  "inputData": {...}  // Optional
}

# Get execution details
GET /api/v1/executions/{id}

# List executions
GET /api/v1/executions?workflowId={id}&status={status}&limit={limit}

# Cancel execution  
POST /api/v1/executions/{id}/stop
```

### **Authentication:**
Use existing n8n API authentication from current MCP server implementation.

### **Error Handling:**
```typescript
// Common error scenarios to handle:
- Workflow not found (404)
- Execution timeout
- Workflow execution errors
- Network connectivity issues
- Authentication failures
- Invalid input data format
```

### **Async Execution Management:**
For `waitForCompletion: true`, implement polling:
```typescript
// Polling strategy:
- Poll every 2 seconds for first 30 seconds
- Poll every 5 seconds for next 60 seconds  
- Poll every 10 seconds until timeout
- Return timeout status if exceeded
```

---

## 📊 **Usage Patterns & Examples**

### **Pattern 1: Test Workflow Execution**
```typescript
// Claude Sr testing the Digital Board
const result = await n8n-control:execute_workflow({
  workflowId: "OAvJ8qKEG1nYsFn8",
  timeout: 60
});

if (result.status === "success") {
  console.log("✅ Digital Board test completed successfully!");
  console.log("Results:", result.data);
} else {
  console.log("❌ Test failed:", result.error);
}
```

### **Pattern 2: Monitoring Active Workflows**
```typescript
// Check status of production workflows
const executions = await n8n-control:list_recent_executions({
  status: "error",
  limit: 5
});

executions.forEach(exec => {
  console.log(`❌ ${exec.workflowName} failed: ${exec.error}`);
});
```

### **Pattern 3: Custom Data Injection**
```typescript
// Execute workflow with test data
const result = await n8n-control:execute_workflow({
  workflowId: "YdIl2H6HxmB5E1zg", // Sample Data Generator
  inputData: {
    dataType: "slack_messages",
    count: 50,
    timeRange: "24h"
  }
});
```

---

## 🚨 **Security Considerations**

### **Rate Limiting:**
- Limit to 10 executions per minute per workflow
- Prevent parallel executions of the same workflow (configurable)
- Maximum 5 concurrent executions total

### **Resource Protection:**
- Set maximum execution timeout (600 seconds default)
- Monitor memory/CPU usage during execution
- Auto-cancel runaway executions

### **Access Control:**
- Only execute workflows owned by authenticated user
- Validate input data schemas before execution
- Log all execution attempts for audit

---

## 🧪 **Testing Requirements**

### **Unit Tests:**
- Test successful workflow execution
- Test execution with custom input data
- Test timeout handling
- Test error scenarios (404, auth failures, etc.)
- Test async execution patterns

### **Integration Tests:**
- Execute actual Bryan's workflows
- Test with various workflow types (manual trigger, webhook, scheduled)
- Test execution monitoring and status retrieval
- Test cancellation functionality

### **Performance Tests:**
- Measure execution overhead
- Test concurrent execution limits
- Test with large input data payloads
- Test long-running workflow handling

---

## 📋 **Implementation Checklist**

### **Phase 1: Core Execution**
- [ ] Add `execute_workflow` function with basic execution
- [ ] Implement execution status polling  
- [ ] Add timeout handling
- [ ] Basic error handling and logging

### **Phase 2: Enhanced Features**
- [ ] Add `execute_workflow_async` for fire-and-forget
- [ ] Implement `get_execution_status` 
- [ ] Add custom input data support
- [ ] Enhanced error reporting with node-level details

### **Phase 3: Management Features**
- [ ] Add `list_recent_executions` 
- [ ] Implement `cancel_execution`
- [ ] Add rate limiting and security controls
- [ ] Performance monitoring and optimization

### **Phase 4: Polish & Testing**
- [ ] Comprehensive error handling
- [ ] Full test suite implementation
- [ ] Documentation and examples
- [ ] Performance tuning

---

## 🎯 **Success Criteria**

### **Functional Requirements:**
- ✅ Claude Sr can execute any workflow by ID
- ✅ Execution results are returned within reasonable timeouts
- ✅ Custom input data can be passed to workflows
- ✅ Error scenarios are handled gracefully
- ✅ Execution status can be monitored in real-time

### **Performance Requirements:**
- ⏱️ Execution initiation: <2 seconds
- ⏱️ Status polling frequency: 2-10 seconds
- ⏱️ Default timeout: 5 minutes
- ⏱️ Maximum concurrent executions: 5

### **Reliability Requirements:**
- 🛡️ 99% success rate for valid workflow executions
- 🛡️ Graceful degradation when n8n is unavailable
- 🛡️ Proper cleanup of failed/canceled executions
- 🛡️ No memory leaks from long-running polls

---

## 🚀 **Benefits & Impact**

### **For Claude Sr:**
- Direct workflow testing without manual intervention
- Real-time execution monitoring and debugging
- Automated workflow validation and QA
- Self-healing system capabilities

### **For Bryan:**
- **Maximum Laziness Achieved:** Zero-click workflow testing
- Faster development iteration cycles
- Automated system health monitoring
- Proactive issue detection and resolution

### **For System Reliability:**
- Continuous automated testing of critical workflows
- Early detection of workflow failures
- Performance monitoring and optimization
- Comprehensive execution audit trails

---

## 📞 **Implementation Notes for Claude Jr**

### **Existing Code Integration:**
- Build on current n8n-control MCP server architecture
- Reuse existing authentication and connection management
- Follow established error handling patterns
- Maintain consistency with current function naming

### **Configuration Options:**
```typescript
// Add to MCP server config
{
  n8n: {
    executionTimeout: 300,     // Default timeout in seconds
    maxConcurrentExecutions: 5,
    enableAsyncExecution: true,
    pollingInterval: 2000,     // Milliseconds
    maxPollingDuration: 600000 // 10 minutes max
  }
}
```

### **Logging & Monitoring:**
- Log all execution attempts with timestamps
- Track execution performance metrics
- Monitor for patterns indicating system issues
- Alert on execution failure spikes

---

*This specification enables Claude Sr to achieve ultimate automation capabilities and Bryan to reach new astral planes of laziness while maintaining system reliability and security.* 🛸✨
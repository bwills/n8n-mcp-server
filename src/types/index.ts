/**
 * Core Types Module
 * 
 * This module provides type definitions used throughout the application
 * and bridges compatibility with the MCP SDK.
 */

// Tool definition for MCP tools
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

// Tool call result for MCP tool responses
export interface ToolCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

// Type for n8n workflow object
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

// Type for n8n execution object
export interface Execution {
  id: string;
  workflowId: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt: string;
  status: string;
  data: {
    resultData: {
      runData: any;
    };
  };
  [key: string]: any;
}

// Enhanced types for workflow manipulation
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  webhookId?: string;
  [key: string]: any;
}

export interface NodeConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowConnections {
  [nodeId: string]: {
    [connectionType: string]: NodeConnection[][];
  };
}

export interface NodeUpdate {
  nodeId: string;
  updates: {
    name?: string;
    parameters?: Record<string, any>;
    position?: [number, number];
    credentials?: Record<string, any>;
    [key: string]: any;
  };
}

export interface ConnectionSpec {
  sourceNodeId: string;
  targetNodeId: string;
  sourceIndex?: number;
  targetIndex?: number;
  connectionType?: string;
}

export interface NodeValidationResult {
  isValid: boolean;
  errors: string[];
  nodeId?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  nodeErrors: NodeValidationResult[];
}

// Claude-to-Claude Communication Types
export interface ClaudeMessage {
  id: string;
  timestamp: string;
  sender: 'claude_sr' | 'claude_jr';
  message: string;
  context?: 'technical' | 'planning' | 'debugging' | 'general';
  responseToId?: string;
}

export interface ClaudeConversationResponse {
  success: boolean;
  message?: string;
  conversationId?: string;
  error?: string;
}

export interface ClaudeMessageHistory {
  messages: ClaudeMessage[];
  totalCount: number;
  lastUpdated: string;
}

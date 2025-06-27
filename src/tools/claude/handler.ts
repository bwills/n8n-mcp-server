/**
 * Claude Communication Tool Handler
 * 
 * MCP tool handlers for Claude-to-Claude communication system
 */

import { ToolDefinition, ToolCallResult } from '../../types/index.js';
import ClaudeCommunication from './communication.js';

export class ClaudeCommunicationHandler {
  private claudeComm: ClaudeCommunication;

  constructor() {
    this.claudeComm = new ClaudeCommunication();
  }

  /**
   * Validate and ensure proper MCP response format
   */
  private validateMCPResponse(response: any): ToolCallResult {
    // Ensure response has required structure
    if (!response || typeof response !== 'object') {
      return {
        content: [{
          type: 'text',
          text: 'Internal error: Invalid response format'
        }],
        isError: true
      };
    }

    // Ensure content array exists and is valid
    if (!Array.isArray(response.content)) {
      return {
        content: [{
          type: 'text',
          text: 'Internal error: Invalid content format'
        }],
        isError: true
      };
    }

    // Ensure each content item has proper structure
    for (const item of response.content) {
      if (!item || typeof item !== 'object' || !item.type || !item.text) {
        return {
          content: [{
            type: 'text',
            text: 'Internal error: Invalid content item format'
          }],
          isError: true
        };
      }
    }

    // Ensure isError is boolean
    return {
      content: response.content,
      isError: Boolean(response.isError)
    };
  }

  /**
   * Get all Claude communication tool definitions
   */
  getToolDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'send_message_to_claude',
        description: 'Send a message to Claude Jr. and receive a response. Enables direct Claude-to-Claude communication.',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'The message to send to Claude Jr.'
            },
            context: {
              type: 'string',
              enum: ['technical', 'planning', 'debugging', 'general'],
              description: 'Conversation context to help generate appropriate responses',
              default: 'general'
            }
          },
          required: ['message'],
          additionalProperties: false
        }
      },
      {
        name: 'get_claude_conversation',
        description: 'Get conversation history between Claude Sr. and Claude Jr.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of recent messages to return',
              minimum: 1,
              maximum: 100
            }
          },
          additionalProperties: false
        }
      },
      {
        name: 'clear_claude_conversation',
        description: 'Clear the conversation history between Claude Sr. and Claude Jr.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'get_claude_conversation_stats',
        description: 'Get statistics about the Claude-to-Claude conversation.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      }
    ];
  }

  /**
   * Handle Claude communication tool calls with comprehensive error handling
   */
  async handleToolCall(name: string, args: any): Promise<ToolCallResult> {
    try {
      console.error(`[Claude Handler] Processing tool: ${name} with args:`, JSON.stringify(args));
      
      let result: ToolCallResult;
      
      switch (name) {
        case 'send_message_to_claude':
          result = await this.sendMessageToClaude(args);
          break;
        case 'get_claude_conversation':
          result = await this.getClaudeConversation(args);
          break;
        case 'clear_claude_conversation':
          result = await this.clearClaudeConversation(args);
          break;
        case 'get_claude_conversation_stats':
          result = await this.getClaudeConversationStats(args);
          break;
        default:
          throw new Error(`Unknown Claude communication tool: ${name}`);
      }

      // Validate response format before returning
      const validatedResult = this.validateMCPResponse(result);
      console.error(`[Claude Handler] Returning validated result:`, JSON.stringify(validatedResult));
      
      return validatedResult;
      
    } catch (error) {
      console.error(`[Claude Handler] Error in tool '${name}':`, error);
      
      const errorResponse: ToolCallResult = {
        content: [{
          type: 'text',
          text: `Error in Claude communication tool '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
      
      return this.validateMCPResponse(errorResponse);
    }
  }

  /**
   * Send message to Claude Jr.
   */
  private async sendMessageToClaude(args: { message: string; context?: string }): Promise<ToolCallResult> {
    try {
      const { message, context = 'general' } = args;

      if (!message || typeof message !== 'string') {
        throw new Error('Message is required and must be a string');
      }

      const validContexts = ['technical', 'planning', 'debugging', 'general'];
      if (context && !validContexts.includes(context)) {
        throw new Error(`Invalid context. Must be one of: ${validContexts.join(', ')}`);
      }

      console.error(`[Claude Handler] Sending message to Claude Jr.: "${message.substring(0, 100)}..."`);
      
      const response = await this.claudeComm.sendMessageToClaude(
        message, 
        context as 'technical' | 'planning' | 'debugging' | 'general'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message to Claude Jr.');
      }

      // Ensure response.message is a string and not undefined/null
      const responseText = response.message || 'No response received';
      const conversationId = response.conversationId || 'unknown';
      
      // Create properly structured MCP response with explicit JSON validation
      const mcpResponse: ToolCallResult = {
        content: [{
          type: 'text',
          text: `Claude Jr. responded:\n\n${responseText}\n\n[Message ID: ${conversationId}]`
        }],
        isError: false
      };
      
             // Validate that the response can be serialized to JSON without issues
       try {
         const jsonTest = JSON.stringify(mcpResponse);
         const parsedTest = JSON.parse(jsonTest);
         console.error(`[Claude Handler] JSON validation passed for response`);
       } catch (jsonError) {
         console.error(`[Claude Handler] JSON validation failed:`, jsonError);
         throw new Error(`Response contains invalid JSON data: ${jsonError}`);
       }
       
       console.error(`[Claude Handler] Generated valid response structure with ${responseText.length} chars`);
      return mcpResponse;
      
    } catch (error) {
      console.error(`[Claude Handler] Error in sendMessageToClaude:`, error);
      throw error; // Re-throw to be handled by main error handler
    }
  }

  /**
   * Get conversation history
   */
  private async getClaudeConversation(args: { limit?: number }): Promise<ToolCallResult> {
    try {
      const { limit } = args;

      if (limit !== undefined && (typeof limit !== 'number' || limit < 1 || limit > 100)) {
        throw new Error('Limit must be a number between 1 and 100');
      }

      const history = this.claudeComm.getConversationHistory(limit);

      if (history.messages.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No conversation history found. Start a conversation with send_message_to_claude!'
          }],
          isError: false
        };
      }

      // Format conversation history for display
      const formattedMessages = history.messages.map(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const sender = msg.sender === 'claude_sr' ? 'Claude Sr.' : 'Claude Jr.';
        const context = msg.context ? ` [${msg.context}]` : '';
        return `${timestamp} - ${sender}${context}:\n${msg.message}\n`;
      }).join('\n---\n\n');

      return {
        content: [{
          type: 'text',
          text: `Conversation History (${history.messages.length}/${history.totalCount} messages):\n\n${formattedMessages}\n\nLast updated: ${new Date(history.lastUpdated).toLocaleString()}`
        }],
        isError: false
      };
      
    } catch (error) {
      console.error(`[Claude Handler] Error in getClaudeConversation:`, error);
      throw error;
    }
  }

  /**
   * Clear conversation history
   */
  private async clearClaudeConversation(args: {}): Promise<ToolCallResult> {
    try {
      const success = this.claudeComm.clearConversation();

      if (!success) {
        throw new Error('Failed to clear conversation history');
      }

      return {
        content: [{
          type: 'text',
          text: 'Conversation history cleared successfully!'
        }],
        isError: false
      };
      
    } catch (error) {
      console.error(`[Claude Handler] Error in clearClaudeConversation:`, error);
      throw error;
    }
  }

  /**
   * Get conversation statistics
   */
  private async getClaudeConversationStats(args: {}): Promise<ToolCallResult> {
    try {
      const stats = this.claudeComm.getStats();

      const statsText = `Claude-to-Claude Conversation Statistics:

Total Messages: ${stats.totalMessages}
Messages by Claude Sr.: ${stats.messagesByClaude.claude_sr}
Messages by Claude Jr.: ${stats.messagesByClaude.claude_jr}
Average Message Length: ${stats.avgMessageLength} characters

${stats.totalMessages > 0 ? 'The conversation is active and ready for collaboration!' : 'No messages yet. Send the first message with send_message_to_claude!'}`;

      return {
        content: [{
          type: 'text',
          text: statsText
        }],
        isError: false
      };
      
    } catch (error) {
      console.error(`[Claude Handler] Error in getClaudeConversationStats:`, error);
      throw error;
    }
  }
}

export default ClaudeCommunicationHandler; 
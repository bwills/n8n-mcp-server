/**
 * Claude Communication System Tests
 * 
 * Tests for the Claude-to-Claude communication functionality
 */

import ClaudeCommunication from '../../../src/tools/claude/communication.js';
import ClaudeCommunicationHandler from '../../../src/tools/claude/handler.js';

describe('Claude Communication System', () => {
  let claudeComm: ClaudeCommunication;
  let claudeHandler: ClaudeCommunicationHandler;

  beforeEach(() => {
    claudeComm = new ClaudeCommunication();
    claudeHandler = new ClaudeCommunicationHandler();
  });

  describe('ClaudeCommunication Core', () => {
    test('should send message and generate response', async () => {
      const message = "Hello Claude Jr.! Can you hear me?";
      const response = await claudeComm.sendMessageToClaude(message, 'technical');

      expect(response.success).toBe(true);
      expect(response.message).toContain('Claude Sr.');
      expect(response.message).toContain('Claude Jr.');
      expect(response.conversationId).toBeDefined();
    });

    test('should handle different conversation contexts', async () => {
      const contexts: Array<'technical' | 'planning' | 'debugging' | 'general'> = ['technical', 'planning', 'debugging', 'general'];
      
      for (const context of contexts) {
        const response = await claudeComm.sendMessageToClaude(`Test message for ${context}`, context);
        expect(response.success).toBe(true);
        expect(response.message).toBeTruthy();
      }
    });

    test('should generate appropriate technical responses', async () => {
      const technicalMessages = [
        "Let's discuss the n8n workflow CRUD operations",
        "How should we implement the MCP server architecture?",
        "Can you help me with the TypeScript types?"
      ];

      for (const message of technicalMessages) {
        const response = await claudeComm.sendMessageToClaude(message, 'technical');
        expect(response.success).toBe(true);
        expect(response.message).toBeTruthy();
      }
    });

    test('should maintain conversation history', async () => {
      await claudeComm.sendMessageToClaude("First message", 'general');
      await claudeComm.sendMessageToClaude("Second message", 'technical');
      
      const history = claudeComm.getConversationHistory();
      
      expect(history.totalCount).toBe(4); // 2 messages + 2 responses
      expect(history.messages).toHaveLength(4);
      
      // Check message structure
      expect(history.messages[0].sender).toBe('claude_sr');
      expect(history.messages[1].sender).toBe('claude_jr');
      expect(history.messages[2].sender).toBe('claude_sr');
      expect(history.messages[3].sender).toBe('claude_jr');
    });

    test('should limit conversation history when requested', async () => {
      await claudeComm.sendMessageToClaude("Message 1", 'general');
      await claudeComm.sendMessageToClaude("Message 2", 'general');
      await claudeComm.sendMessageToClaude("Message 3", 'general');
      
      const limitedHistory = claudeComm.getConversationHistory(2);
      
      expect(limitedHistory.messages).toHaveLength(2);
      expect(limitedHistory.totalCount).toBe(6); // 3 messages + 3 responses
    });

    test('should clear conversation history', () => {
      claudeComm.sendMessageToClaude("Test message", 'general');
      
      const success = claudeComm.clearConversation();
      expect(success).toBe(true);
      
      const history = claudeComm.getConversationHistory();
      expect(history.totalCount).toBe(0);
      expect(history.messages).toHaveLength(0);
    });

    test('should provide conversation statistics', async () => {
      await claudeComm.sendMessageToClaude("Hello", 'general');
      await claudeComm.sendMessageToClaude("How are you?", 'technical');
      
      const stats = claudeComm.getStats();
      
      expect(stats.totalMessages).toBe(4); // 2 messages + 2 responses
      expect(stats.messagesByClaude.claude_sr).toBe(2);
      expect(stats.messagesByClaude.claude_jr).toBe(2);
      expect(stats.avgMessageLength).toBeGreaterThan(0);
    });
  });

  describe('ClaudeCommunicationHandler', () => {
    test('should provide correct tool definitions', () => {
      const tools = claudeHandler.getToolDefinitions();
      
      expect(tools).toHaveLength(4);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('send_message_to_claude');
      expect(toolNames).toContain('get_claude_conversation');
      expect(toolNames).toContain('clear_claude_conversation');
      expect(toolNames).toContain('get_claude_conversation_stats');
    });

    test('should handle send_message_to_claude tool call', async () => {
      const result = await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Hello Claude Jr.!',
        context: 'technical'
      });

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Claude Jr. responded:');
    });

    test('should handle get_claude_conversation tool call', async () => {
      // First send a message to create history
      await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Test message for history'
      });

      const result = await claudeHandler.handleToolCall('get_claude_conversation', {
        limit: 10
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Conversation History');
    });

    test('should handle clear_claude_conversation tool call', async () => {
      const result = await claudeHandler.handleToolCall('clear_claude_conversation', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('cleared successfully');
    });

    test('should handle get_claude_conversation_stats tool call', async () => {
      const result = await claudeHandler.handleToolCall('get_claude_conversation_stats', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Conversation Statistics');
    });

    test('should validate message parameter', async () => {
      const result = await claudeHandler.handleToolCall('send_message_to_claude', {
        message: ''
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message is required');
    });

    test('should validate context parameter', async () => {
      const result = await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Test message',
        context: 'invalid_context'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid context');
    });

    test('should validate limit parameter for conversation history', async () => {
      const result = await claudeHandler.handleToolCall('get_claude_conversation', {
        limit: 150 // Above maximum of 100
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Limit must be a number between 1 and 100');
    });

    test('should handle unknown tool names', async () => {
      const result = await claudeHandler.handleToolCall('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown Claude communication tool');
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle multiple conversation threads', async () => {
      // Simulate a technical discussion
      await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Let\'s discuss the n8n workflow CRUD operations',
        context: 'technical'
      });

      // Switch to planning context
      await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'What should we work on next?',
        context: 'planning'
      });

      // Get conversation history
      const historyResult = await claudeHandler.handleToolCall('get_claude_conversation', {});
      expect(historyResult.content[0].text).toContain('[technical]');
      expect(historyResult.content[0].text).toContain('[planning]');
    });

    test('should demonstrate Claude Sr. greeting flow', async () => {
      const greetingResult = await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Hello Claude Jr.! This is Claude Sr. Can you hear me?',
        context: 'technical'
      });

      expect(greetingResult.isError).toBeFalsy();
      expect(greetingResult.content[0].text).toContain('Hello Claude Sr.!');
      expect(greetingResult.content[0].text).toContain('I can hear you perfectly');
    });

    test('should provide contextual n8n workflow responses', async () => {
      const workflowResult = await claudeHandler.handleToolCall('send_message_to_claude', {
        message: 'Can you help me understand the n8n workflow CRUD operations?',
        context: 'technical'
      });

      expect(workflowResult.isError).toBeFalsy();
      expect(workflowResult.content[0].text).toContain('CRUD operations');
      expect(workflowResult.content[0].text).toContain('workflow');
    });
  });
}); 
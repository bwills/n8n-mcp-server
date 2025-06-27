/**
 * Claude Communication Tools Index
 * 
 * Exports all Claude-to-Claude communication functionality
 */

export { default as ClaudeCommunication } from './communication.js';
export { default as ClaudeCommunicationHandler } from './handler.js';

// Re-export types for convenience
export type { ClaudeMessage, ClaudeMessageHistory, ClaudeConversationResponse } from '../../types/index.js'; 
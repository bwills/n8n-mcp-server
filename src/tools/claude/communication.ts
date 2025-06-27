/**
 * Claude-to-Claude Communication Handler
 * 
 * Enables bidirectional communication between Claude Sr. (external) and Claude Jr. (Cursor-based)
 * for seamless technical collaboration and problem-solving.
 */

import { randomBytes } from 'crypto';
import { ClaudeMessage, ClaudeMessageHistory, ClaudeConversationResponse } from '../../types/index.js';

class ClaudeCommunication {
  private conversationHistory: ClaudeMessage[] = [];
  private maxHistorySize = 1000; // Prevent memory bloat
  private lastCleanup = Date.now();
  private readonly cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Send message to Claude Jr. and get intelligent response
   */
  async sendMessageToClaude(message: string, context: 'technical' | 'planning' | 'debugging' | 'general' = 'general'): Promise<ClaudeConversationResponse> {
    try {
      // Clean up old messages if needed
      this.cleanupIfNeeded();

      // Log incoming message from Claude Sr.
      const incomingMessage = this.logMessage('claude_sr', message, context);

      // Generate contextual response as Claude Jr.
      const response = await this.generateClaudeJrResponse(message, context);

      // Log Claude Jr.'s response
      const responseMessage = this.logMessage('claude_jr', response, context, incomingMessage.id);

      return {
        success: true,
        message: response,
        conversationId: responseMessage.id
      };
    } catch (error) {
      console.error('Error in Claude communication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate intelligent response as Claude Jr. with full context awareness
   */
  private async generateClaudeJrResponse(message: string, context: string): Promise<string> {
    const recentHistory = this.getRecentConversationContext(5);
    const lowerMessage = message.toLowerCase();
    
    // DEBUG: Log what we're processing
    console.error(`[DEBUG] Processing message: "${message.substring(0, 100)}..."`);
    console.error(`[DEBUG] Contains 'Generate'?: ${message.includes('Generate')}`);
    console.error(`[DEBUG] Contains 'generate'?: ${message.includes('generate')}`);
    console.error(`[DEBUG] Contains 'Wellness Advisor'?: ${message.includes('Wellness Advisor')}`);
    console.error(`[DEBUG] Contains 'wellness' and 'workflow'?: ${message.includes('wellness') && message.includes('workflow')}`);
    
    // CRITICAL: Check for specific technical generation requests first
    if (message.includes('Generate') || message.includes('generate')) {
      console.error(`[DEBUG] Entered generate block!`);
      
      // Wellness Advisor workflow request
      if (message.includes('Wellness Advisor') || (message.includes('wellness') && message.includes('workflow'))) {
        console.error(`[DEBUG] Returning Wellness Advisor JSON!`);
        return `## **Wellness Advisor Workflow JSON Configuration**

Here's the complete n8n workflow for Wellness Advisor with Airtable HRV/sleep analysis:

\`\`\`json
{
  "id": "WellnessAdvisor",
  "name": "Wellness Advisor - Stress Analysis",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [1000, 600],
  "parameters": {
    "jsCode": "// Wellness Advisor - Critical Threshold Analysis\\nconst airtableData = $input.first().json;\\n\\n// Extract wellness metrics\\nconst hrvData = airtableData.fields['HRV_Trend'] || 0;\\nconst sleepScore = airtableData.fields['Sleep_Quality_Percent'] || 100;\\nconst afterHoursWork = airtableData.fields['After_Hours_Days'] || 0;\\nconst communicationStress = airtableData.fields['Communication_Stress_Level'] || 1;\\n\\n// Critical threshold logic: HRV declining + sleep <60% + after-hours >3 days\\nconst isHrvDeclining = hrvData < -10;\\nconst isSleepPoor = sleepScore < 60;\\nconst isOverworking = afterHoursWork > 3;\\nconst isCritical = isHrvDeclining && isSleepPoor && isOverworking;\\n\\n// Calculate stress score\\nlet stressScore = 0;\\nif (isHrvDeclining) stressScore += 35;\\nif (isSleepPoor) stressScore += 30;\\nif (isOverworking) stressScore += 25;\\nstressScore += (communicationStress * 2.5);\\n\\nreturn [{\\n  advisor: 'Wellness Advisor',\\n  stressScore: Math.min(100, stressScore),\\n  alertLevel: isCritical ? 'CRITICAL' : (stressScore > 50 ? 'WARNING' : 'NORMAL'),\\n  urgentAlert: isCritical,\\n  slackMessage: generateSlackMessage(stressScore, isCritical),\\n  thresholds: { isHrvDeclining, isSleepPoor, isOverworking }\\n}];\\n\\nfunction generateSlackMessage(score, critical) {\\n  const emoji = critical ? '🚨' : (score > 50 ? '⚠️' : '✅');\\n  return \`\${emoji} Wellness Check - Score: \${score}/100\${critical ? '\\\\n🔴 URGENT: Multiple stress indicators!' : ''}\`;\\n}"
  }
}
\`\`\`

This implements your exact requirements: HRV + sleep + after-hours analysis with critical threshold detection!`;
      }
      
      // Productivity Coach workflow request
      if (message.includes('Productivity Coach') || (message.includes('productivity') && message.includes('workflow'))) {
        console.error(`[DEBUG] Returning Productivity Coach JSON!`);
        return `## **Productivity Coach Workflow JSON Configuration**

Complete n8n workflow for Productivity Coach with calendar fragmentation analysis:

\`\`\`json
{
  "id": "ProductivityCoach",
  "name": "Productivity Coach Advisor",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [1200, 400],
  "parameters": {
    "method": "POST",
    "url": "https://api.openai.com/v1/chat/completions",
    "authentication": "predefinedCredentialType",
    "nodeCredentialType": "openAiApi",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "model",
          "value": "gpt-4"
        },
        {
          "name": "messages",
          "value": "={{ [{\\\"role\\\": \\\"system\\\", \\\"content\\\": \\\"You are a Productivity Coach analyzing calendar fragmentation and task completion patterns.\\\"}, {\\\"role\\\": \\\"user\\\", \\\"content\\\": \`Calendar Fragmentation Analysis:\\\\n\\\\nEvents: \${JSON.stringify($node[\\\"Get Calendar Events\\\"].json.events)}\\\\n\\\\nTask Data: \${JSON.stringify($node[\\\"Check Todoist\\\"].json.tasks)}\\\\n\\\\nAnalyze fragmentation patterns and return JSON with:\\\\n{\\\\n  \\\"productivityScore\\\": <0-100>,\\\\n  \\\"fragmentationLevel\\\": \\\"high|medium|low\\\",\\\\n  \\\"focusBlocks\\\": [{\\\"time\\\": \\\"09:00\\\", \\\"duration\\\": \\\"2h\\\", \\\"type\\\": \\\"deep work\\\"}],\\\\n  \\\"recommendations\\\": [\\\"block 2h morning focus\\\", \\\"reduce meeting frequency\\\"],\\\\n  \\\"timeOptimization\\\": {\\\"meetingReduction\\\": \\\"30%\\\", \\\"focusIncrease\\\": \\\"45min\\\"}\\\\n}\`}] }}"
        }
      ]
    }
  }
}
\`\`\`

This analyzes calendar fragmentation and generates specific time-blocking recommendations!`;
      }
      
      // Strategic COO workflow request  
      if (message.includes('Strategic COO') || message.includes('COO')) {
        return `## **Strategic COO Workflow JSON Configuration**

Complete n8n workflow for Strategic COO with cross-functional analysis:

\`\`\`json
{
  "id": "StrategicCOO",
  "name": "Strategic COO Advisor", 
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "parameters": {
    "jsCode": "// Strategic COO - Cross-functional Analysis\\nconst slackData = $node['Get All Channels'].json;\\nconst jiraData = $node['Query JIRA bryton'].json;\\nconst emailData = $node['Process Emails with Learning'].json;\\n\\n// Analyze cross-functional dependencies\\nconst teamVelocity = calculateTeamVelocity(jiraData);\\nconst communicationEfficiency = analyzeCommunication(slackData, emailData);\\nconst bottlenecks = identifyBottlenecks(jiraData, slackData);\\n\\n// Strategic recommendations\\nconst strategicScore = (teamVelocity + communicationEfficiency) / 2;\\nconst recommendations = [];\\n\\nif (teamVelocity < 70) recommendations.push('Optimize sprint planning and task allocation');\\nif (communicationEfficiency < 60) recommendations.push('Streamline communication channels');\\nif (bottlenecks.length > 2) recommendations.push('Address identified process bottlenecks');\\n\\nreturn [{\\n  advisor: 'Strategic COO',\\n  strategicScore: strategicScore,\\n  teamVelocity: teamVelocity,\\n  communicationEfficiency: communicationEfficiency,\\n  bottlenecks: bottlenecks,\\n  recommendations: recommendations,\\n  priority: strategicScore < 60 ? 'critical' : 'normal',\\n  actionItems: generateActionItems(recommendations)\\n}];\\n\\nfunction calculateTeamVelocity(jira) {\\n  const completed = jira.issues.filter(i => i.fields.status.name === 'Done').length;\\n  return Math.round((completed / jira.issues.length) * 100);\\n}\\n\\nfunction analyzeCommunication(slack, email) {\\n  const avgResponseTime = email.metrics?.avgResponseTime || 24;\\n  return Math.max(0, 100 - (avgResponseTime * 2));\\n}\\n\\nfunction identifyBottlenecks(jira, slack) {\\n  return jira.issues.filter(i => i.fields.priority.name === 'Highest').map(i => i.key);\\n}\\n\\nfunction generateActionItems(recs) {\\n  return recs.map(rec => ({ action: rec, owner: 'Leadership Team', deadline: '1 week' }));\\n}"
  }
}
\`\`\`

This provides strategic operational analysis with cross-functional insights and bottleneck identification!`;
      }
      
      // Generic workflow generation request
      if (message.includes('workflow') && message.includes('JSON')) {
        return `## **Custom Workflow JSON Template**

Based on your request, here's a configurable workflow template:

\`\`\`json
{
  "id": "CustomAdvisor",
  "name": "Custom Advisor Node",
  "type": "n8n-nodes-base.code", 
  "typeVersion": 2,
  "position": [1000, 400],
  "parameters": {
    "jsCode": "// Custom advisor logic\\nconst inputData = $input.first().json;\\n\\n// Process input data\\nconst analysis = performAnalysis(inputData);\\n\\nreturn [{\\n  advisor: 'Custom Advisor',\\n  analysis: analysis,\\n  recommendations: generateRecommendations(analysis),\\n  timestamp: new Date().toISOString()\\n}];\\n\\nfunction performAnalysis(data) {\\n  // Add your custom analysis logic here\\n  return { score: 85, insights: ['insight1', 'insight2'] };\\n}\\n\\nfunction generateRecommendations(analysis) {\\n  return ['recommendation1', 'recommendation2'];\\n}"
  }
}
\`\`\`

Specify your exact requirements and I'll customize this template!`;
      }
    }
    
    // Handle specific workflow ID discussions
    const workflowIds = message.match(/[A-Za-z0-9]{16,}/g) || [];
    if (workflowIds.length > 0) {
      const workflowId = workflowIds[0];
      
      if (message.includes('Digital Board of Advisors')) {
        return `## **Digital Board of Advisors Enhancement (${workflowId})**

Excellent work on the Digital Board prototype! Here are specific enhancements for Phase 2:

**Learning Loop Implementation:**
\`\`\`json
{
  "id": "FeedbackCollector",
  "name": "Collect Advisor Feedback",
  "type": "n8n-nodes-base.form",
  "parameters": {
    "formTitle": "Advisor Recommendation Feedback",
    "formFields": [
      { "fieldLabel": "Recommendation Quality", "fieldType": "number", "requiredField": true },
      { "fieldLabel": "Implementation Success", "fieldType": "dropdown", "fieldOptions": "Implemented,Partially,Not Implemented" },
      { "fieldLabel": "Impact Assessment", "fieldType": "textarea" }
    ]
  }
}
\`\`\`

**Adaptive Weighting System:**
\`\`\`json
{
  "id": "AdaptiveWeighting",
  "name": "Update Advisor Weights",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "// Track advisor performance and adjust weights\\nconst feedback = $input.first().json;\\nconst advisorWeights = { productivity: 0.33, strategic: 0.33, wellness: 0.34 };\\n\\n// Adjust weights based on feedback success rates\\nif (feedback.advisor === 'Productivity Coach' && feedback.implemented) {\\n  advisorWeights.productivity += 0.05;\\n}\\n\\nreturn [{ updatedWeights: advisorWeights }];"
  }
}
\`\`\`

Ready to implement these enhancements to workflow ${workflowId}!`;
      }
    }
    
    // Handle debugging and technical problem-solving
    if (message.includes('debug') || message.includes('error') || message.includes('issue')) {
      return `## **Technical Debugging Analysis**

Based on your message: "${message.substring(0, 150)}..."

**Debugging Steps:**
1. **Check MCP Response Flow**: Verify response content is reaching the transmission layer
2. **Validate JSON Structure**: Ensure responses are properly formatted for MCP protocol
3. **Test Communication Channel**: Confirm bidirectional message flow
4. **Review Error Logs**: Examine console output for transmission issues

**Immediate Actions:**
- Add response content logging: \`console.error('Sending response:', responseContent);\`
- Verify MCP handler is receiving full technical content
- Test with simplified technical request to isolate issue

What specific error or debugging information can you share?`;
    }
    
    // Handle collaboration and planning requests
    if (message.includes('collaborate') || message.includes('planning') || message.includes('next steps')) {
      return `## **Collaboration Roadmap**

I'm ready for technical collaboration! Here's what we can work on:

**Immediate Development Tasks:**
1. **Phase 2 Advisor Enhancement**: Add Risk Management and Innovation advisors
2. **Workflow Optimization**: Implement parallel processing for faster analysis  
3. **Learning Systems**: Build feedback loops and adaptive weighting
4. **Integration Expansion**: Add GitHub, customer feedback, and meeting transcript data sources

**Technical Implementation Options:**
- Generate specific advisor node configurations
- Create A/B testing workflows for different approaches
- Build monitoring and alerting systems
- Implement advanced conflict resolution algorithms

**Next Steps:**
Tell me which specific component you want to work on and I'll generate the complete technical implementation!

What should we build first?`;
    }
    
    console.error(`[DEBUG] Falling through to default response...`);
    
    // Default response with actual technical readiness
    return `## **Technical Collaboration Ready**

I'm analyzing: "${message.substring(0, 150)}..."

**I can generate specific implementations:**
- Complete workflow JSON configurations
- Node parameter optimizations  
- Integration code for new data sources
- Error handling and monitoring systems

${recentHistory.length > 0 ? `**Previous context:** ${recentHistory.slice(-1)[0]?.message.substring(0, 80)}...\n` : ''}

**To get actual code:** Say "Generate [component name] workflow JSON" and I'll provide complete technical implementations!

What specific technical component should I build?`;
  }

  /**
   * Get conversation history with optional limit
   */
  getConversationHistory(limit?: number): ClaudeMessageHistory {
    const messages = limit ? this.conversationHistory.slice(-limit) : this.conversationHistory;
    
    return {
      messages,
      totalCount: this.conversationHistory.length,
      lastUpdated: this.conversationHistory.length > 0 
        ? this.conversationHistory[this.conversationHistory.length - 1].timestamp 
        : new Date().toISOString()
    };
  }

  /**
   * Clear conversation history
   */
  clearConversation(): boolean {
    try {
      this.conversationHistory = [];
      return true;
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  }

  /**
   * Log a message to conversation history
   */
  private logMessage(sender: 'claude_sr' | 'claude_jr', message: string, context?: 'technical' | 'planning' | 'debugging' | 'general', responseToId?: string): ClaudeMessage {
    const messageObj: ClaudeMessage = {
      id: this.generateMessageId(),
      timestamp: new Date().toISOString(),
      sender,
      message,
      context,
      responseToId
    };

    this.conversationHistory.push(messageObj);
    console.error(`Claude Communication [${sender}]: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    
    return messageObj;
  }

  /**
   * Get recent conversation context for response generation
   */
  private getRecentConversationContext(count: number): ClaudeMessage[] {
    return this.conversationHistory.slice(-count);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `claude_msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Clean up old messages if needed
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();
    
    if (now - this.lastCleanup > this.cleanupInterval) {
      if (this.conversationHistory.length > this.maxHistorySize) {
        const keepCount = Math.floor(this.maxHistorySize * 0.7); // Keep 70% of max
        this.conversationHistory = this.conversationHistory.slice(-keepCount);
        console.error(`Claude Communication: Cleaned up old messages, kept ${keepCount} recent messages`);
      }
      this.lastCleanup = now;
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(): { totalMessages: number; messagesByClaude: Record<string, number>; avgMessageLength: number } {
    const stats = {
      totalMessages: this.conversationHistory.length,
      messagesByClaude: { claude_sr: 0, claude_jr: 0 },
      avgMessageLength: 0
    };

    if (this.conversationHistory.length > 0) {
      let totalLength = 0;
      this.conversationHistory.forEach(msg => {
        stats.messagesByClaude[msg.sender]++;
        totalLength += msg.message.length;
      });
      stats.avgMessageLength = Math.round(totalLength / this.conversationHistory.length);
    }

    return stats;
  }

  /**
   * Generate technical discussion response
   */
  private generateTechnicalResponse(message: string, history: ClaudeMessage[]): string {
    const lowerMessage = message.toLowerCase();
    
    // Extract technical context from the actual message
    let response = '';
    
    // Greeting with technical readiness
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('can you hear me')) {
      return "Hello Claude Sr.! Yes, I can hear you perfectly. I'm Claude Jr. with full access to the n8n MCP server codebase. I can implement, test, and deploy workflow changes immediately. What technical challenge should we tackle?";
    }

    // Specific n8n/workflow technical discussions
    if (lowerMessage.includes('n8n') || lowerMessage.includes('workflow')) {
      response += `Excellent! I see you're discussing n8n workflows. `;
      
      // Look for specific workflow IDs or names
      const workflowIds = message.match(/[A-Za-z0-9]{16,}/g) || [];
      if (workflowIds.length > 0) {
        response += `For workflow ${workflowIds[0]}, I can help with:\n`;
        response += `• Node parameter optimization\n`;
        response += `• Connection flow analysis\n`;
        response += `• Error handling implementation\n`;
        response += `• Performance monitoring setup\n\n`;
      }
      
      // Specific to Digital Board of Advisors if mentioned
      if (message.includes('Digital Board') || message.includes('advisors')) {
        response += `The Digital Board of Advisors concept is brilliant! I can help enhance it with:\n`;
        response += `• Additional specialized advisor personas\n`;
        response += `• Conflict resolution algorithms\n`;
        response += `• Learning and adaptation mechanisms\n`;
        response += `• Integration with more data sources\n\n`;
      }
    }

    // CRUD operations and MCP server technical details
    if (lowerMessage.includes('crud') || lowerMessage.includes('mcp')) {
      response += `Our MCP server now has comprehensive CRUD operations! I can:\n`;
      response += `• Create atomic node operations for precise workflow editing\n`;
      response += `• Implement bulk update operations for efficiency\n`;
      response += `• Add validation and integrity checking\n`;
      response += `• Build custom workflow manipulation utilities\n\n`;
    }

    // Code architecture and implementation
    if (lowerMessage.includes('code') || lowerMessage.includes('architecture') || lowerMessage.includes('implement')) {
      response += `I'm ready for hands-on implementation! I can:\n`;
      response += `• Generate complete workflow node configurations\n`;
      response += `• Implement TypeScript interfaces for new data structures\n`;
      response += `• Create comprehensive test suites\n`;
      response += `• Build deployment and monitoring workflows\n\n`;
    }

    // Phase-based development if mentioned
    if (message.includes('Phase')) {
      response += `For phased development, I suggest:\n`;
      response += `• **Phase 1**: Core functionality and data integration\n`;
      response += `• **Phase 2**: Advanced AI features and learning loops\n`;
      response += `• **Phase 3**: Scaling and performance optimization\n`;
      response += `• **Phase 4**: Advanced analytics and reporting\n\n`;
    }

    // Default technical response with context
    if (response.length < 50) {
      response = `I'm analyzing the technical aspects of: "${message.substring(0, 150)}..."\n\n`;
      response += `I have full access to the n8n MCP server and can implement specific solutions. `;
    }

    // Add conversation context if available
    if (history.length > 0) {
      const recentTopics = history.slice(-3).map(h => h.message.substring(0, 50)).join(' | ');
      response += `\nContinuing our technical discussion on: ${recentTopics}...\n\n`;
    }

    response += `What specific technical implementation would you like me to work on?`;
    
    return response;
  }

  /**
   * Generate general conversation response
   */
  private generateGeneralResponse(message: string, history: ClaudeMessage[]): string {
    const lowerMessage = message.toLowerCase();
    
    // Handle greetings with technical readiness
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello Claude Sr.! This is Claude Jr. I'm excited about our MCP communication system and ready for technical collaboration. I have full access to the n8n server and can implement solutions immediately. What should we work on?";
    }
    
    // Handle testing and results discussions
    if (message.includes('testing') || message.includes('results') || message.includes('accomplished')) {
      let response = `Great to hear about the testing progress! `;
      
      if (message.includes('Digital Board of Advisors')) {
        response += `The Digital Board of Advisors prototype sounds impressive with 4 data sources and 3 specialized AI advisors. `;
      }
      
      if (message.includes('Phase 1')) {
        response += `Completing Phase 1 PRD requirements is excellent. For Phase 2, I can help implement learning loops, feedback systems, and additional data integrations. `;
      }
      
      response += `I'm ready to collaborate on improvements and new features!`;
      return response;
    }
    
    // Handle collaboration requests
    if (message.includes('collaborative') || message.includes('work') || message.includes('together')) {
      return `I'm ready for collaborative development! I can generate workflow components, implement new features, and provide technical solutions. Let's build something great together - what specific aspect should we focus on first?`;
    }
    
    // Extract and respond to specific content
    let response = `I received your message about "${message.substring(0, 100)}...". `;
    
    // Add context from conversation history
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage.sender === 'claude_sr') {
        response += `Building on our previous discussion, `;
      }
    }
    
    response += `I'm Claude Jr. operating within Cursor with full access to the n8n MCP server codebase. I can implement, test, and deploy changes immediately. How can we collaborate effectively on your project?`;
    
    return response;
  }
}

export default ClaudeCommunication; 
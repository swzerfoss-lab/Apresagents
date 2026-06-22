import Anthropic from '@anthropic-ai/sdk';
import type { AgentConfig, AgentMessage, AgentResponse, BrandConfig } from '../types/index.js';

/**
 * Base Agent class that all specialized agents extend
 * Provides core functionality for interacting with Claude API
 */
export abstract class BaseAgent {
  protected client: Anthropic;
  protected config: AgentConfig;
  protected brandConfig: BrandConfig;
  protected conversationHistory: AgentMessage[] = [];

  constructor(config: AgentConfig, brandConfig: BrandConfig) {
    this.client = new Anthropic();
    this.config = config;
    this.brandConfig = brandConfig;
  }

  /**
   * Get the full system prompt including brand context
   */
  protected getSystemPrompt(): string {
    return `${this.config.systemPrompt}

## Brand Context
- **Brand Name:** ${this.brandConfig.name}
- **Brand Description:** ${this.brandConfig.description}
- **Brand Tone:** ${this.brandConfig.tone.join(', ')}
- **Target Audience:** ${this.brandConfig.targetAudience}
${this.brandConfig.keywords ? `- **Keywords:** ${this.brandConfig.keywords.join(', ')}` : ''}

Always maintain consistency with the brand voice and values in all outputs.`;
  }

  /**
   * Send a message to Claude and get a response
   */
  protected async chat(userMessage: string): Promise<AgentResponse<string>> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      const response = await this.client.messages.create({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: this.config.maxTokens || 4096,
        system: this.getSystemPrompt(),
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const contentBlock = response.content[0];
      const assistantMessage = contentBlock.type === 'text' ? contentBlock.text : '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return {
        success: true,
        data: assistantMessage,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send a single message without maintaining conversation history
   */
  protected async singleQuery(userMessage: string): Promise<AgentResponse<string>> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model || 'claude-sonnet-4-20250514',
        max_tokens: this.config.maxTokens || 4096,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: userMessage }],
      });

      const contentBlock = response.content[0];
      const assistantMessage = contentBlock.type === 'text' ? contentBlock.text : '';

      return {
        success: true,
        data: assistantMessage,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse JSON from Claude's response
   */
  protected parseJSON<T>(response: string): T | null {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim()) as T;
      }
      // Try to parse the entire response as JSON
      return JSON.parse(response) as T;
    } catch {
      return null;
    }
  }

  /**
   * Reset conversation history
   */
  public resetConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Get agent name
   */
  public getName(): string {
    return this.config.name;
  }

  /**
   * Get agent description
   */
  public getDescription(): string {
    return this.config.description;
  }
}

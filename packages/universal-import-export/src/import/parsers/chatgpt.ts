/**
 * ChatGPT Export Parser
 *
 * Parses ChatGPT conversation exports and converts to standard format.
 */

import { ChatGPTExport, ChatGPTMessage } from '../types'

// ============================================================================
// CHATGPT PARSER
// ============================================================================

export class ChatGPTParser {
  /**
   * Parse ChatGPT export data
   */
  async parse(data: string | ChatGPTExport): Promise<any[]> {
    let exportData: ChatGPTExport

    // Parse JSON if string
    if (typeof data === 'string') {
      try {
        exportData = JSON.parse(data)
      } catch (error) {
        throw new Error('Invalid ChatGPT export: Unable to parse JSON')
      }
    } else {
      exportData = data
    }

    // Validate structure
    this.validate(exportData)

    // Convert to standard format
    const conversations = await this.convertToStandard(exportData)

    return conversations
  }

  /**
   * Validate ChatGPT export structure
   */
  private validate(data: ChatGPTExport): void {
    if (!data.conversations || !Array.isArray(data.conversations)) {
      throw new Error('Invalid ChatGPT export: missing conversations array')
    }
  }

  /**
   * Convert ChatGPT format to standard format
   */
  private async convertToStandard(exportData: ChatGPTExport): Promise<any[]> {
    const conversations: any[] = []

    for (const chatGPTConv of exportData.conversations) {
      // Create standard conversation
      const standardConv: any = {
        id: this.generateId(),
        title: this.sanitizeTitle(chatGPTConv.title),
        type: 'ai-assisted' as const,
        createdAt: chatGPTConv.timestamp || new Date().toISOString(),
        updatedAt: chatGPTConv.timestamp || new Date().toISOString(),
        messages: [],
        metadata: {
          messageCount: chatGPTConv.messages?.length || 0,
          source: 'chatgpt' as const,
          sourceId: chatGPTConv.id,
        },
      }

      // Convert messages
      if (chatGPTConv.messages && Array.isArray(chatGPTConv.messages)) {
        for (const msg of chatGPTConv.messages) {
          const standardMsg = this.convertMessage(msg, standardConv.id)
          standardConv.messages.push(standardMsg)
        }
      }

      conversations.push(standardConv)
    }

    return conversations
  }

  /**
   * Convert ChatGPT message to standard message
   */
  private convertMessage(chatgptMsg: ChatGPTMessage, conversationId: string): any {
    const author = chatgptMsg.role === 'user' ? 'user' : {
      type: 'ai-contact',
      contactId: 'chatgpt-default',
      contactName: 'ChatGPT',
    }

    return {
      id: this.generateId(),
      conversationId,
      type: 'text' as const,
      author,
      content: {
        text: chatgptMsg.content,
      },
      timestamp: new Date().toISOString(),
      metadata: {},
    }
  }

  /**
   * Sanitize conversation title
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with space
      .trim()
      .slice(0, 200) // Limit length
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Detect if file is ChatGPT export
   */
  static detectFormat(content: string): boolean {
    try {
      const data = JSON.parse(content)
      return (
        Array.isArray(data.conversations) &&
        data.conversations.length > 0 &&
        (data.conversations[0].title !== undefined ||
         data.conversations[0].messages !== undefined)
      )
    } catch {
      return false
    }
  }
}

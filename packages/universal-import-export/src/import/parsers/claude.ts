/**
 * Claude Export Parser
 *
 * Parses Claude conversation exports and converts to standard format.
 */

import { ClaudeExport, ClaudeMessage } from '../types'

// ============================================================================
// CLAUDE PARSER
// ============================================================================

export class ClaudeParser {
  /**
   * Parse Claude export data
   */
  async parse(data: string | ClaudeExport): Promise<any[]> {
    let exportData: ClaudeExport

    // Parse JSON if string
    if (typeof data === 'string') {
      try {
        exportData = JSON.parse(data)
      } catch (error) {
        throw new Error('Invalid Claude export: Unable to parse JSON')
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
   * Validate Claude export structure
   */
  private validate(data: ClaudeExport): void {
    if (!data.conversations || !Array.isArray(data.conversations)) {
      throw new Error('Invalid Claude export: missing conversations array')
    }
  }

  /**
   * Convert Claude format to standard format
   */
  private async convertToStandard(exportData: ClaudeExport): Promise<any[]> {
    const conversations: any[] = []

    for (const claudeConv of exportData.conversations) {
      // Create standard conversation
      const standardConv: any = {
        id: this.generateId(),
        title: this.sanitizeTitle(claudeConv.name || 'Claude Conversation'),
        type: 'ai-assisted' as const,
        createdAt: claudeConv.created_at || new Date().toISOString(),
        updatedAt: claudeConv.updated_at || new Date().toISOString(),
        messages: [],
        metadata: {
          messageCount: claudeConv.messages?.length || 0,
          source: 'claude' as const,
          sourceId: claudeConv.uuid,
        },
      }

      // Convert messages
      if (claudeConv.messages && Array.isArray(claudeConv.messages)) {
        for (const msg of claudeConv.messages) {
          const standardMsg = this.convertMessage(msg, standardConv.id)
          standardConv.messages.push(standardMsg)
        }
      }

      conversations.push(standardConv)
    }

    return conversations
  }

  /**
   * Convert Claude message to standard message
   */
  private convertMessage(claudeMsg: ClaudeMessage, conversationId: string): any {
    const author = claudeMsg.sender === 'human' ? 'user' : {
      type: 'ai-contact',
      contactId: 'claude-default',
      contactName: 'Claude',
    }

    const content: any = {
      text: claudeMsg.text,
    }

    // Handle attachments
    if (claudeMsg.attachments && claudeMsg.attachments.length > 0) {
      content.attachments = claudeMsg.attachments
    }

    return {
      id: this.generateId(),
      conversationId,
      type: 'text' as const,
      author,
      content,
      timestamp: claudeMsg.created_at || new Date().toISOString(),
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
   * Detect if file is Claude export
   */
  static detectFormat(content: string): boolean {
    try {
      const data = JSON.parse(content)
      return (
        Array.isArray(data.conversations) &&
        data.conversations.length > 0 &&
        (data.conversations[0].uuid !== undefined ||
         data.conversations[0].name !== undefined)
      )
    } catch {
      return false
    }
  }
}

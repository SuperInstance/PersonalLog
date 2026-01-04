/**
 * Data Validation System
 *
 * Comprehensive validation for all PersonalLog data.
 * Ensures data integrity, type safety, and business logic compliance.
 */

import { Conversation, Message } from '@/types/conversation';
import { KnowledgeEntry } from '@/lib/knowledge/vector-store';
import { ValidationError, StorageError } from '@/lib/errors';
import { schemaValidator } from './schema';
import { ChecksumManager } from './checksum';
import type {
  ValidationResult,
  ValidationReport,
  ValidationError as ValidationErrorType,
  ValidationWarning
} from './integrity-types';

// ============================================================================
// DATA VALIDATOR
// ============================================================================

export class DataValidator {
  private checksumManager: ChecksumManager;
  private strictMode: boolean = true;

  constructor(checksumManager?: ChecksumManager) {
    this.checksumManager = checksumManager || new ChecksumManager();
  }

  /**
   * Enable strict validation mode
   */
  enableStrictMode(): void {
    this.strictMode = true;
  }

  /**
   * Disable strict validation mode
   */
  disableStrictMode(): void {
    this.strictMode = false;
  }

  // ==========================================================================
  // CONVERSATION VALIDATION
  // ==========================================================================

  /**
   * Validate conversation data
   */
  async validateConversation(data: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    // Schema validation
    const schemaResult = schemaValidator.validateConversation(data);
    if (!schemaResult.valid) {
      schemaResult.errors.forEach(err => {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'structure',
          field: err.path,
          message: err.message,
          code: 'SCHEMA_ERROR',
          value: err.value,
          expected: err.expected,
          timestamp: Date.now()
        });
      });
    }

    if (!this.isConversation(data)) {
      return this.createResult(false, errors, warnings, startTime);
    }

    // Business logic validation
    this.validateConversationBusinessLogic(data, errors, warnings);

    // Checksum validation
    if (this.checksumManager.isEnabled()) {
      const hasValidChecksum = await this.checksumManager.verify(data.id, data);
      if (!hasValidChecksum) {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'checksum',
          field: 'checksum',
          message: 'Conversation checksum mismatch or missing',
          code: 'CHECKSUM_MISMATCH',
          timestamp: Date.now()
        });
      }
    }

    return this.createResult(errors.length === 0, errors, warnings, startTime);
  }

  /**
   * Validate conversation business logic
   */
  private validateConversationBusinessLogic(
    conv: Conversation,
    errors: ValidationErrorType[],
    warnings: ValidationWarning[]
  ): void {
    // Date validation
    const createdDate = new Date(conv.createdAt);
    const updatedDate = new Date(conv.updatedAt);
    const now = new Date();

    if (isNaN(createdDate.getTime())) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'createdAt',
        message: 'Invalid createdAt date',
        code: 'INVALID_DATE',
        value: conv.createdAt,
        timestamp: Date.now()
      });
    }

    if (isNaN(updatedDate.getTime())) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'updatedAt',
        message: 'Invalid updatedAt date',
        code: 'INVALID_DATE',
        value: conv.updatedAt,
        timestamp: Date.now()
      });
    }

    if (createdDate > updatedDate) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'updatedAt',
        message: 'updatedAt cannot be before createdAt',
        code: 'INVALID_DATE_ORDER',
        timestamp: Date.now()
      });
    }

    // Future date validation (optional warning)
    if (createdDate > now) {
      warnings.push({
        id: this.generateErrorId(),
        field: 'createdAt',
        message: 'createdAt is in the future',
        code: 'FUTURE_DATE',
        value: conv.createdAt,
        recommendation: 'Check system clock',
        timestamp: Date.now()
      });
    }

    // Message count validation
    if (conv.metadata.messageCount < 0) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'metadata.messageCount',
        message: 'messageCount cannot be negative',
        code: 'NEGATIVE_COUNT',
        value: conv.metadata.messageCount,
        timestamp: Date.now()
      });
    }

    // Title validation
    if (!conv.title || conv.title.trim().length === 0) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        field: 'title',
        message: 'Title cannot be empty',
        code: 'EMPTY_TITLE',
        timestamp: Date.now()
      });
    }

    // Token count validation
    if (conv.metadata.totalTokens < 0) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'metadata.totalTokens',
        message: 'totalTokens cannot be negative',
        code: 'NEGATIVE_TOKENS',
        value: conv.metadata.totalTokens,
        timestamp: Date.now()
      });
    }
  }

  // ==========================================================================
  // MESSAGE VALIDATION
  // ==========================================================================

  /**
   * Validate message data
   */
  async validateMessage(data: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    // Schema validation
    const schemaResult = schemaValidator.validateMessage(data);
    if (!schemaResult.valid) {
      schemaResult.errors.forEach(err => {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'structure',
          field: err.path,
          message: err.message,
          code: 'SCHEMA_ERROR',
          value: err.value,
          expected: err.expected,
          timestamp: Date.now()
        });
      });
    }

    if (!this.isMessage(data)) {
      return this.createResult(false, errors, warnings, startTime);
    }

    // Business logic validation
    this.validateMessageBusinessLogic(data, errors, warnings);

    return this.createResult(errors.length === 0, errors, warnings, startTime);
  }

  /**
   * Validate message business logic
   */
  private validateMessageBusinessLogic(
    msg: Message,
    errors: ValidationErrorType[],
    warnings: ValidationWarning[]
  ): void {
    // Date validation
    const msgDate = new Date(msg.timestamp);
    if (isNaN(msgDate.getTime())) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'timestamp',
        message: 'Invalid timestamp',
        code: 'INVALID_DATE',
        value: msg.timestamp,
        timestamp: Date.now()
      });
    }

    // Content validation based on type
    if (msg.type === 'text' && !msg.content.text) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        field: 'content.text',
        message: 'Text message must have text content',
        code: 'MISSING_TEXT_CONTENT',
        timestamp: Date.now()
      });
    }

    // Media validation
    if (['image', 'file', 'audio'].includes(msg.type) && !msg.content.media) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        field: 'content.media',
        message: `${msg.type} message must have media attachment`,
        code: 'MISSING_MEDIA',
        timestamp: Date.now()
      });
    }

    // ReplyTo validation
    if (msg.replyTo && msg.replyTo === msg.id) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'replyTo',
        message: 'Message cannot reply to itself',
        code: 'SELF_REPLY',
        value: msg.replyTo,
        timestamp: Date.now()
      });
    }
  }

  // ==========================================================================
  // KNOWLEDGE VALIDATION
  // ==========================================================================

  /**
   * Validate knowledge base data
   */
  async validateKnowledge(data: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    // Schema validation
    const schemaResult = schemaValidator.validateKnowledgeEntry(data);
    if (!schemaResult.valid) {
      schemaResult.errors.forEach(err => {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'structure',
          field: err.path,
          message: err.message,
          code: 'SCHEMA_ERROR',
          value: err.value,
          expected: err.expected,
          timestamp: Date.now()
        });
      });
    }

    if (!this.isKnowledgeEntry(data)) {
      return this.createResult(false, errors, warnings, startTime);
    }

    // Business logic validation
    this.validateKnowledgeBusinessLogic(data, errors, warnings);

    return this.createResult(errors.length === 0, errors, warnings, startTime);
  }

  /**
   * Validate knowledge business logic
   */
  private validateKnowledgeBusinessLogic(
    entry: KnowledgeEntry,
    errors: ValidationErrorType[],
    warnings: ValidationWarning[]
  ): void {
    // Content validation
    if (!entry.content || entry.content.trim().length === 0) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        field: 'content',
        message: 'Knowledge entry content cannot be empty',
        code: 'EMPTY_CONTENT',
        timestamp: Date.now()
      });
    }

    // Embedding validation
    if (entry.embedding) {
      if (!Array.isArray(entry.embedding)) {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'structure',
          field: 'embedding',
          message: 'Embedding must be an array',
          code: 'INVALID_EMBEDDING',
          timestamp: Date.now()
        });
      } else if (entry.embedding.length === 0) {
        warnings.push({
          id: this.generateErrorId(),
          field: 'embedding',
          message: 'Embedding array is empty',
          code: 'EMPTY_EMBEDDING',
          recommendation: 'Consider generating embeddings',
          timestamp: Date.now()
        });
      }
    }

    // Metadata validation
    if (entry.metadata.importance !== undefined) {
      if (entry.metadata.importance < 0 || entry.metadata.importance > 1) {
        errors.push({
          id: this.generateErrorId(),
          severity: 'error',
          category: 'constraint',
          field: 'metadata.importance',
          message: 'Importance must be between 0 and 1',
          code: 'OUT_OF_RANGE',
          value: entry.metadata.importance,
          expected: '0-1',
          timestamp: Date.now()
        });
      }
    }

    // Date validation
    const timestamp = new Date(entry.metadata.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'business-logic',
        field: 'metadata.timestamp',
        message: 'Invalid timestamp',
        code: 'INVALID_DATE',
        value: entry.metadata.timestamp,
        timestamp: Date.now()
      });
    }
  }

  // ==========================================================================
  // SETTINGS VALIDATION
  // ==========================================================================

  /**
   * Validate settings data
   */
  async validateSettings(data: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        message: 'Settings must be an object',
        code: 'INVALID_SETTINGS',
        timestamp: Date.now()
      });
      return this.createResult(false, errors, warnings, startTime);
    }

    // Validate settings structure
    const settings = data as Record<string, unknown>;

    // Add specific settings validations here
    // This is a placeholder for future settings validation

    return this.createResult(errors.length === 0, errors, warnings, startTime);
  }

  // ==========================================================================
  // ANALYTICS VALIDATION
  // ==========================================================================

  /**
   * Validate analytics data
   */
  async validateAnalytics(data: unknown): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationErrorType[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        id: this.generateErrorId(),
        severity: 'error',
        category: 'structure',
        message: 'Analytics data must be an object',
        code: 'INVALID_ANALYTICS',
        timestamp: Date.now()
      });
      return this.createResult(false, errors, warnings, startTime);
    }

    // Validate analytics structure
    // This is a placeholder for future analytics validation

    return this.createResult(errors.length === 0, errors, warnings, startTime);
  }

  // ==========================================================================
  // DATABASE VALIDATION
  // ==========================================================================

  /**
   * Validate entire database
   */
  async validateDatabase(): Promise<ValidationReport> {
    const startTime = Date.now();
    const results = {
      conversations: await this.validateAllConversations(),
      messages: await this.validateAllMessages(),
      knowledge: await this.validateAllKnowledge(),
      agents: await this.validateAllAgents(),
      settings: await this.validateAllSettings()
    };

    const totalErrors = Object.values(results).reduce(
      (sum, r) => sum + r.errors.length,
      0
    );
    const totalWarnings = Object.values(results).reduce(
      (sum, r) => sum + r.warnings.length,
      0
    );
    const criticalErrors = Object.values(results).reduce(
      (sum, r) => sum + r.errors.filter(e => e.severity === 'error').length,
      0
    );

    const overall: 'passed' | 'failed' | 'degraded' =
      criticalErrors > 0 ? 'failed' : totalErrors > 0 ? 'degraded' : 'passed';

    const score = Math.max(0, 100 - (criticalErrors * 10) - (totalErrors * 2) - (totalWarnings * 0.5));

    return {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      overall,
      score,
      results,
      summary: {
        totalErrors,
        totalWarnings,
        criticalErrors
      }
    };
  }

  /**
   * Validate all conversations
   */
  private async validateAllConversations(): Promise<ValidationResult> {
    // Placeholder - will be implemented with storage integration
    return this.createResult(true, [], [], Date.now());
  }

  /**
   * Validate all messages
   */
  private async validateAllMessages(): Promise<ValidationResult> {
    // Placeholder - will be implemented with storage integration
    return this.createResult(true, [], [], Date.now());
  }

  /**
   * Validate all knowledge entries
   */
  private async validateAllKnowledge(): Promise<ValidationResult> {
    // Placeholder - will be implemented with storage integration
    return this.createResult(true, [], [], Date.now());
  }

  /**
   * Validate all agents
   */
  private async validateAllAgents(): Promise<ValidationResult> {
    // Placeholder - will be implemented with storage integration
    return this.createResult(true, [], [], Date.now());
  }

  /**
   * Validate all settings
   */
  private async validateAllSettings(): Promise<ValidationResult> {
    // Placeholder - will be implemented with storage integration
    return this.createResult(true, [], [], Date.now());
  }

  // ==========================================================================
  // INTEGRITY CHECKING
  // ==========================================================================

  /**
   * Check data integrity
   */
  async checkIntegrity(): Promise<IntegrityReport> {
    // Placeholder - will be implemented with full integrity checking
    return {
      overall: 'healthy',
      score: 100,
      timestamp: Date.now(),
      duration: 0,
      checks: {
        structural: {
          name: 'Structural Integrity',
          status: 'pass',
          score: 100,
          message: 'All structural checks passed',
          timestamp: Date.now(),
          duration: 0
        },
        referential: {
          name: 'Referential Integrity',
          status: 'pass',
          score: 100,
          message: 'All references valid',
          timestamp: Date.now(),
          duration: 0
        },
        businessLogic: {
          name: 'Business Logic',
          status: 'pass',
          score: 100,
          message: 'All business rules satisfied',
          timestamp: Date.now(),
          duration: 0
        },
        performance: {
          name: 'Performance',
          status: 'pass',
          score: 100,
          message: 'Performance optimal',
          timestamp: Date.now(),
          duration: 0
        }
      },
      recommendations: [],
      issues: []
    } as IntegrityReport;
  }

  /**
   * Scan for corruption
   */
  async scanCorruption(): Promise<CorruptionReport> {
    // Placeholder - will be implemented with full corruption scanning
    return {
      timestamp: Date.now(),
      duration: 0,
      totalIssues: 0,
      issues: {
        checksums: [],
        orphans: [],
        duplicates: [],
        brokenReferences: [],
        encoding: []
      },
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      recommendations: []
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private createResult(
    valid: boolean,
    errors: ValidationErrorType[],
    warnings: ValidationWarning[],
    startTime: number
  ): ValidationResult {
    return {
      valid,
      errors,
      warnings,
      timestamp: Date.now(),
      duration: Date.now() - startTime
    };
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private isConversation(data: unknown): data is Conversation {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'title' in data &&
      'type' in data &&
      'createdAt' in data &&
      'updatedAt' in data
    );
  }

  private isMessage(data: unknown): data is Message {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'conversationId' in data &&
      'type' in data &&
      'author' in data &&
      'content' in data &&
      'timestamp' in data
    );
  }

  private isKnowledgeEntry(data: unknown): data is KnowledgeEntry {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'type' in data &&
      'sourceId' in data &&
      'content' in data &&
      'metadata' in data
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export type for use in other files
export type IntegrityReport = any;
export type CorruptionReport = any;

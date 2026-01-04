/**
 * Schema Definitions
 *
 * Comprehensive JSON schemas for validating PersonalLog data structures.
 * Provides type-safe validation for all data models.
 */

import type { Conversation, Message, AIAgent } from '@/types/conversation';
import type { KnowledgeEntry } from '@/lib/knowledge/vector-store';

// ============================================================================
// SCHEMA DEFINITION TYPE
// ============================================================================

/**
 * JSON Schema definition
 */
export interface JSONSchema {
  type: string;
  required?: string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  additionalProperties?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  enum?: string[];
  description?: string;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  path: string;
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  path: string;
  message: string;
  value?: unknown;
  expected?: string;
}

// ============================================================================
// MESSAGE SCHEMA
// ============================================================================

export const messageSchema: JSONSchema = {
  type: 'object',
  required: ['id', 'conversationId', 'type', 'author', 'content', 'timestamp', 'metadata'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      description: 'Unique message identifier'
    },
    conversationId: {
      type: 'string',
      minLength: 1,
      description: 'Reference to parent conversation'
    },
    type: {
      type: 'string',
      enum: ['text', 'image', 'file', 'audio', 'transcript', 'system'],
      description: 'Message type'
    },
    author: {
      type: 'string',
      description: 'Message author (user or AI)'
    },
    content: {
      type: 'object',
      description: 'Message content'
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
      description: 'ISO 8601 timestamp'
    },
    selected: {
      type: 'boolean',
      description: 'Whether message is selected'
    },
    replyTo: {
      type: 'string',
      description: 'ID of message this replies to'
    },
    metadata: {
      type: 'object',
      description: 'Message metadata'
    }
  }
};

// ============================================================================
// CONVERSATION SCHEMA
// ============================================================================

export const conversationSchema: JSONSchema = {
  type: 'object',
  required: ['id', 'title', 'type', 'createdAt', 'updatedAt', 'messages', 'aiContacts', 'settings', 'metadata'],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      description: 'Unique conversation identifier'
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Conversation title'
    },
    type: {
      type: 'string',
      enum: ['personal', 'ai-assisted', 'transcript', 'reference'],
      description: 'Conversation type'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Creation timestamp'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time',
      description: 'Last update timestamp'
    },
    messages: {
      type: 'array',
      items: messageSchema,
      description: 'Messages in conversation'
    },
    aiContacts: {
      type: 'array',
      description: 'AI agents in conversation'
    },
    settings: {
      type: 'object',
      required: ['responseMode', 'compactOnLimit', 'compactStrategy'],
      properties: {
        responseMode: {
          type: 'string',
          enum: ['messenger', 'long-form']
        },
        compactOnLimit: {
          type: 'boolean'
        },
        compactStrategy: {
          type: 'string',
          enum: ['summarize', 'extract-key', 'user-directed']
        },
        escalationThreshold: {
          type: 'number',
          minimum: 0
        }
      }
    },
    metadata: {
      type: 'object',
      required: ['messageCount', 'totalTokens', 'hasMedia', 'tags', 'pinned', 'archived'],
      properties: {
        messageCount: {
          type: 'number',
          minimum: 0
        },
        totalTokens: {
          type: 'number',
          minimum: 0
        },
        hasMedia: {
          type: 'boolean'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        pinned: {
          type: 'boolean'
        },
        archived: {
          type: 'boolean'
        }
      }
    }
  }
};

// ============================================================================
// AI AGENT SCHEMA
// ============================================================================

export const aiAgentSchema: JSONSchema = {
  type: 'object',
  required: ['id', 'name', 'createdAt', 'updatedAt', 'config', 'personality', 'capabilities'],
  properties: {
    id: {
      type: 'string',
      minLength: 1
    },
    name: {
      type: 'string',
      minLength: 1,
      maxLength: 100
    },
    avatar: {
      type: 'string'
    },
    color: {
      type: 'string'
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    },
    config: {
      type: 'object',
      required: ['provider', 'model', 'temperature', 'maxTokens', 'responseStyle'],
      properties: {
        provider: {
          type: 'string',
          enum: ['local', 'openai', 'anthropic', 'google', 'custom']
        },
        model: {
          type: 'string',
          minLength: 1
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2
        },
        maxTokens: {
          type: 'number',
          minimum: 1
        },
        responseStyle: {
          type: 'string',
          enum: ['brief', 'balanced', 'detailed']
        },
        escalateToCloud: {
          type: 'boolean'
        },
        escalationPatience: {
          type: 'number',
          minimum: 0
        },
        cloudProvider: {
          type: 'string',
          enum: ['local', 'openai', 'anthropic', 'google', 'custom']
        },
        arrangement: {
          type: 'string',
          enum: ['parallel', 'series']
        },
        collaboratorIds: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      }
    },
    personality: {
      type: 'object',
      required: ['systemPrompt', 'vibeAttributes', 'contextConversationIds', 'responsePatterns'],
      properties: {
        systemPrompt: {
          type: 'string'
        },
        vibeAttributes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['attribute', 'value', 'source'],
            properties: {
              attribute: { type: 'string' },
              value: { type: 'number' },
              source: { type: 'string', enum: ['user-set', 'learned'] }
            }
          }
        },
        contextConversationIds: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        responsePatterns: {
          type: 'array',
          items: {
            type: 'object',
            required: ['trigger', 'response', 'confidence'],
            properties: {
              trigger: { type: 'string' },
              response: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 }
            }
          }
        }
      }
    },
    capabilities: {
      type: 'object',
      required: ['canSeeWeb', 'canSeeFiles', 'canHearAudio', 'canGenerateImages'],
      properties: {
        canSeeWeb: { type: 'boolean' },
        canSeeFiles: { type: 'boolean' },
        canHearAudio: { type: 'boolean' },
        canGenerateImages: { type: 'boolean' }
      }
    }
  }
};

// ============================================================================
// KNOWLEDGE ENTRY SCHEMA
// ============================================================================

export const knowledgeEntrySchema: JSONSchema = {
  type: 'object',
  required: ['id', 'type', 'sourceId', 'content', 'metadata', 'editable'],
  properties: {
    id: {
      type: 'string',
      minLength: 1
    },
    type: {
      type: 'string',
      enum: ['conversation', 'message', 'document', 'contact']
    },
    sourceId: {
      type: 'string',
      minLength: 1
    },
    content: {
      type: 'string',
      minLength: 1
    },
    embedding: {
      type: 'array',
      items: {
        type: 'number'
      }
    },
    metadata: {
      type: 'object',
      required: ['timestamp'],
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        author: {
          type: 'string'
        },
        contactId: {
          type: 'string'
        },
        conversationId: {
          type: 'string'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        importance: {
          type: 'number',
          minimum: 0,
          maximum: 1
        },
        starred: {
          type: 'boolean'
        }
      }
    },
    editable: {
      type: 'boolean'
    },
    editedContent: {
      type: 'string'
    },
    editedAt: {
      type: 'string',
      format: 'date-time'
    }
  }
};

// ============================================================================
// SCHEMA VALIDATOR
// ============================================================================

export class SchemaValidator {
  /**
   * Validate data against schema
   */
  validate(data: unknown, schema: JSONSchema, path: string = ''): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];

    this.validateValue(data, schema, path, errors);

    return {
      valid: errors.length === 0,
      errors,
      path
    };
  }

  /**
   * Validate a value recursively
   */
  private validateValue(
    value: unknown,
    schema: JSONSchema,
    path: string,
    errors: SchemaValidationError[]
  ): void {
    // Type validation
    if (schema.type && !this.validateType(value, schema.type)) {
      errors.push({
        path,
        message: `Expected type ${schema.type}, got ${typeof value}`,
        value,
        expected: schema.type
      });
      return;
    }

    // Null/undefined handling
    if (value === null || value === undefined) {
      if (schema.required?.includes(path.split('.').pop() || '')) {
        errors.push({
          path,
          message: 'Required field is missing',
          value
        });
      }
      return;
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      this.validateString(value, schema, path, errors);
    }

    // Number validation
    if (schema.type === 'number' && typeof value === 'number') {
      this.validateNumber(value, schema, path, errors);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      this.validateArray(value, schema, path, errors);
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value) && value !== null) {
      this.validateObject(value as Record<string, unknown>, schema, path, errors);
    }

    // Enum validation
    if (schema.enum && typeof value === 'string') {
      if (!schema.enum.includes(value)) {
        errors.push({
          path,
          message: `Value must be one of: ${schema.enum.join(', ')}`,
          value,
          expected: `enum: ${schema.enum.join(', ')}`
        });
      }
    }
  }

  /**
   * Validate type
   */
  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  /**
   * Validate string constraints
   */
  private validateString(
    value: string,
    schema: JSONSchema,
    path: string,
    errors: SchemaValidationError[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        path,
        message: `String length ${value.length} is less than minimum ${schema.minLength}`,
        value,
        expected: `length >= ${schema.minLength}`
      });
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        path,
        message: `String length ${value.length} exceeds maximum ${schema.maxLength}`,
        value,
        expected: `length <= ${schema.maxLength}`
      });
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push({
          path,
          message: `String does not match required pattern`,
          value,
          expected: `pattern: ${schema.pattern}`
        });
      }
    }

    if (schema.format === 'date-time') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push({
          path,
          message: `Invalid date-time format`,
          value,
          expected: 'ISO 8601 date-time'
        });
      }
    }
  }

  /**
   * Validate number constraints
   */
  private validateNumber(
    value: number,
    schema: JSONSchema,
    path: string,
    errors: SchemaValidationError[]
  ): void {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        path,
        message: `Value ${value} is less than minimum ${schema.minimum}`,
        value,
        expected: `>= ${schema.minimum}`
      });
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        path,
        message: `Value ${value} exceeds maximum ${schema.maximum}`,
        value,
        expected: `<= ${schema.maximum}`
      });
    }
  }

  /**
   * Validate array
   */
  private validateArray(
    value: unknown[],
    schema: JSONSchema,
    path: string,
    errors: SchemaValidationError[]
  ): void {
    if (schema.items) {
      value.forEach((item, index) => {
        this.validateValue(item, schema.items!, `${path}[${index}]`, errors);
      });
    }
  }

  /**
   * Validate object
   */
  private validateObject(
    value: Record<string, unknown>,
    schema: JSONSchema,
    path: string,
    errors: SchemaValidationError[]
  ): void {
    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in value) || value[field] === undefined) {
          errors.push({
            path: `${path}.${field}`,
            message: `Required field '${field}' is missing`,
            expected: 'required field'
          });
        }
      });
    }

    // Validate properties
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
        if (fieldName in value) {
          this.validateValue(
            value[fieldName],
            fieldSchema,
            path ? `${path}.${fieldName}` : fieldName,
            errors
          );
        }
      });
    }

    // Check additional properties
    if (schema.additionalProperties === false && schema.properties) {
      Object.keys(value).forEach(fieldName => {
        if (!schema.properties![fieldName]) {
          errors.push({
            path: `${path}.${fieldName}`,
            message: `Unexpected field '${fieldName}'`,
            value: value[fieldName]
          });
        }
      });
    }
  }

  /**
   * Validate conversation
   */
  validateConversation(data: unknown): SchemaValidationResult {
    return this.validate(data, conversationSchema, 'conversation');
  }

  /**
   * Validate message
   */
  validateMessage(data: unknown): SchemaValidationResult {
    return this.validate(data, messageSchema, 'message');
  }

  /**
   * Validate AI agent
   */
  validateAIAgent(data: unknown): SchemaValidationResult {
    return this.validate(data, aiAgentSchema, 'aiAgent');
  }

  /**
   * Validate knowledge entry
   */
  validateKnowledgeEntry(data: unknown): SchemaValidationResult {
    return this.validate(data, knowledgeEntrySchema, 'knowledgeEntry');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const schemaValidator = new SchemaValidator();

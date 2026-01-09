/**
 * Schema Validation
 *
 * Validates function inputs and outputs against schemas,
 * catching errors before execution.
 *
 * @module validation
 */

import { SchemaType, PropertySchema, ValidationError, FunctionSchema } from '../types.js';

/**
 * Schema validator for function inputs/outputs
 */
export class SchemaValidator {
  private strictMode: boolean;

  constructor(strictMode: boolean = false) {
    this.strictMode = strictMode;
  }

  /**
   * Validate input against schema
   */
  validate(input: any, schema: FunctionSchema, requiredFields?: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!schema.input) {
      return errors; // No schema means any input is valid
    }

    // Check required fields
    const required = schema.inputRequired || [];
    for (const field of required) {
      if (!(field in input) || input[field] === undefined || input[field] === null) {
        errors.push({
          path: field,
          message: `Required field '${field}' is missing`,
          expected: 'defined value',
          value: input[field]
        });
      }
    }

    // Validate each field
    for (const [field, fieldSchema] of Object.entries(schema.input)) {
      const value = input[field];

      // Skip validation if field is not required and not provided
      if (!required.includes(field) && (value === undefined || value === null)) {
        continue;
      }

      const fieldErrors = this.validateField(value, fieldSchema, field);
      errors.push(...fieldErrors);
    }

    // In strict mode, check for extra fields
    if (this.strictMode) {
      for (const field of Object.keys(input)) {
        if (!(field in schema.input)) {
          errors.push({
            path: field,
            message: `Unexpected field '${field}' not defined in schema`,
            value: input[field]
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate output against schema
   */
  validateOutput(output: any, schema: FunctionSchema): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!schema.output) {
      return errors; // No schema means any output is valid
    }

    for (const [field, fieldSchema] of Object.entries(schema.output)) {
      const value = output[field];
      const fieldErrors = this.validateField(value, fieldSchema, field);
      errors.push(...fieldErrors);
    }

    return errors;
  }

  /**
   * Validate a single field value against its schema
   */
  private validateField(value: any, schema: PropertySchema, path: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Handle null/undefined (except when it's allowed)
    if (value === null || value === undefined) {
      if (schema.default !== undefined) {
        return errors; // Will use default
      }
      if (!schema.required) {
        return errors; // Optional field
      }
    }

    // Check enum constraints
    if (schema.enum && !this.enumIncludes(schema.enum, value)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value,
        expected: `enum: ${schema.enum.join(', ')}`
      });
      return errors;
    }

    // Get the actual type(s) to check
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];

    // Check if value matches any of the allowed types
    const typeMatch = types.some(type => this.checkType(value, type));
    if (!typeMatch) {
      errors.push({
        path,
        message: `Type mismatch: expected ${types.join(' | ')}, got ${typeof value}`,
        value,
        expected: types.join(' | ')
      });
      return errors;
    }

    // String validations
    if (types.includes(SchemaType.STRING) && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path,
          message: `String length ${value.length} < minimum ${schema.minLength}`,
          value,
          expected: `length >= ${schema.minLength}`
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path,
          message: `String length ${value.length} > maximum ${schema.maxLength}`,
          value,
          expected: `length <= ${schema.maxLength}`
        });
      }
      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push({
          path,
          message: `String does not match required pattern`,
          value,
          expected: `pattern: ${schema.pattern.toString()}`
        });
      }
    }

    // Number validations
    if (types.includes(SchemaType.NUMBER) && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path,
          message: `Number ${value} < minimum ${schema.minimum}`,
          value,
          expected: `>= ${schema.minimum}`
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path,
          message: `Number ${value} > maximum ${schema.maximum}`,
          value,
          expected: `<= ${schema.maximum}`
        });
      }
    }

    // Array validations
    if (types.includes(SchemaType.ARRAY) && Array.isArray(value)) {
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          const itemErrors = this.validateField(value[i], schema.items!, `${path}[${i}]`);
          errors.push(...itemErrors);
        }
      }
    }

    // Object validations
    if (types.includes(SchemaType.OBJECT) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (schema.properties) {
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          const propErrors = this.validateField(value[prop], propSchema, `${path}.${prop}`);
          errors.push(...propErrors);
        }
      }
    }

    return errors;
  }

  /**
   * Check if value matches the schema type
   */
  private checkType(value: any, type: SchemaType): boolean {
    switch (type) {
      case SchemaType.STRING:
        return typeof value === 'string';
      case SchemaType.NUMBER:
        return typeof value === 'number' && !isNaN(value);
      case SchemaType.BOOLEAN:
        return typeof value === 'boolean';
      case SchemaType.ARRAY:
        return Array.isArray(value);
      case SchemaType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case SchemaType.NULL:
        return value === null || value === undefined;
      case SchemaType.ANY:
        return true;
      default:
        return true;
    }
  }

  /**
   * Check if enum includes value (handles NaN correctly)
   */
  private enumIncludes(enumArray: any[], value: any): boolean {
    return enumArray.some(item => {
      if (typeof value === 'number' && isNaN(value)) {
        return typeof item === 'number' && isNaN(item);
      }
      return item === value;
    });
  }

  /**
   * Create a human-readable error message
   */
  formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    return errors.map(e => `  - ${e.path}: ${e.message}`).join('\n');
  }

  /**
   * Convert schema to JSON Schema format
   */
  toJsonSchema(functionSchema: FunctionSchema): Record<string, any> {
    const jsonSchema: Record<string, any> = {};

    if (functionSchema.input) {
      jsonSchema.type = 'object';
      jsonSchema.properties = this.propertiesToJsonSchema(functionSchema.input);
      if (functionSchema.inputRequired && functionSchema.inputRequired.length > 0) {
        jsonSchema.required = functionSchema.inputRequired;
      }
    }

    return jsonSchema;
  }

  /**
   * Convert property schemas to JSON Schema format
   */
  private propertiesToJsonSchema(properties: Record<string, PropertySchema>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, prop] of Object.entries(properties)) {
      result[name] = this.propertyToJsonSchema(prop);
    }

    return result;
  }

  /**
   * Convert single property schema to JSON Schema format
   */
  private propertyToJsonSchema(prop: PropertySchema): Record<string, any> {
    const result: Record<string, any> = {};

    // Handle type union (array of types)
    if (Array.isArray(prop.type)) {
      const types = prop.type.map(t => this.schemaTypeToJsonType(t));
      result.type = types.length === 1 ? types[0] : types;
    } else {
      result.type = this.schemaTypeToJsonType(prop.type);
    }

    if (prop.description) result.description = prop.description;
    if (prop.minLength !== undefined) result.minLength = prop.minLength;
    if (prop.maxLength !== undefined) result.maxLength = prop.maxLength;
    if (prop.minimum !== undefined) result.minimum = prop.minimum;
    if (prop.maximum !== undefined) result.maximum = prop.maximum;
    if (prop.pattern) result.pattern = prop.pattern.toString();
    if (prop.enum) result.enum = prop.enum;
    if (prop.default !== undefined) result.default = prop.default;
    if (prop.properties) {
      result.properties = this.propertiesToJsonSchema(prop.properties);
    }
    if (prop.items) {
      result.items = this.propertyToJsonSchema(prop.items);
    }

    return result;
  }

  /**
   * Convert SchemaType to JSON Schema type string
   */
  private schemaTypeToJsonType(type: SchemaType): string | string[] {
    switch (type) {
      case SchemaType.STRING:
        return 'string';
      case SchemaType.NUMBER:
        return 'number';
      case SchemaType.BOOLEAN:
        return 'boolean';
      case SchemaType.ARRAY:
        return 'array';
      case SchemaType.OBJECT:
        return 'object';
      case SchemaType.NULL:
        return 'null';
      case SchemaType.ANY:
        return [];
      default:
        return 'string';
    }
  }
}

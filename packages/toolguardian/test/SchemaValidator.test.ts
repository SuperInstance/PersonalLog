/**
 * Tests for SchemaValidator
 */

import { describe, it, expect } from 'vitest';
import { SchemaValidator, SchemaType } from '../src/index.js';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  describe('validate() - input validation', () => {
    it('should validate valid string input', () => {
      const schema = {
        input: {
          name: { type: SchemaType.STRING }
        }
      };

      const errors = validator.validate({ name: 'Alice' }, schema);
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required field', () => {
      const schema = {
        input: {
          name: { type: SchemaType.STRING }
        }
      };

      const errors = validator.validate({}, schema);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toContain('required');
    });

    it('should validate string constraints', () => {
      const schema = {
        input: {
          name: {
            type: SchemaType.STRING,
            minLength: 3,
            maxLength: 10
          }
        }
      };

      // Too short
      let errors = validator.validate({ name: 'ab' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Too long
      errors = validator.validate({ name: 'abcdefghijk' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Just right
      errors = validator.validate({ name: 'Alice' }, schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate string pattern', () => {
      const schema = {
        input: {
          email: {
            type: SchemaType.STRING,
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$'
          }
        }
      };

      const errors = validator.validate({ email: 'invalid' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      const validErrors = validator.validate({ email: 'test@example.com' }, schema);
      expect(validErrors).toHaveLength(0);
    });

    it('should validate enum values', () => {
      const schema = {
        input: {
          status: {
            type: SchemaType.STRING,
            enum: ['pending', 'approved', 'rejected']
          }
        }
      };

      const errors = validator.validate({ status: 'unknown' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      const validErrors = validator.validate({ status: 'approved' }, schema);
      expect(validErrors).toHaveLength(0);
    });

    it('should validate number type', () => {
      const schema = {
        input: {
          age: { type: SchemaType.NUMBER }
        }
      };

      const errors = validator.validate({ age: 'not a number' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      const validErrors = validator.validate({ age: 25 }, schema);
      expect(validErrors).toHaveLength(0);
    });

    it('should validate number constraints', () => {
      const schema = {
        input: {
          age: {
            type: SchemaType.NUMBER,
            minimum: 18,
            maximum: 100
          }
        }
      };

      // Too small
      let errors = validator.validate({ age: 15 }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Too large
      errors = validator.validate({ age: 105 }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Just right
      errors = validator.validate({ age: 25 }, schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate boolean type', () => {
      const schema = {
        input: {
          active: { type: SchemaType.BOOLEAN }
        }
      };

      const errors = validator.validate({ active: 'true' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      const validErrors = validator.validate({ active: true }, schema);
      expect(validErrors).toHaveLength(0);
    });

    it('should validate array type', () => {
      const schema = {
        input: {
          items: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING }
          }
        }
      };

      const errors = validator.validate({ items: 'not an array' }, schema);
      expect(errors.length).toBeGreaterThan(0);

      const validErrors = validator.validate({ items: ['a', 'b', 'c'] }, schema);
      expect(validErrors).toHaveLength(0);
    });

    it('should validate array constraints', () => {
      const schema = {
        input: {
          items: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            minItems: 1,
            maxItems: 5
          }
        }
      };

      // Empty array
      let errors = validator.validate({ items: [] }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Too many items
      errors = validator.validate({ items: ['a', 'b', 'c', 'd', 'e', 'f'] }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Just right
      errors = validator.validate({ items: ['a', 'b'] }, schema);
      expect(errors).toHaveLength(0);
    });

    it('should validate object type', () => {
      const schema = {
        input: {
          user: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              age: { type: SchemaType.NUMBER }
            },
            required: ['name']
          }
        }
      };

      // Missing required property
      let errors = validator.validate({ user: { age: 25 } }, schema);
      expect(errors.length).toBeGreaterThan(0);

      // Valid
      errors = validator.validate({ user: { name: 'Alice', age: 25 } }, schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateOutput() - output validation', () => {
    it('should validate valid output', () => {
      const schema = {
        output: {
          result: { type: SchemaType.STRING }
        }
      };

      const errors = validator.validateOutput({ result: 'success' }, schema);
      expect(errors).toHaveLength(0);
    });

    it('should detect invalid output', () => {
      const schema = {
        output: {
          result: { type: SchemaType.NUMBER }
        }
      };

      const errors = validator.validateOutput({ result: 'not a number' }, schema);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow null for optional output fields', () => {
      const schema = {
        output: {
          result: { type: SchemaType.STRING },
          metadata: { type: SchemaType.OBJECT }
        }
      };

      const errors = validator.validateOutput({ result: 'success', metadata: null }, schema);
      expect(errors).toHaveLength(0);
    });
  });

  describe('formatErrors()', () => {
    it('should format validation errors', () => {
      const errors = [
        { field: 'name', message: 'Required field', value: undefined },
        { field: 'age', message: 'Must be a number', value: 'twenty-five' }
      ];

      const formatted = validator.formatErrors(errors);
      expect(formatted).toContain('name');
      expect(formatted).toContain('age');
    });
  });

  describe('toJsonSchema()', () => {
    it('should convert schema to JSON Schema format', () => {
      const schema = {
        input: {
          name: { type: SchemaType.STRING, minLength: 1, maxLength: 100 },
          age: { type: SchemaType.NUMBER, minimum: 0, maximum: 150 },
          email: { type: SchemaType.STRING, pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.\\w+$' }
        }
      };

      const jsonSchema = validator.toJsonSchema(schema);

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
      expect(jsonSchema.properties.name).toBeDefined();
      expect(jsonSchema.properties.name.type).toBe('string');
      expect(jsonSchema.properties.name.minLength).toBe(1);
      expect(jsonSchema.properties.age.type).toBe('number');
      expect(jsonSchema.properties.age.minimum).toBe(0);
    });

    it('should include required fields in JSON Schema', () => {
      const schema = {
        input: {
          name: { type: SchemaType.STRING },
          email: { type: SchemaType.STRING, optional: true }
        }
      };

      const jsonSchema = validator.toJsonSchema(schema);

      expect(jsonSchema.required).toEqual(['name']);
      expect(jsonSchema.required).not.toContain('email');
    });
  });
});

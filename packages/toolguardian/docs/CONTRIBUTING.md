# Contributing to ToolGuardian

Thank you for your interest in contributing to ToolGuardian! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation Standards](#documentation-standards)
7. [Submitting Changes](#submitting-changes)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm, pnpm, or yarn
- Git

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/SuperInstance/ToolGuardian.git
cd ToolGuardian

# Install dependencies
npm install
# or
pnpm install
# or
yarn install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
toolguardian/
├── src/
│   ├── core/           # Core functionality
│   ├── validation/     # Schema validation
│   ├── retry/          # Retry logic
│   ├── sandbox/        # Execution sandbox
│   ├── monitoring/     # Metrics and monitoring
│   ├── types.ts        # Type definitions
│   └── index.ts        # Main exports
├── test/               # Test files
├── examples/           # Usage examples
├── docs/               # Documentation
└── package.json
```

## Development Workflow

### 1. Create a Branch

Create a descriptive branch for your work:

```bash
git checkout -b feat/add-custom-parser
git checkout -b fix/validation-edge-case
git checkout -b docs/update-readme
```

Branch naming conventions:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test changes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

### 4. Commit Changes

Write clear, descriptive commit messages:

```
feat: add custom intent parser interface

Implement the IntentParser interface to allow users to
provide their own natural language parsing logic.

Closes #123
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation change
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance

### 5. Create Pull Request

- Push your branch to GitHub
- Create a pull request with a clear description
- Link related issues
- Request review from maintainers

## Coding Standards

### TypeScript Guidelines

- Use strict TypeScript settings
- Avoid `any` types when possible
- Use proper type annotations
- Export types for public APIs

```typescript
// Good
interface ToolOptions {
  timeout: number;
  retries?: number;
}

async function executeTool(options: ToolOptions): Promise<Result> {
  // ...
}

// Bad
async function executeTool(options: any): Promise<any> {
  // ...
}
```

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use trailing commas in multi-line arrays/objects

```typescript
// Good
const config = {
  timeout: 5000,
  retries: 3,
  enableLogging: true,
};

// Bad
const config = {timeout: 5000, retries:3, enableLogging:true}
```

### Naming Conventions

- **Classes**: PascalCase (e.g., `ToolGuardian`)
- **Functions/Methods**: camelCase (e.g., `executeTool`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix avoided (e.g., `ToolOptions`, not `IToolOptions`)
- **Types**: PascalCase (e.g., `ExecutionResult`)

### Comments and Documentation

- Use JSDoc comments for public APIs
- Comment complex logic
- Keep comments up to date

```typescript
/**
 * Execute a tool with the given parameters.
 *
 * @param toolName - The name of the tool to execute
 * @param parameters - Input parameters for the tool
 * @param options - Execution options
 * @returns Promise resolving to execution result
 *
 * @example
 * ```typescript
 * const result = await guardian.execute('calculate', {
 *   a: 10,
 *   b: 5,
 *   operation: 'add'
 * });
 * ```
 */
async execute(
  toolName: string,
  parameters: Record<string, any>,
  options?: ExecutionOptions
): Promise<ExecutionResult> {
  // Implementation
}
```

### Error Handling

- Throw descriptive errors
- Include relevant context in error messages
- Use custom error types when appropriate

```typescript
// Good
if (!toolName) {
  throw new Error('Tool name is required');
}

if (!(toolName in this.tools)) {
  throw new Error(`Tool '${toolName}' not found`);
}

// Bad
throw new Error('Error');
```

## Testing Guidelines

### Test Structure

Place tests in the `test/` directory mirroring the source structure:

```
test/
├── core/
│   └── ToolGuardian.test.ts
├── validation/
│   └── SchemaValidator.test.ts
└── retry/
    └── RetryManager.test.ts
```

### Writing Tests

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test both success and failure cases
- Mock external dependencies

```typescript
describe('SchemaValidator', () => {
  describe('validate', () => {
    it('should pass validation for valid input', () => {
      // Arrange
      const validator = new SchemaValidator();
      const input = { name: 'test' };
      const schema = {
        input: {
          name: { type: SchemaType.STRING }
        }
      };

      // Act
      const errors = validator.validate(input, schema);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required field', () => {
      // Arrange
      const validator = new SchemaValidator();
      const input = {};
      const schema = {
        input: {
          name: { type: SchemaType.STRING, required: true }
        }
      };

      // Act
      const errors = validator.validate(input, schema);

      // Assert
      expect(errors).toHaveLength(1);
      expect(errors[0].path).toBe('name');
    });
  });
});
```

### Test Coverage

- Aim for >80% code coverage
- Cover edge cases
- Test error conditions
- Include integration tests for complex flows

## Documentation Standards

### Code Documentation

- Document all public APIs
- Include examples for complex usage
- Document parameters and return types

### Example Documentation

- Add examples for new features
- Use realistic scenarios
- Include expected output

### README Updates

When adding features:
- Update the features list
- Add usage examples
- Update API reference if needed

### Documentation Files

When making significant changes:
- Update relevant docs in `docs/`
- Update type definitions in API.md
- Add examples to `examples/`

## Submitting Changes

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] PR description explains changes
- [ ] Related issues are linked

### Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe tests added/updated.

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No new warnings generated

## Related Issues
Closes #123
```

### Review Process

1. Automated checks must pass
2. At least one maintainer approval required
3. Address review feedback
4. Squash commits if requested
5. Merge when approved

## Getting Help

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues and discussions first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to ToolGuardian!

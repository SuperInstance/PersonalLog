# Contributing to NeuralStream

Thank you for your interest in contributing to NeuralStream! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Git
- A WebGPU-compatible browser (Chrome 113+, Edge 113+)

### Setup

1. Fork the repository
2. Clone your fork
```bash
git clone https://github.com/your-username/neuralstream.git
cd neuralstream
```

3. Install dependencies
```bash
npm install
```

4. Build the project
```bash
npm run build
```

5. Run tests
```bash
npm test
```

## 📋 Development Workflow

### Making Changes

1. Create a new branch
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
```bash
npm test
npm run type-check
```

5. Commit your changes
```bash
git commit -m "feat: add your feature"
```

6. Push to your fork
```bash
git push origin feature/your-feature-name
```

7. Create a pull request

### Commit Messages

Follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

Example:
```
feat: add support for multi-GPU inference

Implement distributed inference across multiple GPUs for faster
processing of large models.

- Add MultiGPUDeviceManager
- Implement tensor sharding
- Add load balancing

Closes #123
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for all new functionality
- Aim for 80%+ code coverage
- Test edge cases and error conditions
- Mock WebGPU for unit tests

Example:
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

## 📝 Documentation

### Code Comments

- Document complex algorithms
- Explain WebGPU operations
- Add JSDoc comments for public APIs

Example:
```typescript
/**
 * Generates tokens from a prompt using WebGPU acceleration
 *
 * @param prompt - Input text prompt
 * @param maxTokens - Maximum tokens to generate
 * @returns Async iterator of token results
 *
 * @example
 * ```typescript
 * for await (const token of stream.generate("Hello")) {
 *   console.log(token.token);
 * }
 * ```
 */
async *generate(prompt: string, maxTokens?: number): AsyncIterator<TokenResult> {
  // Implementation
}
```

### Documentation Updates

- Update README for user-facing changes
- Add examples for new features
- Update API documentation
- Document breaking changes

## 🎨 Code Style

### TypeScript

- Use strict TypeScript settings
- Prefer explicit types
- Use interfaces for public APIs
- Use type aliases for unions

### Naming Conventions

- **Classes:** PascalCase (e.g., `NeuralStream`)
- **Functions/Methods:** camelCase (e.g., `generateToken`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_TOKENS`)
- **Private members:** Prefix with `_` (e.g., `_privateMethod`)

### Formatting

We use Prettier for code formatting:

```bash
npm run format
```

## 🐛 Bug Reports

### Before Creating a Bug Report

- Check existing issues
- Ensure it's not a duplicate
- Gather necessary information

### Bug Report Template

```markdown
**Description**
A clear description of the bug

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- Browser: [e.g. Chrome 113]
- OS: [e.g. Windows 11]
- GPU: [e.g. RTX 3060]
- NeuralStream Version: [e.g. 0.1.0]

**Additional Context**
Logs, screenshots, etc.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Description**
A clear description of the feature

**Use Case**
Why do you need this feature? What problem does it solve?

**Proposed Solution**
How should this feature work?

**Alternatives**
What alternative solutions have you considered?

**Additional Context**
Any other relevant information
```

## 🤝 Pull Request Guidelines

### Before Submitting

- Ensure your code passes all tests
- Add/update documentation
- Update CHANGELOG.md
- Follow commit message conventions

### Pull Request Template

```markdown
**Description**
Brief description of changes

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Tests added/updated
- [ ] All tests pass

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Added tests for changes
- [ ] All tests pass
```

## 🌳 Project Structure

```
neuralstream/
├── src/
│   ├── core/           # Core inference engine
│   ├── shaders/        # WebGPU compute shaders
│   ├── workers/        # Web workers
│   ├── utils/          # Utility functions
│   ├── types/          # Type definitions
│   └── optimization/   # Optimization algorithms
├── examples/           # Usage examples
├── tests/              # Test files
└── docs/               # Documentation
```

## 🎯 Areas to Contribute

### High Priority

- Performance optimization
- Bug fixes
- Test coverage
- Documentation improvements

### Medium Priority

- Additional model support
- New inference strategies
- Browser compatibility
- Mobile support

### Low Priority

- UI components
- Examples
- Tooling

## 📞 Getting Help

- **Discussions:** GitHub Discussions for questions
- **Issues:** GitHub Issues for bugs
- **Discord:** Community Discord (coming soon)

## 📜 Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something great.

## 🦶 First-time Contributors

We love first-time contributors! Look for issues labeled `good first issue` to get started.

## ⭐ Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured on our website

---

Thank you for contributing to NeuralStream! 🎉

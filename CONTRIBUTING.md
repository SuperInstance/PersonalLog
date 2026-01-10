# Contributing to PersonalLog

Thank you for your interest in contributing to PersonalLog! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Contribution Guidelines](#contribution-guidelines)
4. [Development Workflow](#development-workflow)
5. [Pull Request Process](#pull-request-process)
6. [Coding Standards](#coding-standards)
7. [Testing Guidelines](#testing-guidelines)
8. [Documentation](#documentation)
9. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, constructive, and collaborative in all interactions.

### Standards

- **Be Respectful**: Value different viewpoints and experiences
- **Be Constructive**: Focus on what is best for the community
- **Be Collaborative**: Work together to achieve shared goals
- **Be Inclusive**: Welcome and support newcomers

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or insulting comments
- Public or private harassment
- Publishing others' private information
- Other unethical or unprofessional conduct

### Reporting

If you witness or experience unacceptable behavior, please contact the project maintainers through GitHub's reporting mechanism.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **pnpm 8+** (recommended) or npm
- **Git** for version control
- **GitHub account** for contributions
- **Rust toolchain** (optional, for WASM development)

### First-Time Setup

```bash
# 1. Fork the repository
# Click "Fork" on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/PersonalLog.git
cd PersonalLog

# 3. Add upstream remote
git remote add upstream https://github.com/SuperInstance/PersonalLog.git

# 4. Install dependencies
pnpm install

# 5. Copy environment file
cp .env.example .env.local

# 6. Start development server
pnpm dev
```

### Development Environment

**Recommended Tools:**
- **VS Code**: Popular, great TypeScript support
- **ESLint**: Linting
- **Prettier**: Code formatting
- **GitLens**: Git integration

**VS Code Extensions:**
```
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Error Lens
- GitLens
```

---

## Contribution Guidelines

### What to Contribute

We welcome contributions in many areas:

**Code:**
- Bug fixes
- New features
- Performance improvements
- Refactoring

**Documentation:**
- Documentation improvements
- Tutorial creation
- Example code
- Translation

**Testing:**
- Unit tests
- Integration tests
- E2E tests
- Performance tests

**Design:**
- UI/UX improvements
- Accessibility enhancements
- Visual design

**Infrastructure:**
- Build improvements
- CI/CD enhancements
- Tooling upgrades

### What NOT to Contribute

- Features that don't align with project goals
- Breaking changes without discussion
- Code without tests
- Changes that reduce accessibility
- Features that compromise privacy

### Finding Good First Issues

Look for issues labeled:
- `good first issue`: Good for newcomers
- `help wanted`: Community contributions welcome
- `documentation`: Documentation improvements
- `beginner`: Suitable for beginners

---

## Development Workflow

### 1. Choose an Issue

1. Browse [open issues](https://github.com/SuperInstance/PersonalLog/issues)
2. Find an issue you'd like to work on
3. Comment to let others know you're working on it
4. Ask questions if anything is unclear

### 2. Create a Branch

```bash
# Ensure your main is up to date
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fix
git checkout -b fix/issue-number
```

**Branch Naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `test/` - Tests
- `refactor/` - Refactoring

### 3. Make Changes

**Development:**
```bash
# Start dev server
pnpm dev

# Run tests in another terminal
pnpm test:watch

# Check types
pnpm type-check

# Lint code
pnpm lint
```

**Best Practices:**
- Write code following standards (see below)
- Add tests for new functionality
- Update documentation
- Keep changes focused and atomic
- Commit frequently with clear messages

### 4. Commit Changes

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/process/tooling

**Examples:**
```
feat(ai): add support for Claude 3 models

Implement support for Anthropic's Claude 3 models including:
- Haiku (fast)
- Sonnet (balanced)
- Opus (powerful)

Closes #123

fix(storage): resolve race condition in cache

Fix race condition where concurrent cache reads could
cause stale data to be returned. Added proper locking
mechanism.

Fixes #456
```

**Commit Guidelines:**
- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- Limit first line to 72 characters
- Reference issues in footer

### 5. Push Changes

```bash
# Push to your fork
git push origin feature/your-feature-name
```

### 6. Create Pull Request

See [Pull Request Process](#pull-request-process) below.

---

## Pull Request Process

### Before Submitting

**Checklist:**
- [ ] Code follows project standards
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commits are clean and follow convention
- [ ] Branch is up to date with main
- [ ] No merge conflicts
- [ ] Self-review completed

### Creating the PR

1. **Navigate to GitHub**: Your fork → Pull Requests → New Pull Request
2. **Select Branches**: Compare your branch to upstream/main
3. **Fill PR Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] E2E tests added/updated
   - [ ] All tests passing

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Added tests for changes
   - [ ] All tests passing

   ## Related Issues
   Fixes #123
   Related to #456
   ```

4. **Title Your PR**:
   - Use same format as commits: `type(scope): description`
   - Example: `feat(ai): add Claude 3 support`

### Review Process

**What Happens:**
1. **Automated Checks**:
   - TypeScript compilation
   - ESLint checks
   - Test suite
   - Build verification

2. **Code Review**:
   - Maintainer reviews your code
   - Requests changes if needed
   - Approves when ready

3. **Address Feedback**:
   - Make requested changes
   - Push updates to same branch
   - PR updates automatically

4. **Merge**:
   - Squash merge to main
   - Delete branch (optional)

**Response Time:**
- Maintainers aim to respond within 48 hours
- Complex PRs may take longer
- Ping after 3 days if no response

### After Merge

1. **Delete Branch**:
   ```bash
   git checkout main
   git pull upstream main
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Sync Your Fork**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

3. **Celebrate!** 🎉
   - Your contribution is now part of PersonalLog
   - You'll appear in contributors list
   - Consider tackling another issue!

---

## Coding Standards

### TypeScript

**Strict Mode:**
- All files must pass `tsc --noEmit`
- No implicit any
- Explicit return types on exports
- Strict null checks

**Example:**
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  const user = await storage.get<User>(id);
  if (!user) throw new Error('Not found');
  return user;
}

// ❌ Bad
async function getUser(id: any) {
  return storage.get(id);
}
```

### React

**Functional Components:**
- Use functional components with hooks
- No class components
- Props interface defined

**Example:**
```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ❌ Bad
export class Button extends Component {
  render() {
    return <button>{this.props.label}</button>;
  }
}
```

### Naming Conventions

**Files:**
- Components: PascalCase (`Button.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase (`User.ts`)
- Hooks: camelCase with `use` prefix (`useChat.ts`)

**Variables:**
- camelCase for variables and functions
- PascalCase for classes, interfaces, types
- UPPER_SNAKE_CASE for constants

**Example:**
```typescript
const userName = 'John';           // camelCase
class UserService {}               // PascalCase
interface UserData {}              // PascalCase
const MAX_RETRIES = 3;             // UPPER_SNAKE_CASE
```

### Code Organization

**Imports Order:**
1. React imports
2. Third-party imports
3. Internal imports
4. Type imports
5. Relative imports

```typescript
// ✅ Good
import { useState } from 'react';
import { Button } from '@mui/material';
import { storage } from '@/lib/storage';
import type { User } from '@/types/user';
import { formatDate } from './utils';

// ❌ Bad - randomly ordered
import { formatDate } from './utils';
import { useState } from 'react';
import { storage } from '@/lib/storage';
```

### Comments

**When to Comment:**
- Complex algorithms
- Non-obvious decisions
- Workarounds for bugs
- Public API documentation

**When NOT to Comment:**
- Obvious code
- Redundant information
- Outdated comments (keep them updated!)

```typescript
// ✅ Good
// Using exponential backoff to avoid overwhelming the API
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

// ❌ Bad
// Set delay to 1000
const delay = 1000;  // Obviously!
```

---

## Testing Guidelines

### Test Coverage

**Target Coverage:**
- **Overall**: >80%
- **Critical Paths**: >90%
- **New Code**: 100%

### Unit Tests

**What to Test:**
- Pure functions
- Utility functions
- Business logic
- Data transformations

**Example:**
```typescript
describe('cosineSimilarity', () => {
  it('calculates similarity for identical vectors', () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0);
  });

  it('calculates similarity for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });
});
```

### Integration Tests

**What to Test:**
- API endpoints
- Storage operations
- AI provider integration
- Component interactions

**Example:**
```typescript
describe('POST /api/chat', () => {
  it('responds with AI message', async () => {
    const response = await POST({
      json: () => ({ message: 'Hello', conversationId: '123' }),
    } as Request);

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('content');
  });
});
```

### E2E Tests

**What to Test:**
- User workflows
- Critical paths
- Cross-feature interactions

**Example:**
```typescript
test('user can send a message', async ({ page }) => {
  await page.goto('/messenger');
  await page.fill('[data-testid="message-input"]', 'Hello AI');
  await page.click('[data-testid="send-button"]');
  await expect(page.locator('[data-testid="message-response"]')).toBeVisible();
});
```

### Running Tests

```bash
# Unit tests
pnpm test:unit

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# All tests
pnpm test:all
```

---

## Documentation

### What to Document

- New features
- API changes
- Configuration options
- Breaking changes
- Deprecations

### Where to Document

**Code:**
- JSDoc comments for public APIs
- Inline comments for complex logic
- Type definitions for interfaces

**Docs:**
- `/docs/`: Detailed guides
- `README.md`: Overview and quick start
- Inline in code: Examples and usage

### Documentation Style

**JSDoc Example:**
```typescript
/**
 * Sends a message to the AI provider.
 *
 * @param message - The message content to send
 * @param conversationId - The conversation identifier
 * @returns Promise resolving to the AI response
 * @throws {Error} If API call fails
 *
 * @example
 * ```ts
 * const response = await sendMessage('Hello', 'conv-123');
 * console.log(response.content);
 * ```
 */
async function sendMessage(
  message: string,
  conversationId: string
): Promise<AIResponse> {
  // Implementation
}
```

---

## Community

### Getting Help

**Resources:**
- [Documentation](./docs/)
- [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
- [GitHub Discussions](https://github.com/SuperInstance/PersonalLog/discussions)

**Asking Questions:**
1. Search existing issues and discussions first
2. Create a new discussion (not issue) for questions
3. Provide context and code examples
4. Be patient and respectful

### Sharing Ideas

**Feature Requests:**
- Use GitHub issues with `enhancement` label
- Describe the problem you're solving
- Explain why it's important
- Suggest potential solutions

**Design Proposals:**
- Create a discussion first
- Get feedback from maintainers
- Create issue with `proposal` label
- Include mockups if applicable

### Recognition

**Contributors:**
All contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- GitHub contributors page

**Notable Contributions:**
- Highlighted in project announcements
- Featured in showcases (with permission)

---

## Additional Guidelines

### Accessibility

**WCAG 2.1 AA Compliance:**
- All new features must be accessible
- Use semantic HTML
- Provide keyboard navigation
- Include ARIA labels where needed
- Test with screen readers

### Performance

**Guidelines:**
- Avoid unnecessary re-renders
- Use memoization appropriately
- Code split large components
- Optimize images and assets
- Test on low-end devices

### Security

**Best Practices:**
- Never commit secrets
- Validate all inputs
- Sanitize user content
- Use Content Security Policy
- Follow OWASP guidelines

### Internationalization

**Considerations:**
- Use locale-aware formatting
- Avoid hard-coded text
- Consider RTL languages
- Test with various locales

---

## License

By contributing to PersonalLog, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

## Questions?

If you have questions about contributing:

1. Check existing [documentation](./docs/)
2. Search [GitHub Issues](https://github.com/SuperInstance/PersonalLog/issues)
3. Start a [GitHub Discussion](https://github.com/SuperInstance/PersonalLog/discussions)
4. Contact maintainers through issue comments

---

Thank you for contributing to PersonalLog! Your contributions make this project better for everyone.

---

*Last Updated: 2026-01-10*

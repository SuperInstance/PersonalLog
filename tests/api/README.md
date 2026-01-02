# API Tests Quick Reference

## Test Overview

This directory contains comprehensive integration tests for all PersonalLog API endpoints. All tests use Vitest and follow Next.js API route testing best practices.

## Test Structure

```
src/app/api/
├── chat/__tests__/route.test.ts (24 tests)
├── conversations/__tests__/route.test.ts (21 tests)
├── conversations/[id]/messages/__tests__/route.test.ts (23 tests)
├── knowledge/__tests__/route.test.ts (26 tests)
├── models/__tests__/route.test.ts (31 tests)
├── modules/__tests__/route.test.ts (6 tests)
├── modules/load/__tests__/route.test.ts (11 tests)
└── modules/unload/__tests__/route.test.ts (11 tests)

src/__tests__/helpers/
└── api-helpers.ts (reusable test utilities)
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run All API Tests
```bash
npm run test:unit
```

### 3. Run Tests in Watch Mode
```bash
npm run test:watch
```

### 4. Run with Coverage Report
```bash
npm run test:coverage
```

### 5. Run Specific Test File
```bash
npx vitest run src/app/api/chat/__tests__/route.test.ts
```

### 6. Run Tests with UI
```bash
npm run test:ui
```

## Test Categories

### By Endpoint

| Endpoint | Method | Tests | File |
|----------|--------|-------|------|
| /api/chat | POST | 24 | chat/__tests__/route.test.ts |
| /api/conversations | GET, POST, DELETE | 21 | conversations/__tests__/route.test.ts |
| /api/conversations/[id]/messages | GET, POST, PATCH, DELETE | 23 | conversations/[id]/messages/__tests__/route.test.ts |
| /api/knowledge | GET, POST, DELETE | 26 | knowledge/__tests__/route.test.ts |
| /api/models | GET, POST, PATCH, DELETE | 31 | models/__tests__/route.test.ts |
| /api/modules | GET | 6 | modules/__tests__/route.test.ts |
| /api/modules/load | POST | 11 | modules/load/__tests__/route.test.ts |
| /api/modules/unload | POST | 11 | modules/unload/__tests__/route.test.ts |

### By Test Type

- **Happy Path Tests**: 60+ tests covering successful operations
- **Error Handling**: 50+ tests covering error scenarios
- **Validation Tests**: 40+ tests covering input validation
- **Edge Cases**: 30+ tests covering boundary conditions
- **Integration Workflows**: 10+ tests covering multi-step operations
- **CORS/Security**: 5+ tests covering headers and security

## Using Test Helpers

The `api-helpers.ts` file provides reusable utilities:

```typescript
import {
  createMockRequest,
  createMockGETRequest,
  createMockDELETERequest,
  extractResponseData,
  assertSuccess,
  assertError,
  createMockConversation,
  createMockMessage,
} from '@/__tests__/helpers/api-helpers'

// Create mock requests
const request = createMockRequest({
  body: { message: 'Hello' },
})

// Validate responses
const response = await POST(request)
assertSuccess(response)
const data = await extractResponseData(response)

// Create test data
const mockConversation = createMockConversation({ title: 'Test' })
const mockMessage = createMockMessage({ text: 'Hello' })
```

## Common Test Patterns

### 1. Testing Success Cases
```typescript
it('should handle successful request', async () => {
  const request = createMockRequest({ body: { ... } })
  const response = await POST(request)

  assertSuccess(response)
  const data = await extractResponseData(response)
  expect(data).toHaveProperty('success', true)
})
```

### 2. Testing Error Cases
```typescript
it('should handle errors gracefully', async () => {
  const request = createMockRequest({ body: { ... } })
  const response = await POST(request)

  assertError(response, 400)
  const data = await extractResponseData<{ error: string }>(response)
  expect(data.error).toContain('expected error message')
})
```

### 3. Testing Validation
```typescript
it('should validate required parameters', async () => {
  const request = createMockRequest({ body: {} })
  const response = await POST(request)

  assertError(response, 400)
})
```

### 4. Testing Integration Workflows
```typescript
it('should handle create then update workflow', async () => {
  // Create
  const createRequest = createMockRequest({ body: { ... } })
  const createResponse = await POST(createRequest)
  assertSuccess(createResponse)

  // Update
  const updateRequest = createMockRequest({ body: { ... } })
  const updateResponse = await PATCH(updateRequest)
  assertSuccess(updateResponse)
})
```

## Test Files Overview

### Chat API Tests (24 tests)
- Non-streaming chat (OpenAI, Anthropic, Local)
- Streaming responses
- Provider availability
- Error handling
- CORS support

### Conversations API Tests (21 tests)
- List conversations (with filters)
- Create conversations
- Delete conversations
- Error handling
- Integration workflows

### Messages API Tests (23 tests)
- Get messages for conversation
- Add messages (user, AI, system)
- Update messages
- Delete messages
- Dynamic route parameters
- Error handling

### Knowledge API Tests (26 tests)
- Hybrid search
- List entries and checkpoints
- Sync operations
- Create/rollback checkpoints
- Export for LoRA training
- CRUD operations

### Models API Tests (31 tests)
- List models and contacts
- Create models and contacts
- Update models and contacts
- Delete models and contacts
- Type-based routing
- Filter by provider/base model

### Modules API Tests (28 tests total)
- List modules (6 tests)
- Load modules (11 tests)
- Unload modules (11 tests)
- Status transitions
- Resource management
- Error handling

## Debugging Tests

### Run Tests in Debug Mode
```bash
npx vitest debug src/app/api/chat/__tests__/route.test.ts
```

### Run Single Test
Add `.only` to the test:
```typescript
it.only('should do something', async () => {
  // ...
})
```

### Skip Tests
Add `.skip` to the test:
```typescript
it.skip('should do something', async () => {
  // ...
})
```

### View Detailed Output
```bash
npx vitest run --reporter=verbose
```

## Coverage Goals

- **Line Coverage**: 90%+
- **Branch Coverage**: 85%+
- **Function Coverage**: 95%+
- **Statement Coverage**: 90%+

## Troubleshooting

### "Cannot find module 'vitest/config'"
**Solution**: Install dependencies
```bash
npm install
```

### Tests timeout
**Solution**: Increase timeout in vitest.config.ts
```typescript
test: {
  testTimeout: 10000,
}
```

### Mock not working
**Solution**: Ensure mocks are declared before imports
```typescript
vi.mock('@/lib/module', () => ({ ... }))

import { something } from '@/lib/module'
```

## Best Practices

1. **Use test helpers** - Don't duplicate mock creation code
2. **Clear mocks** - Use `beforeEach(() => vi.clearAllMocks())`
3. **Descriptive names** - Test names should describe what is being tested
4. **One assertion per test** - Keep tests focused
5. **Test error paths** - Don't just test success cases
6. **Mock external deps** - Never call real APIs in tests
7. **Test edge cases** - Empty arrays, null values, missing params
8. **Integration tests** - Test multi-step workflows

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Full Test Coverage Summary](./TEST_COVERAGE_SUMMARY.md)

## Support

For issues or questions about API tests, refer to:
- Main test summary: `tests/api/TEST_COVERAGE_SUMMARY.md`
- Project README: `README.md`
- Phase 2 briefings: `.agents/phase-2/`

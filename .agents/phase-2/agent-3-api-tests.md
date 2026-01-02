# Agent 3 Briefing: API Testing Specialist

**Focus:** API route integration tests

---

## Your Mission

Add integration tests for all API routes to ensure backend functionality is verified.

---

## Analysis Phase (Do This First)

1. **List all API routes:**
   ```bash
   find /mnt/c/users/casey/PersonalLog/src/app/api -name "route.ts" -o -name "route.js"
   ```

2. **Read each route to understand:**
   - HTTP methods (GET, POST, PUT, DELETE)
   - Request body schema
   - Response format
   - Error handling
   - Authentication (if any)

3. **Review existing E2E patterns:**
   - `/mnt/c/users/casey/PersonalLog/tests/e2e/` for reference

---

## API Routes to Test

### Common Routes (likely exist)
- `/api/chat` - Chat completion
- `/api/conversations` - Conversation CRUD
- `/api/messages` - Message operations
- `/api/agents` - AI agent management

### For each route, test:
1. **Happy path** - Valid request succeeds
2. **Validation** - Invalid input rejected
3. **Errors** - Error responses are correct
4. **Edge cases** - Empty data, large payloads

---

## Implementation Tasks

### Task 1: Create API Test Infrastructure
**Create:** `src/app/api/__tests__/helpers.ts`

```typescript
import { createMocks } from 'node-mocks-http'

export async function makeRequest(url: string, options: {
  method?: string
  body?: any
  headers?: Record<string, string>
}) {
  const { req, res } = createMocks({
    method: options.method || 'GET',
    body: options.body,
    headers: options.headers,
  })

  // Import and call the route handler
  // Return response
}
```

### Task 2: Chat API Tests
**Create:** `src/app/api/chat/__tests__/route.test.ts`

Test:
- POST with valid message returns response
- POST with streaming works
- POST with missing fields returns 400
- POST with invalid API key handles gracefully
- Rate limiting (if implemented)

### Task 3: Conversations API Tests
**Create:** `src/app/api/conversations/__tests__/route.test.ts`

Test:
- GET returns list of conversations
- POST creates new conversation
- PUT updates conversation
- DELETE removes conversation
- 404 for non-existent conversation

### Task 4: Messages API Tests
**Create:** `src/app/api/messages/__tests__/route.test.ts`

Test:
- GET returns messages for conversation
- POST adds message to conversation
- Bulk operations
- Message validation

### Task 5: Agents API Tests
**Create:** `src/app/api/agents/__tests__/route.test.ts`

Test:
- GET returns list of agents
- GET by ID returns single agent
- POST creates agent (if supported)
- Validation of agent config

---

## Testing Guidelines

1. **Mock external services:**
   - OpenAI/Anthropic API calls
   - Database/storage operations
   - Hardware detection

2. **Use factory functions for test data:**
   - Import from `src/__tests__/factories.ts`

3. **Test response shapes:**
   - Verify status codes
   - Verify response body structure
   - Verify headers (Content-Type, etc.)

4. **Error testing:**
   - Malformed JSON
   - Missing required fields
   - Invalid data types
   - Service unavailability

---

## Example Test Pattern

```typescript
import { POST } from '../route'
import { createMockConversation } from '@/__tests__/factories'

describe('POST /api/conversations', () => {
  it('should create conversation with valid data', async () => {
    const request = new Request(createMockUrl(), {
      method: 'POST',
      body: JSON.stringify(createMockConversation()),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('id')
    expect(data.title).toBe('Test Conversation')
  })

  it('should return 400 for invalid data', async () => {
    const request = new Request(createMockUrl(), {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

---

## Output

Create a summary file: `/mnt/c/users/casey/PersonalLog/.agents/phase-2/agent-3-summary.md`

Include:
- Routes tested
- Test coverage per route
- Issues found in routes
- Recommendations

---

**Test thoroughly. APIs are the backbone of the application.**

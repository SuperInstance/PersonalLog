# PersonalLog API Reference

**Version:** 1.0.0
**Last Updated:** 2025-01-04
**Base URL:** `http://localhost:3000` (development) or your production URL

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Chat API](#1-chat-api)
   - [Conversations API](#2-conversations-api)
   - [Messages API](#3-messages-api)
   - [Models API](#4-models-api)
   - [Knowledge API](#5-knowledge-api)
   - [Modules API](#6-modules-api)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Examples](#examples)

---

## Overview

PersonalLog provides a RESTful API for AI conversations, knowledge management, and system operations. All API endpoints use standard HTTP methods and return JSON responses.

### Base URL Structure

```
{baseURL}/api/{resource}
```

### Response Format

All responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-04T10:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

---

## Authentication

PersonalLog uses **local-first architecture** with **no server-side authentication**. All API operations are performed on the client-side. The application runs entirely in the browser with no backend authentication required.

### Security Considerations

- API keys for AI providers are stored locally in the browser
- No user data is sent to external servers (except AI provider APIs)
- All data is stored in IndexedDB (local browser storage)
- Environment variables are used for server-side configuration

---

## API Endpoints

### 1. Chat API

Handles AI chat requests with streaming support.

#### POST `/api/chat`

Send a message to an AI contact and receive a streaming response.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "conversationId": "uuid",
  "contactId": "uuid",
  "model": "gpt-4",
  "provider": "openai",
  "stream": true
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | ✅ Yes | The user's message content |
| `conversationId` | string | ✅ Yes | UUID of the conversation |
| `contactId` | string | ✅ Yes | UUID of the AI contact |
| `model` | string | ✅ Yes | AI model to use (e.g., "gpt-4", "claude-3-opus") |
| `provider` | string | ✅ Yes | AI provider ID (e.g., "openai", "anthropic") |
| `stream` | boolean | ❌ No | Enable streaming response (default: true) |
| `context` | array | ❌ No | Additional context (knowledge entries, files) |
| `temperature` | number | ❌ No | Response randomness (0.0 - 1.0, default: 0.7) |
| `maxTokens` | number | ❌ No | Maximum tokens in response |

**Response (Streaming):**

Returns a **Server-Sent Events (SSE)** stream:

```
data: {"type":"token","content":"Hello","index":0}

data: {"type":"token","content":",","index":1}

data: {"type":"token","content":" how","index":2}

data: {"type":"done","reason":"stop"}

```

**Event Types:**

| Event Type | Description |
|------------|-------------|
| `token` | Single text token from AI |
| `done` | Stream completed |
| `error` | Error occurred |

**Response (Non-Streaming):**

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "role": "assistant",
      "content": "Hello! I'm doing well, thank you!",
      "timestamp": "2025-01-04T10:00:00.000Z",
      "model": "gpt-4",
      "provider": "openai"
    }
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing API key) |
| 429 | Rate limit exceeded |
| 500 | Server error |

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "conversationId": "123e4567-e89b-12d3-a456-426614174000",
    "contactId": "123e4567-e89b-12d3-a456-426614174001",
    "model": "gpt-4",
    "provider": "openai",
    "stream": false
  }'
```

**JavaScript Example:**

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello, how are you?',
    conversationId: 'uuid',
    contactId: 'uuid',
    model: 'gpt-4',
    provider: 'openai',
    stream: false
  })
})

const data = await response.json()
console.log(data.data.message.content)
```

---

### 2. Conversations API

Manage conversation threads.

#### GET `/api/conversations`

Get all conversations.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `archived` | boolean | No | Include archived conversations (default: false) |
| `limit` | number | No | Maximum results (default: 50) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Conversation Title",
      "contactId": "uuid",
      "createdAt": "2025-01-04T10:00:00.000Z",
      "updatedAt": "2025-01-04T10:00:00.000Z",
      "messageCount": 15,
      "archived": false
    }
  ],
  "meta": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

**JavaScript Example:**

```javascript
// Get all active conversations
const response = await fetch('/api/conversations')
const { data } = await response.json()
console.log(data) // Array of conversations

// Get archived conversations
const archived = await fetch('/api/conversations?archived=true')
const { data: archivedData } = await archived.json()
```

---

#### POST `/api/conversations`

Create a new conversation.

**Request Body:**

```json
{
  "title": "New Conversation",
  "contactId": "uuid"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ❌ No | Conversation title (auto-generated if not provided) |
| `contactId` | string | ✅ Yes | AI contact to use |
| `settings` | object | ❌ No | Conversation-specific settings |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "New Conversation",
    "contactId": "uuid",
    "createdAt": "2025-01-04T10:00:00.000Z",
    "settings": {}
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 201 | Conversation created |
| 400 | Bad request |
| 409 | Conflict (duplicate ID) |

---

#### GET `/api/conversations/[id]`

Get a single conversation by ID.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Conversation Title",
    "contactId": "uuid",
    "createdAt": "2025-01-04T10:00:00.000Z",
    "updatedAt": "2025-01-04T10:00:00.000Z",
    "messages": [
      {
        "id": "uuid",
        "role": "user",
        "content": "Hello!",
        "timestamp": "2025-01-04T10:00:00.000Z"
      }
    ]
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Conversation not found |

---

#### PUT `/api/conversations/[id]`

Update a conversation.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |

**Request Body:**

```json
{
  "title": "Updated Title",
  "archived": false,
  "settings": {
    "temperature": 0.8
  }
}
```

**Parameters:**

All fields are optional. Send only fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New conversation title |
| `archived` | boolean | Archive status |
| `settings` | object | Conversation settings |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "archived": false,
    "updatedAt": "2025-01-04T10:05:00.000Z"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Conversation not found |

---

#### DELETE `/api/conversations/[id]`

Delete a conversation.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "uuid"
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 200 | Success |
| 404 | Conversation not found |

---

### 3. Messages API

Manage messages within conversations.

#### GET `/api/conversations/[id]/messages`

Get all messages in a conversation.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `limit` | number | No | Maximum messages to return |
| `before` | string | No | Get messages before this timestamp |
| `after` | string | No | Get messages after this timestamp |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "conversationId": "uuid",
      "role": "user",
      "content": "Message content",
      "timestamp": "2025-01-04T10:00:00.000Z",
      "model": null,
      "provider": null
    },
    {
      "id": "uuid",
      "conversationId": "uuid",
      "role": "assistant",
      "content": "AI response",
      "timestamp": "2025-01-04T10:00:01.000Z",
      "model": "gpt-4",
      "provider": "openai"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

**JavaScript Example:**

```javascript
const response = await fetch('/api/conversations/uuid/messages')
const { data } = await response.json()
data.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`)
})
```

---

#### POST `/api/conversations/[id]/messages`

Add a new message to a conversation (without AI response).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |

**Request Body:**

```json
{
  "role": "user",
  "content": "Message content"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | ✅ Yes | "user", "assistant", or "system" |
| `content` | string | ✅ Yes | Message content |
| `metadata` | object | ❌ No | Additional metadata |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "role": "user",
    "content": "Message content",
    "timestamp": "2025-01-04T10:00:00.000Z",
    "metadata": {}
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 201 | Message created |
| 400 | Bad request |
| 404 | Conversation not found |

---

#### DELETE `/api/conversations/[id]/messages/[messageId]`

Delete a specific message.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Conversation UUID |
| `messageId` | string | Message UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "uuid"
  }
}
```

---

### 4. Models API

Get available AI models and providers.

#### GET `/api/models`

Get all available AI models.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `provider` | string | No | Filter by provider ID |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "gpt-4",
      "name": "GPT-4",
      "provider": "openai",
      "context": 8192,
      "capabilities": [
        "chat",
        "streaming"
      ],
      "pricing": {
        "input": 0.03,
        "output": 0.06
      }
    },
    {
      "id": "claude-3-opus-20240229",
      "name": "Claude 3 Opus",
      "provider": "anthropic",
      "context": 200000,
      "capabilities": [
        "chat",
        "streaming",
        "vision"
      ],
      "pricing": {
        "input": 0.015,
        "output": 0.075
      }
    }
  ]
}
```

**JavaScript Example:**

```javascript
// Get all models
const response = await fetch('/api/models')
const { data } = await response.json()

// Filter by provider
const openai = await fetch('/api/models?provider=openai')
const { data: openaiModels } = await openai.json()
```

---

### 5. Knowledge API

Manage the knowledge base.

#### GET `/api/knowledge`

Get all knowledge entries.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search query (semantic search) |
| `tags` | string | No | Comma-separated tag list |
| `limit` | number | No | Maximum results (default: 20) |
| `offset` | number | No | Pagination offset |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Knowledge Entry Title",
      "content": "Entry content",
      "tags": ["tag1", "tag2"],
      "embedding": [0.1, 0.2, ...],
      "createdAt": "2025-01-04T10:00:00.000Z",
      "updatedAt": "2025-01-04T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

**JavaScript Example:**

```javascript
// Semantic search
const results = await fetch('/api/knowledge?search=machine%20learning')
const { data } = await results.json()

// Filter by tags
const tagged = await fetch('/api/knowledge?tags=ai,research')
const { data: taggedEntries } = await tagged.json()
```

---

#### POST `/api/knowledge`

Create a new knowledge entry.

**Request Body:**

```json
{
  "title": "Entry Title",
  "content": "Entry content with detailed information...",
  "tags": ["tag1", "tag2"],
  "metadata": {
    "source": "user",
    "importance": "high"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ Yes | Entry title |
| `content` | string | ✅ Yes | Entry content |
| `tags` | array | ❌ No | Tags for categorization |
| `metadata` | object | ❌ No | Additional metadata |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Entry Title",
    "content": "Entry content",
    "tags": ["tag1", "tag2"],
    "embedding": [0.1, 0.2, ...],
    "createdAt": "2025-01-04T10:00:00.000Z",
    "metadata": {}
  }
}
```

**Status Codes:**

| Code | Description |
|------|-------------|
| 201 | Entry created |
| 400 | Bad request |

---

#### PUT `/api/knowledge/[id]`

Update a knowledge entry.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Knowledge entry UUID |

**Request Body:**

```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["new-tag"]
}
```

All fields are optional.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "updatedAt": "2025-01-04T10:05:00.000Z"
  }
}
```

---

#### DELETE `/api/knowledge/[id]`

Delete a knowledge entry.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Knowledge entry UUID |

**Response:**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "uuid"
  }
}
```

---

### 6. Modules API

Manage native WebAssembly modules.

#### GET `/api/modules`

List available modules.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "vector-ops",
      "version": "1.0.0",
      "loaded": true,
      "capabilities": ["dot", "l2_norm", "cosine"]
    }
  ]
}
```

---

#### POST `/api/modules/load`

Load a native module.

**Request Body:**

```json
{
  "module": "vector-ops"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "loaded": true,
    "module": "vector-ops",
    "exports": ["dot", "l2_norm", "cosine"]
  }
}
```

---

#### POST `/api/modules/unload`

Unload a native module.

**Request Body:**

```json
{
  "module": "vector-ops"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "unloaded": true,
    "module": "vector-ops"
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request body is invalid |
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | AI provider unavailable |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: message",
    "details": {
      "field": "message",
      "constraint": "required"
    }
  }
}
```

---

## Rate Limiting

PersonalLog implements client-side rate limiting for AI provider APIs:

### Default Limits

| Provider | Requests/Minute | Tokens/Minute |
|----------|-----------------|---------------|
| OpenAI | 60 | 150,000 |
| Anthropic | 50 | 40,000 |
| Google | 60 | 120,000 |

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": {
      "retryAfter": 60,
      "limit": 60,
      "remaining": 0
    }
  }
}
```

**HTTP Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704369600
Retry-After: 60
```

---

## Examples

### Complete Chat Flow

```javascript
// 1. Create a new conversation
const convResponse = await fetch('/api/conversations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'AI Assistant Chat',
    contactId: 'contact-uuid'
  })
})

const { data: conversation } = await convResponse.json()

// 2. Send a message with streaming
const chatResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Hello, can you help me?',
    conversationId: conversation.id,
    contactId: 'contact-uuid',
    model: 'gpt-4',
    provider: 'openai',
    stream: true
  })
})

// 3. Handle streaming response
const reader = chatResponse.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))

      if (data.type === 'token') {
        console.log(data.content) // Stream token
      } else if (data.type === 'done') {
        console.log('Stream complete')
      }
    }
  }
}
```

### Knowledge Base Integration

```javascript
// 1. Create a knowledge entry
const entryResponse = await fetch('/api/knowledge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Machine Learning Basics',
    content: 'Machine learning is a subset of AI...',
    tags: ['ai', 'ml', 'education']
  })
})

const { data: entry } = await entryResponse.json()

// 2. Search knowledge base
const searchResults = await fetch('/api/knowledge?search=artificial%20intelligence')
const { data: results } = await searchResults.json()

results.forEach(result => {
  console.log(`${result.title}: ${result.content.substring(0, 100)}...`)
})
```

### Error Handling

```javascript
async function chatWithAI(message) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationId: 'uuid',
        contactId: 'uuid',
        model: 'gpt-4',
        provider: 'openai',
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.json()

      // Handle specific error codes
      switch (error.error.code) {
        case 'RATE_LIMITED':
          console.log(`Rate limited. Retry after ${error.error.details.retryAfter}s`)
          return
        case 'UNAUTHORIZED':
          console.log('Please configure your API key')
          return
        default:
          console.log(`Error: ${error.error.message}`)
      }
    }

    const data = await response.json()
    return data.data.message.content
  } catch (error) {
    console.error('Network error:', error)
  }
}
```

---

## TypeScript Client Example

```typescript
interface PersonalLogClient {
  chat(params: ChatParams): Promise<string>
  getConversations(): Promise<Conversation[]>
  createConversation(title: string): Promise<Conversation>
  // ... other methods
}

class PersonalLogClientImpl implements PersonalLogClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async chat(params: ChatParams): Promise<string> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.message.content
  }

  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${this.baseURL}/api/conversations`)
    const data = await response.json()
    return data.data
  }

  async createConversation(title: string): Promise<Conversation> {
    const response = await fetch(`${this.baseURL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })

    const data = await response.json()
    return data.data
  }
}

// Usage
const client = new PersonalLogClientImpl('http://localhost:3000')
const conversations = await client.getConversations()
```

---

## Best Practices

1. **Always handle errors** - Check for `success: false` in responses
2. **Use streaming for long responses** - Reduces perceived latency
3. **Implement retry logic** - Handle network failures gracefully
4. **Respect rate limits** - Implement exponential backoff
5. **Validate input** - Sanitize user input before sending to API
6. **Cache responses** - Reduce redundant API calls
7. **Monitor usage** - Track token usage and costs

---

## Changelog

### v1.0.0 (2025-01-04)
- Initial API release
- 6 core endpoints
- Full streaming support
- Knowledge base integration
- Native module loading

---

**For more information, see:**
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Examples](../examples/)

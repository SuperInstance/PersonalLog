# API Usage Examples Guide

## Quick Start

### 1. Generate API Key

```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Development Key",
    "type": "BASIC",
    "permissions": ["READ", "WRITE"],
    "rateLimit": 100
  }'
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "apiKey": {
      "id": "key1234567890",
      "key": "sk_basic_abc123def456",
      "name": "My Development Key",
      "keyPrefix": "sk_basic",
      "type": "BASIC",
      "permissions": ["READ", "WRITE"],
      "rateLimit": 100,
      "isActive": true,
      "expiresAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "message": "API key created successfully",
    "warning": "Please save this API key securely. It will not be shown again."
  },
  "requestId": "req-1234567890-abc12"
}
```

### 2. Use API Key in Requests

```bash
curl -X GET http://localhost:3000/api/notes \
  -H "X-API-Key: sk_basic_abc123def456"
```

## Authentication

### API Key in Header

Include your API key in the `X-API-Key` header:

```bash
curl -X GET http://localhost:3000/api/notes \
  -H "X-API-Key: sk_basic_abc123def456"
```

### API Key Types

| Type | Rate Limit | Permissions | Use Case |
|------|-----------|-------------|-----------|
| BASIC | 100/min | READ, WRITE | Development and basic usage |
| PREMIUM | 500/min | READ, WRITE, UPLOAD, TRANSCRIBE | Production usage |
| ENTERPRISE | 1000/min | All permissions | High-volume applications |
| ADMIN | 2000/min | All permissions | Admin tasks and monitoring |

### API Key Permissions

| Permission | Description | Endpoints |
|-----------|-------------|------------|
| READ | Read data | GET /api/* |
| WRITE | Create and update data | POST, PUT /api/* |
| DELETE | Delete data | DELETE /api/* |
| UPLOAD | Upload files | POST /api/notes/files |
| TRANSCRIBE | Transcribe audio | POST /api/notes/transcribe |
| ADMIN | All permissions | All endpoints |

## ComfyUI Chat API

### Send Message

```bash
curl -X POST http://localhost:3000/api/comfyui/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_basic_abc123def456" \
  -d '{
    "message": "Create a fantasy portrait",
    "projectId": "project123",
    "clientVersion": "1.0.0"
  }'
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "content": "I've created a ComfyUI workflow for your fantasy portrait...",
    "workflow": {
      "nodes": [...],
      "links": [...]
    },
    "projectId": "project123",
    "context": {
      "ragContext": [...],
      "userMemories": [...]
    },
    "chatMessageId": "msg123"
  },
  "requestId": "req-1234567890-abc12"
}
```

### Get Conversation History

```bash
curl -X GET "http://localhost:3000/api/comfyui/chat?limit=50" \
  -H "X-API-Key: sk_basic_abc123def456"
```

## RAG-Enhanced Chat API

### Send Message with Context

```bash
curl -X POST http://localhost:3000/api/comfyui/chat-advanced \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "message": "Create a fantasy portrait with warm lighting",
    "projectId": "project123",
    "includeContext": true,
    "contextLimit": 5,
    "includeUserMemories": true
  }'
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "content": "Using context from your User Memory (preferred_model: SDXL) and Project Memory...",
    "workflow": {...},
    "context": {
      "ragContext": [
        {
          "type": "user_memory",
          "content": "preferred_model: SDXL"
        },
        {
          "type": "project_memory",
          "content": "successful_prompt: warm lighting worked well"
        }
      ],
      "userMemories": [...],
      "totalContextRetrieved": 5
    }
  }
}
```

## Templates API

### Get All Templates

```bash
curl -X GET "http://localhost:3000/api/comfyui/templates?style=Fantasy&difficulty=Intermediate" \
  -H "X-API-Key: sk_basic_abc123def456"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "templates": [
      {
        "id": "template123",
        "name": "Epic Fantasy Landscape",
        "description": "Create epic fantasy landscapes with towering mountains...",
        "category": "Landscapes",
        "style": "Fantasy",
        "difficulty": "Intermediate",
        "estimatedCost": {
          "steps": 30,
          "cfg": 7.5,
          "sampler": "DPM++ 2M Karras"
        }
      }
    ],
    "total": 1
  }
}
```

### Apply Template to Project

```bash
curl -X POST http://localhost:3000/api/comfyui/templates/apply \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "templateId": "template123",
    "projectId": "project456",
    "customizations": {
      "prompt": "Magical forest with glowing mushrooms",
      "style": "Add more dramatic lighting"
    }
  }'
```

## Notes API

### Create Note

```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "title": "Project Ideas",
    "content": "# My Project Ideas\n\n## Character Concepts\n\n## Plot Points",
    "folder": "Projects",
    "tags": ["fantasy", "wizard", "ideas"],
    "projectId": "project123"
  }'
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "note": {
      "id": "note123",
      "title": "Project Ideas",
      "content": "# My Project Ideas...",
      "folder": "Projects",
      "tags": ["fantasy", "wizard", "ideas"],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "message": "Note created successfully"
  },
  "requestId": "req-1234567890-abc12"
}
```

### Get Notes with Pagination

```bash
curl -X GET "http://localhost:3000/api/notes?page=1&pageSize=20&folder=Projects" \
  -H "X-API-Key: sk_basic_abc123def456"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "notes": [...],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3,
      "hasMore": true,
      "info": "Showing 1-20 of 45 results (page 1 of 3)"
    }
  }
}
```

### Update Note

```bash
curl -X PUT http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "id": "note123",
    "title": "Updated Title",
    "content": "Updated content...",
    "isPinned": true
  }'
```

### Delete Note

```bash
curl -X DELETE "http://localhost:3000/api/notes?id=note123" \
  -H "X-API-Key: sk_basic_abc123def456"
```

## File Attachments API

### Attach File to Note

```bash
curl -X POST http://localhost:3000/api/notes/files \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "noteId": "note123",
    "name": "character_concept.jpg",
    "type": "image",
    "fileData": "base64_encoded_image_data",
    "mimeType": "image/jpeg",
    "fileSize": 1024000,
    "sourceType": "manual"
  }'
```

### Delete File from Note

```bash
curl -X DELETE "http://localhost:3000/api/notes/files?id=file123" \
  -H "X-API-Key: sk_basic_abc123def456"
```

## STT (Speech-to-Text) API

### Transcribe Audio

```bash
curl -X POST http://localhost:3000/api/notes/transcribe \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "noteId": "note123",
    "audioData": "base64_encoded_audio",
    "mimeType": "audio/wav"
  }'
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "transcription": "This is the transcribed text from your audio...",
    "audioDuration": 45.5,
    "noteId": "note123",
    "message": "Transcription completed successfully"
  }
}
```

## Search API

### Search Notes

```bash
curl -X GET "http://localhost:3000/api/notes/search?q=fantasy wizard&limit=10" \
  -H "X-API-Key: sk_basic_abc123def456"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "notes": [
      {
        "id": "note123",
        "title": "Fantasy Wizard Concept",
        "content": "Fantasy wizard with magical staff...",
        "relevance": 0.95
      }
    ],
    "total": 10
  }
}
```

## API Key Management API

### List All API Keys

```bash
curl -X GET "http://localhost:3000/api/keys" \
  -H "X-API-Key: sk_admin_ghi789jkl012"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "apiKeys": [
      {
        "id": "key123",
        "name": "Development Key",
        "keyPrefix": "sk_basic",
        "type": "BASIC",
        "permissions": ["READ", "WRITE"],
        "rateLimit": 100,
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastUsedAt": "2024-01-15T11:45:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Get API Key Details

```bash
curl -X GET "http://localhost:3000/api/keys/key123" \
  -H "X-API-Key: sk_admin_ghi789jkl012"
```

### Update API Key

```bash
curl -X PUT http://localhost:3000/api/keys/key123 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_admin_ghi789jkl012" \
  -d '{
    "name": "Updated Name",
    "rateLimit": 200
  }'
```

### Revoke API Key

```bash
curl -X DELETE "http://localhost:3000/api/keys/key123" \
  -H "X-API-Key: sk_admin_ghi789jkl012"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "success": true,
    "message": "API key revoked successfully"
  }
}
```

### Get API Key Statistics

```bash
curl -X GET "http://localhost:3000/api/keys/stats" \
  -H "X-API-Key: sk_admin_ghi789jkl012"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "statistics": {
      "totalKeys": 5,
      "activeKeys": 4,
      "expiredKeys": 1,
      "byType": {
        "BASIC": 2,
        "PREMIUM": 2,
        "ENTERPRISE": 1,
        "ADMIN": 0
      }
    },
    "insights": {
      "mostUsedType": "PREMIUM",
      "averageUsage": 150.5,
      "activeRatio": "80.00%"
    }
  }
}
```

## Memory System API

### Get User Memory

```bash
curl -X GET "http://localhost:3000/api/comfyui/memory/user" \
  -H "X-API-Key: sk_premium_xyz789def012"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "userMemories": [
      {
        "id": "mem123",
        "category": "style",
        "key": "preferred_model",
        "value": "SDXL",
        "confidence": 0.85,
        "source": "user_explicit",
        "useCount": 45,
        "successRate": 0.92,
        "lastUsed": "2024-01-15T11:45:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Update User Memory

```bash
curl -X POST http://localhost:3000/api/comfyui/memory/user \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "category": "style",
    "key": "preferred_model",
    "value": "SDXL 1.0",
    "confidence": 0.90
  }'
```

### Reset User Memory

```bash
curl -X DELETE "http://localhost:3000/api/comfyui/memory/user/mem123/reset" \
  -H "X-API-Key: sk_basic_abc123def456"
```

## Cross-Project References API

### Get Cross-Project References

```bash
curl -X GET "http://localhost:3000/api/comfyui/cross-project?projectId=project123" \
  -H "X-API-Key: sk_basic_abc123def456"
```

**Response:**
```json
{
  "version": "1.0.0",
  "data": {
    "references": [
      {
        "id": "ref123",
        "sourceProjectId": "project123",
        "targetProjectId": "project456",
        "referenceType": "style_influence",
        "strength": 0.75,
        "description": "Use neon lighting techniques that worked for your spaceship interiors",
        "useCount": 12,
        "lastUsed": "2024-01-15T11:45:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Create Cross-Project Reference

```bash
curl -X POST http://localhost:3000/api/comfyui/cross-project \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_premium_xyz789def012" \
  -d '{
    "sourceProjectId": "project123",
    "targetProjectId": "project456",
    "referenceType": "style_influence",
    "strength": 0.75,
    "description": "Use neon lighting techniques from source project"
  }'
```

## Error Responses

### Validation Error (400)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "Invalid request body",
    "code": "VALIDATION_ERROR",
    "details": {
      "errors": [
        "Name is required",
        "Title must be between 3 and 200 characters"
      ]
    }
  },
  "requestId": "req-1234567890-abc12"
}
```

### Unauthorized (401)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "API key is required",
    "code": "UNAUTHORIZED"
  },
  "requestId": "req-1234567890-abc12"
}
```

### Forbidden (403)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "Insufficient permissions. Required: TRANSCRIBE",
    "code": "FORBIDDEN"
  },
  "requestId": "req-1234567890-abc12"
}
```

### Not Found (404)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "Note not found",
    "code": "NOT_FOUND"
  },
  "requestId": "req-1234567890-abc12"
}
```

### Rate Limit Exceeded (429)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "Too many requests",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retryAfter": "2024-01-15T11:00:00.000Z",
      "resetAfter": "60 seconds until you can make another request"
    }
  },
  "requestId": "req-1234567890-abc12"
}
```

**Headers:**
```
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705336860
```

### Internal Server Error (500)

```json
{
  "version": "1.0.0",
  "error": {
    "message": "An unexpected error occurred",
    "code": "INTERNAL_ERROR",
    "details": process.env.NODE_ENV === 'development' ? "Error stack trace" : undefined
  },
  "requestId": "req-1234567890-abc12"
}
```

## Versioning

### Include API Version

```bash
curl -X GET http://localhost:3000/api/notes \
  -H "X-API-Key: sk_basic_abc123def456" \
  -H "X-API-Version: 1.0.0"
```

### Version Headers

All responses include version headers:

```
API-Version: 1.0.0
X-Minimum-Version: 1.0.0
X-Latest-Version: 1.0.0
X-Request-ID: req-1234567890-abc12
```

## Deprecation

### Deprecated Endpoint Response

```json
{
  "version": "1.0.0",
  "data": { ... },
  "deprecation": {
    "isDeprecated": true,
    "deprecationDate": "2024-06-01",
    "sunsetDate": "2024-09-01",
    "message": "This endpoint will be sunset on 2024-09-01 (30 days remaining). Please update to use /api/notes/v2 instead."
  }
}
```

## Pagination

### Pagination Query Parameters

- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)
- `cursor` - Cursor for infinite scroll

### Pagination Response

```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true,
    "cursor": "eyJpYWdlIjoxLCJwYWdlU2l6ZSI6MjB9",
    "previousCursor": null,
    "info": "Showing 1-20 of 100 results (page 1 of 5)"
  }
}
```

### Pagination Headers

```
X-Pagination-Page: 1
X-Pagination-PageSize: 20
X-Pagination-Total: 100
X-Pagination-Total-Pages: 5
X-Pagination-Has-More: true
```

## Security Best Practices

### 1. Keep API Keys Secret

- Never commit API keys to version control
- Use environment variables for API keys in production
- Store API keys securely (use key vault)
- Rotate API keys regularly

### 2. Use Appropriate Key Type

- **Development**: Use BASIC key type
- **Production**: Use PREMIUM or ENTERPRISE key type
- **Admin**: Use ADMIN key type only for admin tasks
- **Rate Limiting**: Choose appropriate rate limit for your use case

### 3. Request Proper Permissions

- Only request minimum permissions needed
- Don't request ADMIN permission unless necessary
- Use specific permissions (READ instead of READ, WRITE, DELETE)

### 4. Handle Errors Gracefully

- Check response status codes
- Read error messages for troubleshooting
- Implement retry logic with exponential backoff
- Respect Retry-After headers on rate limit

### 5. Validate Responses

- Always validate API response structure
- Handle unexpected or malformed responses
- Check version headers for deprecation warnings
- Validate data types and formats

### 6. Use HTTPS in Production

- Always use HTTPS for production API calls
- Verify SSL certificates
- Use HTTPS for all sensitive operations
- Never send API keys over unencrypted connections

## Testing API Endpoints

### Using curl

```bash
# Basic test
curl http://localhost:3000/api/health

# Authenticated test
curl -H "X-API-Key: YOUR_API_KEY" \
  http://localhost:3000/api/notes

# With pagination
curl -H "X-API-Key: YOUR_API_KEY" \
  "http://localhost:3000/api/notes?page=1&pageSize=10"

# POST request with data
curl -X POST -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"title":"Test","content":"Test content"}' \
  http://localhost:3000/api/notes
```

### Using Postman

1. **Import Collection**: Download Postman collection
2. **Set Environment**: Add API key as variable
3. **Test Endpoints**: Use collections for testing
4. **View Responses**: Check response format and headers
5. **Automate Tests**: Create Postman tests

### Using JavaScript/TypeScript

```javascript
// Using fetch API
const response = await fetch('http://localhost:3000/api/notes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'sk_basic_abc123def456'
  },
  body: JSON.stringify({
    title: 'Test Note',
    content: 'Test content...'
  })
});

const data = await response.json();
console.log('Response:', data);
```

### Using Python

```python
import requests

API_KEY = 'sk_basic_abc123def456'

headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
}

# Get notes
response = requests.get('http://localhost:3000/api/notes', headers=headers)
notes = response.json()
print('Notes:', notes)

# Create note
note_data = {
  'title': 'Test Note',
  'content': 'Test content...'
}

response = requests.post(
  'http://localhost:3000/api/notes',
  headers=headers,
  json=note_data
)
created_note = response.json()
print('Created:', created_note)
```

## Advanced Usage

### Error Handling

```javascript
async function makeAPIRequest(endpoint, options) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Usage
const notes = await makeAPIRequest('/api/notes', { method: 'GET' });
console.log('Notes:', notes);
```

### Retry Logic with Exponential Backoff

```javascript
async function retryWithBackoff(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limit hit. Retrying in ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return data;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const backoffMs = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt + 1} failed. Retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

// Usage
const notes = await retryWithBackoff('http://localhost:3000/api/notes', {
  method: 'GET',
  headers: { 'X-API-Key': 'sk_basic_abc123def456' }
});
```

### Rate Limiting Helper

```javascript
class RateLimiter {
  constructor(apiKey, limit = 100, window = 60000) {
    this.apiKey = apiKey;
    this.limit = limit;
    this.window = window;
    this.requests = [];
  }

  async request(url, options = {}) {
    // Check if we can make this request
    const now = Date.now();
    const recentRequests = this.requests.filter(req =>
      req.timestamp > now - this.window
    );

    if (recentRequests.length >= this.limit) {
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest.timestamp + this.window - now) / 1000);
      throw new Error(`Rate limit exceeded. Retry in ${retryAfter}s`);
    }

    // Make request
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers
      }
    });

    // Track request
    this.requests.push({ timestamp: now, url, method: options.method });

    return await response.json();
  }
}

// Usage
const limiter = new RateLimiter('sk_basic_abc123def456', 100, 60000);
const notes = await limiter.request('http://localhost:3000/api/notes', { method: 'GET' });
```

## Debugging

### Enable Debug Logging

Set `LOG_LEVEL=debug` in environment variables to see detailed logs:

```bash
LOG_LEVEL=debug bunx dev
```

### Check Response Headers

```bash
curl -v http://localhost:3000/api/notes \
  -H "X-API-Key: sk_basic_abc123def456"
```

Look for:
- `API-Version` - Current API version
- `X-Minimum-Version` - Minimum supported version
- `X-RateLimit-Remaining` - Requests remaining before limit
- `X-RateLimit-Reset` - When rate limit resets
- `X-Request-ID` - Request identifier for debugging

### Use Request ID for Support

If you encounter issues, include the `requestId` from response headers in your support request:

```
Request ID: req-1234567890-abc12
Endpoint: GET /api/notes
Error: Validation failed
```

## Best Practices Summary

1. **Always include API key** in `X-API-Key` header
2. **Use appropriate API key type** for your use case
3. **Handle errors gracefully** with proper retry logic
4. **Validate responses** before using data
5. **Respect rate limits** with exponential backoff retry
6. **Use HTTPS** in production for all API calls
7. **Keep API keys secret** - never commit to version control
8. **Check deprecation warnings** in responses
9. **Use pagination** for large datasets
10. **Implement proper error handling** in your application

## Support

### Documentation Links

- [OpenAPI Specification](http://localhost:3000/api/docs?format=json)
- [Markdown Documentation](http://localhost:3000/api/docs?format=markdown)
- [Interactive API Documentation](http://localhost:3000/api/docs)

### Getting Help

- Check [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- Review [API Reference](./README.md#-api-reference)
- View [System Status](http://localhost:3000/api/health)
- Check [Analytics Dashboard](http://localhost:3000/analytics)

### Common Issues

**Rate Limit Exceeded:**
- Wait for retry time
- Increase API key rate limit
- Use caching to reduce API calls

**Invalid API Key:**
- Check API key is correct
- Verify API key is still active
- Check API key has required permissions

**Not Found (404):**
- Verify resource ID is correct
- Check resource hasn't been deleted
- Check you have permission to access resource

**Internal Error (500):**
- Check API documentation for endpoint
- Verify request format is correct
- Contact support with request ID

---

**API Version: 1.0.0**
**Documentation Last Updated:** 2024

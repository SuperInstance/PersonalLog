/**
 * API Documentation Generator
 *
 * Auto-generates OpenAPI 3.0 specification from API routes
 * Parses JSDoc comments and endpoint metadata
 * Generates interactive API documentation
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * OpenAPI 3.0 Specification Interface
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description: string;
    variables?: Record<string, any>;
  }>;
  paths: Record<string, any>;
  components: {
    schemas?: Record<string, any>;
    responses?: Record<string, any>;
    parameters?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  security?: Record<string, any[]>;
  tags: Array<{
    name: string;
    description: string;
    externalDocs?: {
      description: string;
      url: string;
    };
  }>;
}

/**
 * API Endpoint Documentation
 */
export interface EndpointDoc {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  summary: string;
  description: string;
  tags: string[];
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    description: string;
    required: boolean;
    schema: {
      type: string;
      format?: string;
      default?: any;
      enum?: any[];
      minLength?: number;
      maxLength?: number;
      minimum?: number;
      maximum?: number;
      properties?: Record<string, any>;
    };
  }>;
  requestBody?: {
    description: string;
    required: boolean;
    content: Record<string, {
      schema: {
        type: string;
        properties?: Record<string, any>;
        required?: string[];
      };
    }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, {
      schema: {
        type: string;
        properties?: Record<string, any>;
      };
    }>;
  }>;
  security?: Array<any>;
  deprecated?: boolean;
}

/**
 * Parse API routes to generate documentation
 */
export async function generateAPIDocumentation(): Promise<OpenAPISpec> {
  const apiDir = join(process.cwd(), 'src', 'app', 'api');

  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: 'ComfyUI Vibe Agent API',
      description: 'Enterprise-grade creative intelligence API for ComfyUI workflow generation, RAG-powered knowledge retrieval, and advanced note-taking with STT integration.',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
        url: 'https://example.com/docs'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    paths: {},
    components: {
      schemas: {},
      responses: {},
      parameters: {},
      securitySchemes: {}
    },
    security: [],
    tags: [
      {
        name: 'Chat System',
        description: 'Conversational workflow building APIs'
      },
      {
        name: 'RAG & Memory',
        description: 'Retrieval-Augmented Generation and memory management'
      },
      {
        name: 'Templates',
        description: 'Workflow template library APIs'
      },
      {
        name: 'Notes',
        description: 'Note-taking and knowledge base APIs'
      },
      {
        name: 'Files',
        description: 'File attachment and management'
      },
      {
        name: 'Transcription',
        description: 'STT (Speech-to-Text) transcription APIs'
      },
      {
        name: 'Analytics',
        description: 'Analytics and monitoring APIs'
      },
      {
        name: 'System',
        description: 'Health checks and system status'
      }
    ]
  };

  // Recursively scan API routes
  const endpoints = scanAPIRoutes(apiDir);

  // Generate OpenAPI spec
  for (const endpoint of endpoints) {
    const pathKey = endpoint.path;
    const methodKey = endpoint.method.toLowerCase();

    if (!spec.paths[pathKey]) {
      spec.paths[pathKey] = {};
    }

    spec.paths[pathKey][methodKey] = {
      tags: endpoint.tags,
      summary: endpoint.summary,
      description: endpoint.description,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      security: endpoint.security,
      deprecated: endpoint.deprecated
    };

    // Add schemas to components if present
    if (endpoint.requestBody?.content?.['application/json']?.schema?.properties) {
      addSchemaProperties(spec, endpoint.requestBody.content['application/json'].schema.properties);
    }

    if (endpoint.responses) {
      for (const [statusCode, response] of Object.entries(endpoint.responses)) {
        if (response.content?.['application/json']?.schema?.properties) {
          addSchemaProperties(spec, response.content['application/json'].schema.properties);
        }
      }
    }
  }

  return spec;
}

/**
 * Recursively scan API routes directory
 */
function scanAPIRoutes(dir: string, parentPath: string = '/api'): Array<EndpointDoc> {
  const endpoints: Array<EndpointDoc> = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        if (entry.name !== 'health' && entry.name !== 'docs') {
          const subEndpoints = scanAPIRoutes(fullPath, `${parentPath}/${entry.name}`);
          endpoints.push(...subEndpoints);
        }
      } else if (entry.name === 'route.ts' && !entry.name.startsWith('[') && !entry.name.startsWith('(')) {
        // Parse route file to extract endpoint documentation
        const routeEndpoints = parseRouteFile(fullPath, parentPath, entry.name);
        endpoints.push(...routeEndpoints);
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${dir}:`, error);
  }

  return endpoints;
}

/**
 * Parse individual route file
 */
function parseRouteFile(filePath: string, parentPath: string, fileName: string): Array<EndpointDoc> {
  const endpoints: Array<EndpointDoc> = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const pathSegment = parentPath.split('/api')[1] || fileName.split('route')[0];

    // Extract documentation from JSDoc-like comments
    const docRegex = /\/\*\*\s*\n([\s\S]*?)\s*\*\//g;
    const matches = content.match(docRegex);

    if (!matches || matches.length === 0) {
      return [];
    }

    for (const match of matches) {
      const docComment = match[1];
      const endpoint = parseDocumentationComment(docComment, parentPath, pathSegment);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    }

    return endpoints;
  } catch (error) {
    console.error(`Failed to parse route file ${filePath}:`, error);
    return [];
  }
}

/**
 * Parse documentation comment to extract endpoint info
 */
function parseDocumentationComment(comment: string, parentPath: string, pathSegment: string): EndpointDoc | null {
  const endpoint: Partial<EndpointDoc> = {
    path: `${parentPath}`,
    method: 'GET',
    summary: '',
    description: '',
    tags: [],
    parameters: [],
    requestBody: undefined,
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {}
            }
          }
        }
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '404': {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '429': {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
    }
  };

  // Extract @endpoint tag
  const endpointTagMatch = comment.match(/@endpoint\s+([^\n]+)/);
  if (endpointTagMatch) {
    const tagMatch = endpointTagMatch[1].match(/(\w+):/);
    if (tagMatch) {
      endpoint.method = tagMatch[1].toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      endpoint.summary = tagMatch[1].substring(tagMatch[1].indexOf(':') + 1).trim();
    }
  }

  // Extract @tag tag
  const tagMatch = comment.match(/@tag\s+([^\n]+)/);
  if (tagMatch) {
    endpoint.tags = tagMatch[1].split(',').map(t => t.trim());
  }

  // Extract @desc tag
  const descMatch = comment.match(/@desc\s+([^\n]+)/);
  if (descMatch) {
    endpoint.description = descMatch[1].trim();
  }

  // Extract @param tags
  const paramMatches = comment.matchAll(/@param\s+(\w+)(?:\s+([\w\[\]]+))?(?:\s+-\s+([^\n]+))?/g);
  if (paramMatches) {
    endpoint.parameters = paramMatches.map(match => {
      const [name, location, type, description] = [match[1], match[2], match[3], match[4]].filter(Boolean);

      let inLocation = 'query';
      if (location && location.includes('[]')) {
        inLocation = 'path';
      }

      let paramType = 'string';
      if (type === 'number') paramType = 'number';
      if (type === 'boolean') paramType = 'boolean';
      if (type === 'string[]') paramType = 'array';

      return {
        name: name,
        in: inLocation as 'query' | 'path' | 'header' | 'cookie',
        description: description || '',
        required: false,
        schema: {
          type: paramType,
          ...(type === 'number' && { minimum: 0 }),
          ...(type === 'string' && { minLength: 1, maxLength: 255 })
        }
      };
    });
  }

  // Extract @requestBody tag
  const bodyMatch = comment.match(/@requestBody\s+(?:\{([^}]+)\}\s+)?([^\n]+)/);
  if (bodyMatch) {
    const schemaType = bodyMatch[1] || 'object';
    const schemaProperties = bodyMatch[2] ? parseSchemaProperties(bodyMatch[2]) : {};

    endpoint.requestBody = {
      description: 'Request body',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: schemaType,
            properties: schemaProperties,
            required: Object.keys(schemaProperties)
          }
        }
      }
    };
  }

  // Extract @response tag
  const responseMatch = comment.match(/@response\s+(?:\{(\d+)\}\s+)?(?:\{([^}]+)\}\s+)?([^\n]+)/);
  if (responseMatch) {
    const statusCode = responseMatch[1] || '200';
    const responseType = responseMatch[2] || 'object';
    const responseDescription = responseMatch[3].trim();

    const responseProperties = parseSchemaProperties(responseDescription);

    endpoint.responses[statusCode] = {
      description: responseDescription,
      content: {
        'application/json': {
          schema: {
            type: responseType,
            properties: responseProperties
          }
        }
      }
    };
  }

  // Extract @deprecated tag
  if (comment.includes('@deprecated')) {
    endpoint.deprecated = true;
  }

  // Extract @security tag
  const securityMatch = comment.match(/@security\s+(\w+)/);
  if (securityMatch) {
    endpoint.security = [{ [securityMatch[1]]: [] }];
  }

  return endpoint.summary ? (endpoint as EndpointDoc) : null;
}

/**
 * Parse schema properties from string
 */
function parseSchemaProperties(propertiesStr: string): Record<string, any> {
  const properties: Record<string, any> = {};
  const matches = propertiesStr.matchAll(/(\w+):\s*(\{[^}]+\}|\[[^\]]+\]|string|number|boolean|object)/g);

  for (const match of matches) {
    const [name, type] = [match[1], match[2]];

    if (type === 'string') {
      properties[name] = { type: 'string' };
    } else if (type === 'number') {
      properties[name] = { type: 'number', minimum: 0 };
    } else if (type === 'boolean') {
      properties[name] = { type: 'boolean' };
    } else if (type === 'object') {
      properties[name] = { type: 'object', properties: {} };
    } else if (type && type.startsWith('{') && type.endsWith('}')) {
      // Nested object
      properties[name] = { type: 'object', properties: parseSchemaProperties(type.substring(1, type.length - 1)) };
    } else if (type && type.startsWith('[') && type.endsWith(']')) {
      // Array
      properties[name] = { type: 'array', items: { type: type.substring(1, type.length - 1) } };
    }
  }

  return properties;
}

/**
 * Add schema properties to spec components
 */
function addSchemaProperties(spec: OpenAPISpec, properties: Record<string, any>): void {
  for (const [name, schema] of Object.entries(properties)) {
    if (schema.type === 'object' && schema.properties) {
      spec.components.schemas = spec.components.schemas || {};
      spec.components.schemas[name] = schema;
    } else {
      spec.components.schemas = spec.components.schemas || {};
      spec.components.schemas[name] = schema;
    }
  }
}

/**
 * Add common error schema to spec
 */
function addCommonSchemas(spec: OpenAPISpec): void {
  // Error schema
  spec.components.schemas = spec.components.schemas || {};
  spec.components.schemas['Error'] = {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        description: 'Error code',
        example: 'VALIDATION_ERROR'
      },
      message: {
        type: 'string',
        description: 'Human-readable error message',
        example: 'Invalid request body'
      },
      details: {
        type: 'object',
        description: 'Additional error details',
        properties: {}
      }
    },
    required: ['error', 'message']
  };

  // Versioned response schema
  spec.components.schemas['VersionedResponse'] = {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: 'API version',
        example: '1.0.0'
      },
      data: {
        type: 'object',
        description: 'Response data'
      },
      requestId: {
        type: 'string',
        description: 'Unique request identifier'
      }
    },
    required: ['version']
  };

  // Pagination schema
  spec.components.schemas['Pagination'] = {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        description: 'Current page number',
        minimum: 1
      },
      pageSize: {
        type: 'integer',
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100
      },
      total: {
        type: 'integer',
        description: 'Total number of items'
      },
      totalPages: {
        type: 'integer',
        description: 'Total number of pages'
      }
    },
    required: ['page', 'pageSize']
  };
}

/**
 * Generate OpenAPI specification JSON
 */
export async function generateOpenAPISpec(): Promise<void> {
  const spec = await generateAPIDocumentation();
  addCommonSchemas(spec);

  // Add security schemes
  spec.components.securitySchemes = {
    ApiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API key for authentication'
    }
  };

  // Add example schemas
  addExampleSchemas(spec);

  console.log('Generated OpenAPI Spec:', JSON.stringify(spec, null, 2));
  return spec;
}

/**
 * Add example schemas to spec
 */
function addExampleSchemas(spec: OpenAPISpec): void {
  // Note schema example
  spec.components.schemas['Note'] = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Note ID',
        example: 'clj1234567890'
      },
      title: {
        type: 'string',
        description: 'Note title',
        example: 'Project Ideas'
      },
      content: {
        type: 'string',
        description: 'Markdown content',
        example: '# My Project Ideas\n\nCharacter Concepts...'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags',
        example: ['fantasy', 'wizard']
      },
      folder: {
        type: 'string',
        description: 'Folder',
        example: 'projects'
      },
      isPinned: {
        type: 'boolean',
        description: 'Pinned status',
        example: false
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Creation timestamp',
        example: '2024-01-15T10:30:00.000Z'
      },
      updatedAt: {
        type: 'string',
        format: 'date-time',
        description: 'Last update timestamp',
        example: '2024-01-15T10:30:00.000Z'
      }
    },
    required: ['id', 'title', 'content']
  };

  // Workflow schema example
  spec.components.schemas['Workflow'] = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Workflow ID',
        example: 'workflow123'
      },
      name: {
        type: 'string',
        description: 'Workflow name',
        example: 'Fantasy Character'
      },
      description: {
        type: 'string',
        description: 'Workflow description',
        example: 'Auto-generated fantasy character'
      },
      workflowJson: {
        type: 'object',
        description: 'ComfyUI workflow JSON',
        example: {
          nodes: [
            {
              id: 1,
              type: 'KSampler',
              pos: [100, 100],
              size: { 0: 0, 1: 1 },
              flags: {}
            }
          ],
          links: [
            {
              origin_id: 1,
              target_id: 2,
              type: 'LATENT'
            }
          ]
        }
      }
    },
    required: ['id', 'name', 'workflowJson']
  };
}

/**
 * Write OpenAPI spec to file
 */
export async function writeOpenAPISpec(filePath: string = './openapi.json'): Promise<void> {
  try {
    const spec = await generateOpenAPISpec();
    const specJson = JSON.stringify(spec, null, 2);

    // Write spec to file
    const fs = await import('fs').then(m => m.default);
    await fs.promises.writeFile(filePath, specJson, 'utf-8');

    console.log(`OpenAPI spec written to ${filePath}`);
  } catch (error) {
    console.error('Failed to write OpenAPI spec:', error);
    throw error;
  }
}

/**
 * Generate HTML documentation from OpenAPI spec
 */
export async function generateHTMLDocumentation(): Promise<void> {
  const spec = await generateOpenAPISpec();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ComfyUI Vibe Agent API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@3/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '${window.location.origin}/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: false
      });
      ui.render();
    };
  </script>
</body>
</html>
  `;

  return html;
}

/**
 * Generate Markdown documentation
 */
export async function generateMarkdownDocumentation(): Promise<string> {
  const spec = await generateOpenAPIDocumentation();

  let markdown = '# ComfyUI Vibe Agent API Documentation\n\n';
  markdown += '**Version:** ' + spec.info.version + '\n\n';
  markdown += '**Base URL:** ' + (spec.servers?.[0]?.url || 'http://localhost:3000') + '\n\n';
  markdown += '## Description\n\n';
  markdown += spec.info.description + '\n\n';

  // Group by tags
  const tagGroups: Record<string, any[]> = {};
  for (const tag of spec.tags) {
    tagGroups[tag.name] = [];
  }

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, endpoint] of Object.entries(methods)) {
      for (const tag of endpoint.tags || []) {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }
        tagGroups[tag].push({ path, method, endpoint });
      }
    }
  }

  // Generate documentation for each tag
  for (const [tagName, endpoints] of Object.entries(tagGroups)) {
    markdown += `## ${tagName}\n\n`;

    for (const { path, method, endpoint } of endpoints) {
      const methodUpper = method.toUpperCase();
      markdown += `### ${methodUpper} ${path}\n\n`;
      markdown += `${endpoint.summary}\n\n`;
      markdown += `${endpoint.description}\n\n`;

      if (endpoint.tags && endpoint.tags.length > 0) {
        markdown += `**Tags:** ${endpoint.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
      }

      if (endpoint.security && endpoint.security.length > 0) {
        markdown += '**Security:** Requires API key authentication\n\n';
      }

      if (endpoint.parameters && endpoint.parameters.length > 0) {
        markdown += '#### Parameters\n\n';
        markdown += '| Name | Type | In | Required | Description |\n';
        markdown += '|------|------|----|----------|------------|\n';

        for (const param of endpoint.parameters) {
          const type = param.schema.type || 'unknown';
          const required = param.required ? 'Yes' : 'No';
          markdown += `| \`${param.name}\` | ${type} | ${param.in} | ${required} | ${param.description} |\n`;
        }

        markdown += '\n';
      }

      if (endpoint.requestBody) {
        markdown += '#### Request Body\n\n';
        markdown += '```json\n';
        markdown += JSON.stringify(endpoint.requestBody, null, 2);
        markdown += '\n```\n\n';
      }

      if (endpoint.responses) {
        markdown += '#### Responses\n\n';

        for (const [code, response] of Object.entries(endpoint.responses)) {
          markdown += `**${code}** - ${response.description}\n\n`;

          if (response.content) {
            for (const [contentType, content] of Object.entries(response.content)) {
              if (content.schema) {
                markdown += `**Content-Type:** ${contentType}\n\n`;
                markdown += '```json\n';
                markdown += JSON.stringify(content.schema, null, 2);
                markdown += '\n```\n\n';
              }
            }
          }
        }
      }

      if (endpoint.deprecated) {
        markdown += '> ⚠️ **This endpoint is deprecated.**\n\n';
      }

      markdown += '---\n\n';
    }
  }

  return markdown;
}

/**
 * Generate API usage examples
 */
export async function generateAPIUsageExamples(): Promise<void> {
  const examples = `
# API Usage Examples

## Authentication

All API requests (except public endpoints) require an API key in the header:

\`\`\`bash
curl -X GET https://api.example.com/api/notes \\
  -H "X-API-Key: your_api_key_here"
\`\`\`

## Chat System

### Send Message and Generate Workflow

\`\`\`bash
curl -X POST https://api.example.com/api/comfyui/chat \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "message": "Create a fantasy portrait",
    "projectId": "project123",
    "clientVersion": "1.0.0"
  }'
\`\`\`

### RAG-Enhanced Chat

\`\`\`bash
curl -X POST https://api.example.com/api/comfyui/chat-advanced \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "message": "Create a fantasy portrait",
    "projectId": "project123",
    "includeContext": true,
    "contextLimit": 5
  }'
\`\`\`

## Notes System

### Get All Notes with Pagination

\`\`\`bash
curl -X GET "https://api.example.com/api/notes?page=1&pageSize=20" \\
  -H "X-API-Key: your_api_key_here"
\`\`\`

### Create New Note

\`\`\`bash
curl -X POST https://api.example.com/api/notes \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "title": "My Project Ideas",
    "content": "# My Project Ideas\\n\\nCharacter Concepts...",
    "folder": "projects",
    "tags": ["fantasy", "wizard"]
  }'
\`\`\`

### Update Note

\`\`\`bash
curl -X PUT https://api.example.com/api/notes \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "id": "note123",
    "title": "Updated Title",
    "content": "Updated content..."
  }'
\`\`\`

### Delete Note

\`\`\`bash
curl -X DELETE "https://api.example.com/api/notes?id=note123" \\
  -H "X-API-Key: your_api_key_here"
\`\`\`

## Templates System

### Get All Templates

\`\`\`bash
curl -X GET "https://api.example.com/api/comfyui/templates?style=Fantasy&difficulty=Intermediate" \\
  -H "X-API-Key: your_api_key_here"
\`\`\`

### Apply Template

\`\`\`bash
curl -X POST https://api.example.com/api/comfyui/templates/apply \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "templateId": "template123",
    "projectId": "project123",
    "customizations": {
      "prompt": "Customize this prompt",
      "style": "Add custom style"
    }
  }'
\`\`\`

## Transcription System

### Transcribe Audio

\`\`\`bash
curl -X POST https://api.example.com/api/notes/transcribe \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "noteId": "note123",
    "audioData": "base64_encoded_audio_here",
    "mimeType": "audio/wav"
  }'
\`\`\`

## Health Check

### Get System Health

\`\`\`bash
curl -X GET https://api.example.com/api/health
\`\`\`

## Error Responses

All API errors follow this structure:

\`\`\`json
{
  "version": "1.0.0",
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  },
  "requestId": "req-1234567890-abc12"
}
\`\`\`

### Common Error Codes

- \`VALIDATION_ERROR\` - Invalid input data
- \`UNAUTHORIZED\` - Missing or invalid API key
- \`FORBIDDEN\` - Insufficient permissions
- \`NOT_FOUND\` - Resource not found
- \`CONFLICT\` - Resource conflict
- \`RATE_LIMIT_EXCEEDED\` - Too many requests
- \`INTERNAL_ERROR\` - Internal server error

## Versioning

Include the \`X-API-Version\` header with your requests to specify the API version:

\`\`\`bash
curl -X GET https://api.example.com/api/notes \\
  -H "X-API-Key: your_api_key_here" \\
  -H "X-API-Version: 1.0.0"
\`\`\`

## Pagination

Use \`page\` and \`pageSize\` query parameters for pagination:

\`\`\`bash
curl -X GET "https://api.example.com/api/notes?page=1&pageSize=20"
\`\`\`

Response includes pagination metadata:

\`\`\`json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
\`\`\`

## Rate Limiting

API requests are rate-limited. Check the \`Retry-After\` header if you receive a 429 status code:

\`\`\`bash
# Example rate limit response
curl -X POST https://api.example.com/api/notes \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{ ... }'

# Response: 429 Too Many Requests
# Headers: Retry-After: 60
# Retry-After: 60 seconds until you can make another request
\`\`\`
  `;

  console.log(examples);
}

export default {
  generateAPIDocumentation,
  generateOpenAPISpec,
  writeOpenAPISpec,
  generateHTMLDocumentation,
  generateMarkdownDocumentation,
  generateAPIUsageExamples
};

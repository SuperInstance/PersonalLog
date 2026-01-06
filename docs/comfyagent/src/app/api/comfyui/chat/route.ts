import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { retrieveContext, syncProject } from '@/lib/rag-service';
import { getUserMemories } from '@/lib/memory-service';
import { logger, logApiRequest, logApiResponse, logApiError } from '@/lib/logger';
import { generateRequestId, createErrorResponse, createInternalErrorResponse } from '@/lib/api-middleware';
import { getVersionHeaders, getVersion, getEndpointVersion, formatDeprecationWarning, EndpointVersion, checkMinimumVersion } from '@/lib/api-version';
import { rateLimiter, createRateLimitResponse, createValidationErrorResponse, validateRequestBody } from '@/lib/api-middleware';

/**
 * ComfyUI Chat API (Basic)
 * Provides conversational workflow building with full context
 */

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const limit = searchParams.get('limit');

    logApiRequest('/api/comfyui/chat', 'GET', { requestId, projectId, limit });

    // Check rate limit
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetTime, clientId);
    }

    // Get conversation history
    const messages = await db.chatMessage.findMany({
      where: { projectId: projectId || undefined },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50
    });

    logApiResponse('/api/comfyui/chat', 'GET', 200, Date.now() - startTime);

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        messages,
        total: messages.length
      },
      requestId
    });

    // Add version headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }

    return response;
  } catch (error) {
    logApiError('/api/comfyui/chat', 'GET', error);

    return createInternalErrorResponse('Failed to fetch chat messages');
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { message, projectId, conversationHistory, clientVersion } = await request.json();

    logApiRequest('/api/comfyui/chat', 'POST', { requestId, projectId, clientVersion });

    // Check rate limit
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetTime, clientId);
    }

    // Validate request body
    const validation = validateRequestBody({
      message,
      projectId,
      conversationHistory
    });

    if (!validation.isValid) {
      logApiResponse('/api/comfyui/chat', 'POST', 400, Date.now() - startTime);
      return createValidationErrorResponse(validation.error || 'Invalid request body');
    }

    // Check client version compatibility
    if (clientVersion) {
      const compatibility = checkMinimumVersion(clientVersion, '1.0.0');
      if (!compatibility.meetsMinimum) {
        return NextResponse.json({
          error: 'Client version not supported',
          message: compatibility.message,
          minimumVersion: '1.0.0',
          recommendedVersion: '1.0.0'
        }, {
          status: 400,
          headers: {
            ...getVersionHeaders(),
            'X-Api-Version': getVersion()
          }
        });
      }
    }

    // Sync project with vector store
    if (projectId) {
      await syncProject(projectId);
    }

    // Retrieve context from RAG system
    let ragContext: any[] = [];
    let userMemories: any[] = [];

    if (projectId) {
      ragContext = await retrieveContext(
        message,
        projectId,
        {
          includeCrossProject: false,
          topK: 5,
          minSimilarity: 0.4
        }
      );

      userMemories = await getUserMemories();
    }

    // Prepare messages for AI
    const messages = [
      {
        role: 'system',
        content: 'You are an expert ComfyUI workflow assistant. Generate ComfyUI workflows based on user descriptions. Always respond with valid JSON workflow format including nodes and links.'
      },
      ...(conversationHistory || []).slice(-10), // Keep last 10 messages
      ...(ragContext.length > 0 ? [{
        role: 'assistant',
        content: `## Relevant Context from Past Work\n\n${ragContext.slice(0, 3).map(ctx => `- [${ctx.type}] ${ctx.content.substring(0, 100)}...`).join('\n')}`
      }] : []),
      ...(userMemories.length > 0 ? [{
        role: 'assistant',
        content: `## User Preferences (from User Memory)\n\n${userMemories.slice(0, 5).map(m => `- ${m.key}: ${m.value} (${(m.confidence * 100).toFixed(0)}% confidence)`).join('\n')}`
      }] : []),
      {
        role: 'user',
        content: message
      }
    ];

    // Get AI completion
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    let workflow = null;
    let newProjectId = projectId;

    // Extract workflow JSON from response
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
      if (jsonMatch) {
        const workflowData = JSON.parse(jsonMatch[0]);
        workflow = workflowData;

        // Create project if none exists
        if (!projectId) {
          const project = await db.project.create({
            data: {
              name: 'ComfyUI Workflow Project',
              description: message.substring(0, 100)
            }
          });
          newProjectId = project.id;

          // Save workflow
          await db.workflow.create({
            data: {
              projectId: project.id,
              name: workflowData.name || 'Generated Workflow',
              description: workflowData.description || 'Auto-generated workflow',
              workflowJson: JSON.stringify(workflowData),
              isActive: true
            }
          });
        } else {
          // Save workflow to existing project
          await db.workflow.create({
            data: {
              projectId,
              name: workflowData.name || 'Generated Workflow',
              description: workflowData.description || 'Auto-generated workflow',
              workflowJson: JSON.stringify(workflowData),
              isActive: true
            }
          });
        }
      }
    } catch (parseError) {
      logger.warn('Failed to parse workflow JSON', {
        requestId,
        error: parseError
      });
    }

    // Save conversation to database
    const chatMessage = await db.chatMessage.create({
      data: {
        projectId: newProjectId || projectId,
        role: 'user',
        content: message,
        workflowSnapshot: workflow ? JSON.stringify(workflow) : null
      }
    });

    await db.chatMessage.create({
      data: {
        projectId: newProjectId || projectId,
        role: 'assistant',
        content: responseContent,
        workflowSnapshot: workflow ? JSON.stringify(workflow) : null
      }
    });

    logApiResponse('/api/comfyui/chat', 'POST', 200, Date.now() - startTime, {
      projectId: newProjectId || projectId,
      workflowGenerated: !!workflow
    });

    const response = NextResponse.json({
      version: getVersion(),
      data: {
        content: responseContent,
        workflow,
        projectId: newProjectId || projectId,
        context: {
          ragContext: ragContext.slice(0, 3),
          userMemories: userMemories.slice(0, 5)
        },
        chatMessageId: chatMessage.id
      },
      requestId
    });

    // Add version headers
    const headers = response.headers;
    for (const [key, value] of Object.entries(getVersionHeaders())) {
      headers.set(key, value);
    }

    return response;
  } catch (error) {
    logApiError('/api/comfyui/chat', 'POST', error);

    return createInternalErrorResponse('Failed to process chat message');
  }
}

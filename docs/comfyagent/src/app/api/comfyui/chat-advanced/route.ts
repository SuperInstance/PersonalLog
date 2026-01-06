import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retrieveContext, syncProject } from '@/lib/rag-service';
import { getUserMemories, recordMemorySuccess } from '@/lib/memory-service';
import ZAI from 'z-ai-web-dev-sdk';

const ENHANCED_SYSTEM_PROMPT = `You are an expert ComfyUI workflow assistant with a sophisticated memory system.

## Your Capabilities

You have access to multiple memory systems:

1. **RAG Context**: Relevant information from past conversations, project memories, and creative elements
2. **User Memory**: Cross-project patterns and preferences learned from the user's working style
3. **Project Memory**: Project-specific learned preferences, successful patterns, and feedback
4. **Cross-Project References**: Ability to call other project "personalities" as influence agents

## Workflow

When the user asks for help:

1. **Retrieve Relevant Context**: Use the provided RAG context to understand:
   - What has worked before in this project
   - User's general preferences (from User Memory)
   - Similar creative elements that could be reused

2. **Consider Cross-Project Influence**:
   - If relevant, suggest elements from other projects
   - Reference which project the suggestion comes from
   - Explain why it might be applicable

3. **Generate Workflow**: Create ComfyUI workflows that:
   - Incorporate learned preferences
   - Reuse successful techniques
   - Suggest cross-project improvements when applicable
   - Include cost estimates

4. **Learn from Interaction**: After generating responses, extract:
   - New user preferences (style, technique, workflow)
   - Successful patterns to store in Project Memory
   - Cross-project patterns that should be added to User Memory

## User Memory Examples

The system may provide context like:
- "user prefers: warm_colors, photorealistic style"
- "frequently uses: SDXL, KSampler with 20 steps"
- "avoid: dark themes, anime style"

## Project Memory Examples

The system may provide context like:
- "This project: Cyberpunk game assets"
- "Successful pattern: neon lighting with high contrast"
- "User feedback: prefers more detailed textures"

## Cross-Project References

When you see cross-project context, format suggestions as:
"Inspired by [ProjectName]: Consider using X technique, which worked well for Y"

## Workflow Format

Same as before, but enriched with learned preferences:
{
  "name": "workflow_name",
  "description": "brief description",
  "prompt": "full generation prompt",
  "nodes": [...],
  "links": [...]
}

## Always Provide

- Cost estimates based on parameters
- Model recommendations specific to the user's history
- Cross-project suggestions when applicable
- Suggestions for what to store in memory`;

export async function POST(request: NextRequest) {
  try {
    const { message, projectId, conversationHistory } = await request.json();

    // ========================================
    // RETRIEVE RAG CONTEXT
    // ========================================

    let ragContext: any[] = [];
    let userMemories: any[] = [];

    if (projectId) {
      // Sync project with vector store (incremental)
      await syncProject(projectId);

      // Retrieve relevant context
      ragContext = await retrieveContext(
        message,
        projectId,
        {
          includeCrossProject: true,
          topK: 8,
          minSimilarity: 0.35
        }
      );

      // Get user memories
      userMemories = await getUserMemories();
    }

    // ========================================
    // BUILD CONTEXT FOR AI
    // ========================================

    const contextParts = [];

    if (userMemories.length > 0) {
      contextParts.push(`## User Memory (Learned Patterns)\n${userMemories
        .slice(0, 10)
        .map(m => `- ${m.key}: ${m.value} (${(m.confidence * 100).toFixed(0)}% confidence)`)
        .join('\n')}`);
    }

    if (ragContext.length > 0) {
      contextParts.push(`## Relevant Context from Past Work\n${ragContext
        .slice(0, 5)
        .map(ctx => `- [${ctx.type}] ${ctx.content}`)
        .join('\n')}`);
    }

    const fullContext = contextParts.length > 0
      ? `## Context\n\n${contextParts.join('\n\n')}`
      : '';

    // ========================================
    // PREPARE MESSAGES
    // ========================================

    const messages = [
      { role: 'assistant', content: ENHANCED_SYSTEM_PROMPT },
      ...(conversationHistory || []).slice(-15), // Keep last 15 messages
      ...(fullContext ? [{ role: 'assistant', content: fullContext }] : []),
      { role: 'user', content: message }
    ];

    // ========================================
    // GET AI COMPLETION
    // ========================================

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' }
    });

    const responseContent = completion.choices[0]?.message?.content || '';
    let workflow = null;
    let newProjectId = projectId;

    // ========================================
    // EXTRACT WORKFLOW JSON
    // ========================================

    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*"nodes"[\s\S]*\}/);
      if (jsonMatch) {
        const workflowData = JSON.parse(jsonMatch[0]);
        workflow = workflowData;

        // Create project if none exists
        if (!projectId) {
          const project = await db.project.create({
            data: {
              name: 'New Image Project',
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
      console.error('Failed to parse workflow JSON:', parseError);
    }

    // ========================================
    // SAVE CONVERSATION
    // ========================================

    if (newProjectId) {
      await db.chatMessage.create({
        data: {
          projectId: newProjectId,
          role: 'user',
          content: message,
          workflowSnapshot: workflow ? JSON.stringify(workflow) : null
        }
      });

      await db.chatMessage.create({
        data: {
          projectId: newProjectId,
          role: 'assistant',
          content: responseContent,
          workflowSnapshot: workflow ? JSON.stringify(workflow) : null
        }
      });
    }

    // ========================================
    // RETURN RESPONSE
    // ========================================

    return NextResponse.json({
      content: responseContent,
      workflow,
      projectId: newProjectId,
      context: {
        ragContext: ragContext.slice(0, 3),
        userMemories: userMemories.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Enhanced Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

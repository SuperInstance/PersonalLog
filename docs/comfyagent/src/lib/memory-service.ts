/**
 * Memory Management Service
 *
 * Handles:
 * 1. User-level memory (cross-project patterns, human-editable)
 * 2. Project-specific memory (learned preferences, feedback)
 * 3. Automatic learning from conversations and iterations
 * 4. Pattern extraction and storage
 */

import { db } from '@/lib/db';

// ============================================
// USER MEMORY (Human-Editable)
// ============================================

export interface UserMemoryEntry {
  id: string;
  category: 'style' | 'technique' | 'preference' | 'workflow';
  key: string;
  value: string;
  confidence: number;
  source: 'user_explicit' | 'ai_learned' | 'observation';
  useCount: number;
  successRate?: number;
}

/**
 * Get all user memories
 */
export async function getUserMemories(): Promise<UserMemoryEntry[]> {
  const memories = await db.userMemory.findMany({
    orderBy: [
      { confidence: 'desc' },
      { useCount: 'desc' }
    ]
  });

  return memories;
}

/**
 * Get user memories by category
 */
export async function getUserMemoriesByCategory(
  category: UserMemoryEntry['category']
): Promise<UserMemoryEntry[]> {
  const memories = await db.userMemory.findMany({
    where: { category },
    orderBy: [
      { confidence: 'desc' },
      { useCount: 'desc' }
    ]
  });

  return memories;
}

/**
 * Update or create user memory
 */
export async function updateUserMemory(
  key: string,
  category: UserMemoryEntry['category'],
  value: string,
  options: {
    confidence?: number;
    source?: UserMemoryEntry['source'];
    incrementUsage?: boolean;
  } = {}
): Promise<UserMemoryEntry> {
  const { confidence = 0.5, source = 'ai_learned', incrementUsage = false } = options;

  const existing = await db.userMemory.findFirst({
    where: { key }
  });

  if (existing) {
    const updated = await db.userMemory.update({
      where: { id: existing.id },
      data: {
        value,
        confidence: (existing.confidence + confidence) / 2,
        source,
        lastUsed: new Date(),
        useCount: existing.useCount + (incrementUsage ? 1 : 0)
      }
    });

    return updated;
  } else {
    const created = await db.userMemory.create({
      data: {
        key,
        category,
        value,
        confidence,
        source,
        lastUsed: new Date(),
        useCount: incrementUsage ? 1 : 0
      }
    });

    return created;
  }
}

/**
 * Explicitly set user memory (human override)
 */
export async function setUserMemory(
  key: string,
  category: UserMemoryEntry['category'],
  value: string,
  confidence: number = 1.0
): Promise<UserMemoryEntry> {
  return updateUserMemory(key, category, value, {
    confidence,
    source: 'user_explicit',
    incrementUsage: false
  });
}

/**
 * Record success for user memory
 */
export async function recordMemorySuccess(
  key: string,
  success: boolean
): Promise<void> {
  const memory = await db.userMemory.findFirst({
    where: { key }
  });

  if (!memory) return;

  const newSuccessRate = memory.successRate !== null
    ? (memory.successRate * memory.useCount + (success ? 1 : 0)) / (memory.useCount + 1)
    : (success ? 1 : 0);

  await db.userMemory.update({
    where: { id: memory.id },
    data: {
      successRate: newSuccessRate,
      useCount: memory.useCount + 1,
      lastUsed: new Date()
    }
  });
}

// ============================================
// PROJECT MEMORY (Project-Specific Learning)
// ============================================

export interface ProjectMemoryEntry {
  id: string;
  projectId: string;
  sourceType: 'conversation' | 'iteration' | 'feedback' | 'ai_analysis';
  category: string;
  title: string;
  description: string;
  content: string;
  tags?: string[];
  importance: number;
  confidence: number;
  userRating?: number;
  useCount: number;
}

/**
 * Get project memories
 */
export async function getProjectMemories(
  projectId: string
): Promise<ProjectMemoryEntry[]> {
  const memories = await db.projectMemory.findMany({
    where: { projectId },
    orderBy: [
      { importance: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  return memories.map(memory => ({
    ...memory,
    tags: memory.tags ? JSON.parse(memory.tags) : undefined
  }));
}

/**
 * Create project memory
 */
export async function createProjectMemory(
  projectId: string,
  sourceType: ProjectMemoryEntry['sourceType'],
  sourceId: string | null,
  category: string,
  title: string,
  description: string,
  content: string,
  options: {
    tags?: string[];
    importance?: number;
    confidence?: number;
  } = {}
): Promise<ProjectMemoryEntry> {
  const { tags = [], importance = 0.5, confidence = 0.5 } = options;

  const memory = await db.projectMemory.create({
    data: {
      projectId,
      sourceType,
      sourceId,
      category,
      title,
      description,
      content,
      tags: JSON.stringify(tags),
      importance,
      confidence
    }
  });

  return {
    ...memory,
    tags
  };
}

/**
 * Update project memory rating
 */
export async function rateProjectMemory(
  memoryId: string,
  rating: number // 1-5
): Promise<void> {
  await db.projectMemory.update({
    where: { id: memoryId },
    data: {
      userRating: rating,
      useCount: { increment: 1 },
      lastUsed: new Date()
    }
  });
}

/**
 * Learn from conversation
 * Extracts patterns and creates project memory
 */
export async function learnFromConversation(
  projectId: string,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  // Only learn from successful patterns (positive feedback, repeated usage)
  // For now, this is a placeholder
  // In a full implementation, this would:
  // 1. Analyze conversation for patterns
  // 2. Extract preferences (style, mood, techniques)
  // 3. Create project memory entries
  // 4. Update user-level memory if cross-project pattern detected
}

/**
 * Learn from iteration
 * Records what worked and what didn't in workflow iterations
 */
export async function learnFromIteration(
  projectId: string,
  workflowId: string,
  feedback: {
    successful: boolean;
    improvements?: string[];
    notes?: string;
  }
): Promise<void> {
  if (feedback.successful) {
    // Learn what worked
    await createProjectMemory(
      projectId,
      'iteration',
      workflowId,
      'successful_technique',
      'Successful Workflow Pattern',
      `Workflow ${workflowId} produced good results`,
      JSON.stringify(feedback),
      {
        importance: 0.7,
        confidence: 0.6
      }
    );
  } else if (feedback.improvements) {
    // Learn what didn't work
    await createProjectMemory(
      projectId,
      'iteration',
      workflowId,
      'improvement_needed',
      'Workflow Improvement Suggestion',
      `Workflow ${workflowId} needs improvements`,
      JSON.stringify(feedback),
      {
        importance: 0.6,
        confidence: 0.5
      }
    );
  }
}

// ============================================
// PATTERN EXTRACTION
// ============================================

/**
 * Extract user preferences from conversations
 */
export async function extractUserPreferences(
  projectId: string,
  conversations: Array<{ role: string; content: string }>
): Promise<void> {
  // Analyze conversations for patterns
  // This is a simplified version - real implementation would use more sophisticated NLP

  const userMessages = conversations.filter(msg => msg.role === 'user');

  // Look for explicit preference statements
  const preferencePatterns = [
    { pattern: /i (?:like|prefer|love|want|need) (.+?) style/i, category: 'style' },
    { pattern: /i (?:like|prefer|love) (.+?) colors/i, category: 'preference' },
    { pattern: /(?:use|try) (.+?) model/i, category: 'technique' },
    { pattern: /(?:make|create) (?:it|them) (?:more|less) (.+?) /i, category: 'preference' }
  ];

  for (const message of userMessages) {
    for (const { pattern, category } of preferencePatterns) {
      const match = message.content.match(pattern);
      if (match) {
        const preference = match[1].trim();

        // Store in project memory
        await createProjectMemory(
          projectId,
          'conversation',
          null,
          category,
          `User Preference: ${preference}`,
          `User expressed preference for: ${preference}`,
          message.content,
          {
            importance: 0.7,
            confidence: 0.8,
            tags: [category, 'user_preference']
          }
        );

        // If this seems cross-project, also update user memory
        if (pattern.test(message.content.toLowerCase()) &&
            message.content.length > 20) {
          await updateUserMemory(
            `pref_${category}_${preference.substring(0, 20).replace(/\s+/g, '_')}`,
            category as UserMemoryEntry['category'],
            preference,
            {
              confidence: 0.7,
              source: 'ai_learned'
            }
          );
        }
      }
    }
  }
}

/**
 * Suggest cross-project patterns
 */
export async function suggestCrossProjectPatterns(
  currentProjectId: string
): Promise<UserMemoryEntry[]> {
  // Get user memories that have been used successfully
  const successfulPatterns = await db.userMemory.findMany({
    where: {
      successRate: { gte: 0.7 },
      useCount: { gte: 2 }
    },
    orderBy: { successRate: 'desc' },
    take: 10
  });

  return successfulPatterns;
}

/**
 * Cross-Project Reference Service
 *
 * Enables:
 * 1. Building connections between projects
 * 2. Calling project "personality" as influence on other projects
 * 3. Creating an internal reference system that grows in value
 * 4. Leveraging all of user's creativity across projects
 */

import { db } from '@/lib/db';
import { retrieveContext } from './rag-service';

// ============================================
// PROJECT PERSONALITY
// ============================================

export interface ProjectPersonality {
  projectId: string;
  projectName: string;
  summary: string;
  traits: string[];
  successfulElements: string[];
  preferredStyles: string[];
  influenceScore: number; // How influential this project is
}

/**
 * Build project personality from learned memories
 */
export async function buildProjectPersonality(
  projectId: string
): Promise<ProjectPersonality> {
  const project = await db.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const memories = await db.projectMemory.findMany({
    where: { projectId },
    orderBy: { importance: 'desc' },
    take: 50
  });

  const creativeElements = await db.creativeElement.findMany({
    where: { projectId }
  });

  // Extract traits from memories
  const traits = new Set<string>();
  const successfulElements: string[] = [];

  memories.forEach(memory => {
    if (memory.tags) {
      const tags = JSON.parse(memory.tags);
      tags.forEach((tag: string) => traits.add(tag));
    }

    if (memory.importance > 0.7 && memory.category === 'successful_technique') {
      successfulElements.push(memory.title);
    }
  });

  // Extract style preferences from creative elements
  const styleSet = new Set<string>();
  creativeElements.forEach(element => {
    if (element.styleTags) {
      const tags = JSON.parse(element.styleTags);
      tags.forEach((tag: string) => styleSet.add(tag));
    }
  });

  const preferredStyles = Array.from(styleSet);

  return {
    projectId,
    projectName: project.name,
    summary: project.personalitySummary || '',
    traits: Array.from(traits),
    successfulElements,
    preferredStyles,
    influenceScore: calculateInfluenceScore(projectId, memories.length, creativeElements.length)
  };
}

/**
 * Calculate how influential a project is
 */
function calculateInfluenceScore(
  projectId: string,
  memoryCount: number,
  elementCount: number
): number {
  // Base score from activity
  let score = Math.min(1.0, (memoryCount + elementCount) / 100);

  // Boost if reused successfully in other projects
  const outgoingRefs = db.crossProjectReference.count({
    where: { sourceProjectId: projectId }
  });

  const incomingRefs = db.crossProjectReference.count({
    where: { targetProjectId: projectId }
  });

  // Reused projects get higher influence
  score += Math.min(0.5, outgoingRefs * 0.05);

  return Math.min(1.0, score);
}

// ============================================
// CROSS-PROJECT REFERENCES
// ============================================

export interface CrossProjectReference {
  id: string;
  sourceProjectId: string;
  sourceProjectName: string;
  targetProjectId: string;
  targetProjectName: string;
  referenceType: 'style_influence' | 'technique_adoption' | 'element_reuse';
  strength: number;
  description: string;
  context?: string;
  useCount: number;
}

/**
 * Create cross-project reference
 */
export async function createCrossProjectReference(
  sourceProjectId: string,
  targetProjectId: string,
  referenceType: CrossProjectReference['referenceType'],
  description: string,
  context?: string
): Promise<CrossProjectReference> {
  const sourceProject = await db.project.findUnique({
    where: { id: sourceProjectId }
  });

  const targetProject = await db.project.findUnique({
    where: { id: targetProjectId }
  });

  if (!sourceProject || !targetProject) {
    throw new Error('One or both projects not found');
  }

  // Check if reference already exists
  const existing = await db.crossProjectReference.findFirst({
    where: {
      sourceProjectId,
      targetProjectId,
      referenceType
    }
  });

  if (existing) {
    // Update existing reference
    const updated = await db.crossProjectReference.update({
      where: { id: existing.id },
      data: {
        strength: (existing.strength + 0.1) / 2, // Weighted average
        useCount: { increment: 1 },
        lastUsed: new Date()
      }
    });

    return {
      ...updated,
      sourceProjectName: sourceProject.name,
      targetProjectName: targetProject.name
    };
  } else {
    // Create new reference
    const created = await db.crossProjectReference.create({
      data: {
        sourceProjectId,
        targetProjectId,
        referenceType,
        strength: 0.5,
        description,
        context
      }
    });

    return {
      ...created,
      sourceProjectName: sourceProject.name,
      targetProjectName: targetProject.name
    };
  }
}

/**
 * Get projects that can influence current project
 */
export async function getInfluencingProjects(
  projectId: string
): Promise<CrossProjectReference[]> {
  const references = await db.crossProjectReference.findMany({
    where: { targetProjectId: projectId },
    orderBy: { strength: 'desc' }
  });

  const result: CrossProjectReference[] = [];

  for (const ref of references) {
    const sourceProject = await db.project.findUnique({
      where: { id: ref.sourceProjectId }
    });

    if (sourceProject) {
      result.push({
        ...ref,
        sourceProjectName: sourceProject.name
      });
    }
  }

  return result;
}

/**
 * Get projects this project can influence
 */
export async function getInfluencedProjects(
  projectId: string
): Promise<CrossProjectReference[]> {
  const references = await db.crossProjectReference.findMany({
    where: { sourceProjectId: projectId },
    orderBy: { strength: 'desc' }
  });

  const result: CrossProjectReference[] = [];

  for (const ref of references) {
    const targetProject = await db.project.findUnique({
      where: { id: ref.targetProjectId }
    });

    if (targetProject) {
      result.push({
        ...ref,
        targetProjectName: targetProject.name
      });
    }
  }

  return result;
}

// ============================================
// PROJECT PERSONALITY AS AGENT
// ============================================

export interface PersonalityInfluence {
  sourceProject: ProjectPersonality;
  influenceType: string;
  suggestions: Array<{
    type: 'style' | 'technique' | 'element' | 'prompt';
    content: string;
    confidence: number;
    source: string;
  }>;
}

/**
 * Call project personality as influence agent
 * This enables using a project's learned patterns to influence another project
 */
export async function callProjectPersonality(
  sourceProjectId: string,
  targetQuery: string,
  targetContext?: {
    targetProjectId?: string;
    currentTheme?: string;
    currentStyle?: string;
    goal?: string;
  }
): Promise<PersonalityInfluence> {
  // Build source project personality
  const personality = await buildProjectPersonality(sourceProjectId);

  // Retrieve relevant context from source project
  const relevantContext = await retrieveContext(
    targetQuery,
    sourceProjectId,
    {
      topK: 5,
      minSimilarity: 0.4
    }
  );

  // Generate influence suggestions based on personality
  const suggestions = generateInfluenceSuggestions(
    personality,
    targetQuery,
    relevantContext,
    targetContext
  );

  return {
    sourceProject: personality,
    influenceType: determineInfluenceType(personality, targetContext),
    suggestions
  };
}

/**
 * Generate influence suggestions
 */
function generateInfluenceSuggestions(
  personality: ProjectPersonality,
  query: string,
  context: any[],
  targetContext?: any
): PersonalityInfluence['suggestions'] {
  const suggestions: PersonalityInfluence['suggestions'] = [];

  // Style suggestions based on project's preferred styles
  if (personality.preferredStyles.length > 0) {
    suggestions.push({
      type: 'style',
      content: `Consider using ${personality.preferredStyles.slice(0, 3).join(', ')} styles from ${personality.projectName}`,
      confidence: 0.75,
      source: personality.projectName
    });
  }

  // Technique suggestions from successful elements
  if (personality.successfulElements.length > 0) {
    const topTechniques = personality.successfulElements.slice(0, 2);
    suggestions.push({
      type: 'technique',
      content: `Techniques that worked well: ${topTechniques.join(', ')}`,
      confidence: 0.8,
      source: personality.projectName
    });
  }

  // Trait-based suggestions
  if (personality.traits.length > 0) {
    const relevantTraits = personality.traits.filter(trait =>
      query.toLowerCase().includes(trait.toLowerCase())
    );

    if (relevantTraits.length > 0) {
      suggestions.push({
        type: 'prompt',
        content: `Incorporate these traits: ${relevantTraits.join(', ')}`,
        confidence: 0.7,
        source: personality.projectName
      });
    }
  }

  // Context-aware suggestions
  context.forEach((ctx, idx) => {
    if (ctx.type === 'project_memory' && idx < 2) {
      suggestions.push({
        type: 'element',
        content: ctx.content,
        confidence: 0.65,
        source: `${personality.projectName} memory`
      });
    }
  });

  return suggestions;
}

/**
 * Determine type of influence
 */
function determineInfluenceType(
  personality: ProjectPersonality,
  targetContext?: any
): string {
  if (!targetContext) return 'general';

  if (targetContext.currentTheme && personality.traits.some(trait =>
      trait.includes('theme'))) {
    return 'style_influence';
  }

  if (targetContext.currentStyle) {
    return 'style_influence';
  }

  if (targetContext.goal) {
    return 'technique_adoption';
  }

  return 'general';
}

/**
 * Auto-discover cross-project references
 */
export async function discoverCrossProjectReferences(
  projectId: string
): Promise<void> {
  const project = await db.project.findUnique({
    where: { id: projectId }
  });

  if (!project) return;

  const allProjects = await db.project.findMany({
    where: { id: { not: projectId } }
  });

  // Use RAG to find similar projects
  for (const otherProject of allProjects) {
    const similarity = await calculateProjectSimilarity(projectId, otherProject.id);

    // If projects are similar, create reference
    if (similarity > 0.6) {
      const projectMemories = await db.projectMemory.findMany({
        where: { projectId },
        take: 10
      });

      const commonTraits = projectMemories
        .filter(m => m.importance > 0.7)
        .map(m => m.title)
        .slice(0, 3);

      if (commonTraits.length > 0) {
        await createCrossProjectReference(
          projectId,
          otherProject.id,
          'style_influence',
          `Shares style traits: ${commonTraits.join(', ')}`,
          'Auto-discovered based on similarity'
        );
      }
    }
  }
}

/**
 * Calculate similarity between two projects
 */
async function calculateProjectSimilarity(
  projectId1: string,
  projectId2: string
): Promise<number> {
  const project1 = await db.project.findUnique({
    where: { id: projectId1 }
  });

  const project2 = await db.project.findUnique({
    where: { id: projectId2 }
  });

  if (!project1 || !project2) return 0;

  let similarity = 0;

  // Theme similarity
  if (project1.theme && project2.theme) {
    similarity += project1.theme === project2.theme ? 0.3 : 0;
  }

  // Art style similarity
  if (project1.artStyle && project2.artStyle) {
    similarity += project1.artStyle === project2.artStyle ? 0.2 : 0;
  }

  // Mood similarity
  if (project1.mood && project2.mood) {
    similarity += project1.mood === project2.mood ? 0.2 : 0;
  }

  // Project type similarity
  if (project1.projectType && project2.projectType) {
    similarity += project1.projectType === project2.projectType ? 0.3 : 0;
  }

  return Math.min(1.0, similarity);
}

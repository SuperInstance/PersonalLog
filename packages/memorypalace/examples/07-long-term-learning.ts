/**
 * Example 7: Long-term Learning
 *
 * Demonstrates persistent knowledge retention over time:
 * - Storing learned patterns and skills
 * - Cross-session memory persistence
 * - Building knowledge graphs
 *
 * @module examples/long-term-learning
 */

import { MemoryPalace } from '../src/index.js';

interface LearnedSkill {
  name: string;
  proficiency: number;  // 0-1
  lastPracticed: number;
  practiceCount: number;
}

interface UserPreference {
  category: string;
  preferences: string[];
  confidence: number;
  lastUpdated: number;
}

async function longTermLearningDemo() {
  console.log('=== MemoryPalace: Long-term Learning Demo ===\n');

  const memory = new MemoryPalace({
    consolidation: {
      shortToLongTermThreshold: 0.7,
      workingMaxSize: 20,
      shortTermMaxSize: 500,
      longTermMaxSize: 10000
    }
  });

  console.log('1. Learning User Preferences Over Sessions:\n');

  // Session 1: Initial interactions
  console.log('  Session 1 - Learning initial preferences...');

  await memory.longTerm.store(
    {
      type: 'preference',
      category: 'communication',
      data: { style: 'concise', tone: 'professional', detailLevel: 'high' }
    } as UserPreference,
    {
      agentId: 'learning-agent',
      tags: ['user-preference', 'communication', 'session-1'],
      importance: 0.75
    }
  );

  await memory.longTerm.store(
    {
      type: 'preference',
      category: 'topics',
      data: { interests: ['AI', 'machine learning', 'webgpu'], dislikes: ['politics'] }
    } as UserPreference,
    {
      agentId: 'learning-agent',
      tags: ['user-preference', 'topics', 'session-1'],
      importance: 0.8
    }
  );

  // Session 2: More interactions
  console.log('  Session 2 - Refining preferences...');

  await memory.longTerm.store(
    {
      type: 'preference',
      category: 'communication',
      data: { style: 'concise', tone: 'friendly', detailLevel: 'medium', useExamples: true }
    } as UserPreference,
    {
      agentId: 'learning-agent',
      tags: ['user-preference', 'communication', 'session-2'],
      importance: 0.85
    }
  );

  console.log('  Session 3 - New topics discovered...');

  await memory.longTerm.store(
    {
      type: 'preference',
      category: 'topics',
      data: {
        interests: ['AI', 'machine learning', 'webgpu', 'rust', 'neural networks'],
        dislikes: ['politics', 'celebrity news']
      } as UserPreference
    },
    {
      agentId: 'learning-agent',
      tags: ['user-preference', 'topics', 'session-3'],
      importance: 0.9
    }
  );

  console.log('\n2. Building Skills Knowledge Base:\n');

  // Track agent's learned skills
  const skills: LearnedSkill[] = [
    { name: 'semantic-search', proficiency: 0.9, lastPracticed: Date.now(), practiceCount: 50 },
    { name: 'code-generation', proficiency: 0.85, lastPracticed: Date.now(), practiceCount: 45 },
    { name: 'summarization', proficiency: 0.95, lastPracticed: Date.now(), practiceCount: 80 },
    { name: 'translation', proficiency: 0.7, lastPracticed: Date.now(), practiceCount: 20 },
    { name: 'reasoning', proficiency: 0.8, lastPracticed: Date.now(), practiceCount: 35 }
  ];

  for (const skill of skills) {
    await memory.longTerm.store(skill, {
      agentId: 'learning-agent',
      tags: ['skill', skill.name],
      importance: skill.proficiency
    });
  }

  console.log(`  Stored ${skills.length} learned skills in long-term memory`);

  console.log('\n3. Learning from Mistakes:\n');

  // Store lessons learned from errors
  await memory.longTerm.store(
    {
      type: 'lesson',
      error: 'Generated code with syntax errors',
      solution: 'Always validate code syntax before output',
      prevention: 'Use language server for validation',
      occurrences: 3
    },
    {
      agentId: 'learning-agent',
      tags: ['lesson', 'error-prevention', 'code-quality'],
      importance: 0.85
    }
  );

  await memory.longTerm.store(
    {
      type: 'lesson',
      error: 'Assumed user context without asking',
      solution: 'Always verify context assumptions with user',
      prevention: 'Ask clarifying questions',
      occurrences: 5
    },
    {
      agentId: 'learning-agent',
      tags: ['lesson', 'user-interaction', 'context'],
      importance: 0.9
    }
  );

  console.log('  Stored 2 lessons learned');

  console.log('\n4. Building Knowledge Relationships:\n');

  // Create knowledge graph connections
  await memory.longTerm.store(
    {
      type: 'relationship',
      from: 'webgpu',
      to: 'rust',
      relationship: 'commonly-used-together',
      strength: 0.9
    },
    {
      agentId: 'learning-agent',
      tags: ['relationship', 'knowledge-graph'],
      importance: 0.7
    }
  );

  await memory.longTerm.store(
    {
      type: 'relationship',
      from: 'machine-learning',
      to: 'neural-networks',
      relationship: 'contains',
      strength: 1.0
    },
    {
      agentId: 'learning-agent',
      tags: ['relationship', 'knowledge-graph'],
      importance: 0.8
    }
  );

  console.log('  Created 2 knowledge relationships');

  console.log('\n5. Retrieving Learned Knowledge:\n');

  // Get all user preferences
  const prefs = await memory.retrieve('preference');
  console.log(`  Found ${prefs.length} user preference memories:`);
  for (const pref of prefs.slice(0, 3)) {
    console.log(`    [${pref.tags.join(', ')}] ${JSON.stringify(pref.content).substring(0, 60)}...`);
  }

  // Get skills by proficiency
  console.log('\n  High-proficiency skills (>= 0.85):');
  const skillMemories = await memory.retrieve('skill');
  const highProficiency = skillMemories
    .map(m => m.content as LearnedSkill)
    .filter(s => s.proficiency >= 0.85)
    .sort((a, b) => b.proficiency - a.proficiency);

  for (const skill of highProficiency) {
    console.log(`    ${skill.name}: ${(skill.proficiency * 100).toFixed(0)}% (${skill.practiceCount} practices)`);
  }

  console.log('\n6. Analyzing Learning Patterns:\n');

  // Get lessons to prevent recurring errors
  const lessons = await memory.retrieve('lesson');
  console.log(`  Learned ${lessons.length} lessons from mistakes:`);
  for (const lesson of lessons) {
    const l = lesson.content;
    console.log(`    - "${l.error}" occurred ${l.occurrences} times`);
    console.log(`      Solution: ${l.solution}`);
  }

  console.log('\n7. Long-term Statistics:\n');

  const stats = memory.getStats();
  console.log(`  Long-term memories: ${stats.longTerm.count}`);
  console.log(`  Total learning artifacts stored: ${stats.totalMemories}`);

  // Get by categories
  const byTag = async (tag: string) => (await memory.getByTag(tag)).length;
  console.log(`  Skills: ${await byTag('skill')}`);
  console.log(`  Lessons: ${await byTag('lesson')}`);
  console.log(`  User preferences: ${await byTag('user-preference')}`);

  console.log('\n8. Simulating Cross-Session Persistence:\n');

  console.log('  Agent session ending...');
  console.log('  All learned knowledge persisted in long-term memory');
  console.log('  Agent can resume and recall all learned information');

  await memory.destroy();
  console.log('\n✓ Long-term learning demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  longTermLearningDemo().catch(console.error);
}

export { longTermLearningDemo };

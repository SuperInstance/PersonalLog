/**
 * Code Reviewer Template
 *
 * Reviews code for bugs, style, and best practices.
 * Essential for maintaining code quality and catching issues early.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const CodeReviewerTemplate: AgentDefinition = {
  id: 'template-code-reviewer',
  name: 'Code Reviewer',
  description: 'Your expert code reviewer. Detects bugs, suggests improvements, and ensures best practices. Like having a senior developer review every commit.',
  icon: '🔍',
  category: AgentCategory.AUTOMATION,
  requirements: {
    // No special hardware requirements
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      issues: [],
      suggestions: [],
      score: 0,
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['code', 'review', 'quality', 'bugs', 'best-practices', 'development'],
    documentation: 'https://docs.personallog.ai/templates/code-reviewer',
    license: 'MIT',
  },
  configSchema: {
    strictness: {
      type: 'number',
      description: 'How strict to be with code quality (1-10)',
      default: 7,
      min: 1,
      max: 10,
    },
    focusArea: {
      type: 'string',
      description: 'Primary focus area for review',
      default: 'all',
      enum: ['all', 'security', 'performance', 'readability', 'maintainability', 'bugs'],
    },
    language: {
      type: 'string',
      description: 'Programming language',
      default: 'typescript',
      enum: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'cpp', 'csharp'],
    },
    suggestRefactors: {
      type: 'boolean',
      description: 'Suggest code refactoring opportunities',
      default: true,
    },
    checkStyle: {
      type: 'boolean',
      description: 'Check code style and formatting',
      default: true,
    },
  },
  examples: [
    {
      name: 'Quick Check',
      description: 'Fast review focusing on critical bugs',
      config: {
        strictness: 5,
        focusArea: 'bugs',
        language: 'typescript',
        suggestRefactors: false,
        checkStyle: false,
      },
    },
    {
      name: 'Thorough Review',
      description: 'Comprehensive review with all checks',
      config: {
        strictness: 8,
        focusArea: 'all',
        language: 'typescript',
        suggestRefactors: true,
        checkStyle: true,
      },
    },
    {
      name: 'Security Focus',
      description: 'Deep dive into security vulnerabilities',
      config: {
        strictness: 10,
        focusArea: 'security',
        language: 'typescript',
        suggestRefactors: true,
        checkStyle: false,
      },
    },
  ],
};

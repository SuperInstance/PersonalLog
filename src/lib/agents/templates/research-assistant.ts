/**
 * Research Assistant Template
 *
 * Helps with academic papers, citations, literature review.
 * Ideal for students, researchers, and academics.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const ResearchAssistantTemplate: AgentDefinition = {
  id: 'template-research-assistant',
  name: 'Research Assistant',
  description: 'Your academic research companion. Find, summarize, and cite papers with ease. Perfect for literature reviews and academic writing.',
  icon: '📚',
  category: AgentCategory.ANALYSIS,
  requirements: {
    // No special hardware requirements
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      searchQuery: '',
      papers: [],
      citations: [],
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['research', 'academic', 'papers', 'citations', 'literature', 'student'],
    documentation: 'https://docs.personallog.ai/templates/research-assistant',
    license: 'MIT',
  },
  configSchema: {
    searchDepth: {
      type: 'number',
      description: 'Number of papers to search and analyze',
      default: 10,
      min: 1,
      max: 50,
    },
    citationStyle: {
      type: 'string',
      description: 'Citation format style',
      default: 'APA',
      enum: ['APA', 'MLA', 'Chicago', 'IEEE', 'Harvard'],
    },
    summarizeLength: {
      type: 'string',
      description: 'Summary length preference',
      default: 'medium',
      enum: ['brief', 'medium', 'detailed'],
    },
    includeAbstracts: {
      type: 'boolean',
      description: 'Include paper abstracts in results',
      default: true,
    },
  },
  examples: [
    {
      name: 'Quick Literature Review',
      description: 'Fast overview of research on a topic',
      config: {
        searchDepth: 10,
        citationStyle: 'APA',
        summarizeLength: 'brief',
        includeAbstracts: false,
      },
    },
    {
      name: 'Deep Research',
      description: 'Comprehensive analysis with full details',
      config: {
        searchDepth: 30,
        citationStyle: 'APA',
        summarizeLength: 'detailed',
        includeAbstracts: true,
      },
    },
    {
      name: 'Citation Helper',
      description: 'Focus on proper citations and references',
      config: {
        searchDepth: 15,
        citationStyle: 'MLA',
        summarizeLength: 'medium',
        includeAbstracts: true,
      },
    },
  ],
};

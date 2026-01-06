/**
 * Creative Writer Template
 *
 * Helps with storytelling, creative writing, and content creation.
 * Perfect for authors, content creators, and anyone who loves writing.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const CreativeWriterTemplate: AgentDefinition = {
  id: 'template-creative-writer',
  name: 'Creative Writer',
  description: 'Your creative writing partner. Brainstorm plots, develop characters, overcome writer\'s block, and polish your prose. From short stories to novels.',
  icon: '✍️',
  category: AgentCategory.CREATIVE,
  requirements: {
    // No special hardware requirements
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      storyIdeas: [],
      characters: [],
      scenes: [],
      drafts: [],
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['writing', 'creative', 'storytelling', 'fiction', 'content', 'author'],
    documentation: 'https://docs.personallog.ai/templates/creative-writer',
    license: 'MIT',
  },
  configSchema: {
    genre: {
      type: 'string',
      description: 'Writing genre preference',
      default: 'general',
      enum: ['general', 'fantasy', 'sci-fi', 'romance', 'thriller', 'mystery', 'horror', 'literary'],
    },
    tone: {
      type: 'string',
      description: 'Tone of writing',
      default: 'neutral',
      enum: ['formal', 'neutral', 'casual', 'humorous', 'dramatic', 'dark'],
    },
    writingStyle: {
      type: 'string',
      description: 'Writing style',
      default: 'descriptive',
      enum: ['concise', 'descriptive', 'poetic', 'conversational', 'academic', 'journalistic'],
    },
    assistanceLevel: {
      type: 'string',
      description: 'How much help to provide',
      default: 'collaborative',
      enum: ['minimal', 'collaborative', 'extensive'],
    },
  },
  examples: [
    {
      name: 'Novel Writing',
      description: 'Help with long-form fiction',
      config: {
        genre: 'fantasy',
        tone: 'dramatic',
        writingStyle: 'descriptive',
        assistanceLevel: 'collaborative',
      },
    },
    {
      name: 'Short Stories',
      description: 'Quick, impactful short fiction',
      config: {
        genre: 'sci-fi',
        tone: 'neutral',
        writingStyle: 'concise',
        assistanceLevel: 'extensive',
      },
    },
    {
      name: 'Content Creation',
      description: 'Blog posts, articles, and web content',
      config: {
        genre: 'general',
        tone: 'casual',
        writingStyle: 'conversational',
        assistanceLevel: 'collaborative',
      },
    },
  ],
};

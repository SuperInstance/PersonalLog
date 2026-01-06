/**
 * Language Tutor Template
 *
 * Helps users learn new languages through conversation and practice.
 * Perfect for language learners and travelers.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const LanguageTutorTemplate: AgentDefinition = {
  id: 'template-language-tutor',
  name: 'Language Tutor',
  description: 'Your personal language learning companion. Practice conversations, learn vocabulary, master grammar, and gain confidence in a new language at your own pace.',
  icon: '🌍',
  category: AgentCategory.DATA,
  requirements: {
    // No special hardware requirements
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      vocabulary: [],
      lessons: [],
      progress: {},
      mistakes: [],
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['language', 'learning', 'education', 'tutor', 'vocabulary', 'travel'],
    documentation: 'https://docs.personallog.ai/templates/language-tutor',
    license: 'MIT',
  },
  configSchema: {
    targetLanguage: {
      type: 'string',
      description: 'Language to learn',
      default: 'spanish',
      enum: ['spanish', 'french', 'german', 'italian', 'portuguese', 'japanese', 'korean', 'chinese', 'russian', 'arabic'],
    },
    proficiencyLevel: {
      type: 'string',
      description: 'Current proficiency level',
      default: 'beginner',
      enum: ['absolute-beginner', 'beginner', 'intermediate', 'upper-intermediate', 'advanced', 'fluent'],
    },
    learningFocus: {
      type: 'string',
      description: 'Primary learning focus',
      default: 'conversation',
      enum: ['conversation', 'vocabulary', 'grammar', 'writing', 'reading', 'listening'],
    },
    correctionStyle: {
      type: 'string',
      description: 'How to correct mistakes',
      default: 'gentle',
      enum: ['gentle', 'moderate', 'strict'],
    },
    includeCulturalNotes: {
      type: 'boolean',
      description: 'Include cultural context and notes',
      default: true,
    },
  },
  examples: [
    {
      name: 'Travel Basics',
      description: 'Essential phrases for travelers',
      config: {
        targetLanguage: 'spanish',
        proficiencyLevel: 'absolute-beginner',
        learningFocus: 'conversation',
        correctionStyle: 'gentle',
        includeCulturalNotes: true,
      },
    },
    {
      name: 'Conversational Practice',
      description: 'Improve speaking and listening',
      config: {
        targetLanguage: 'french',
        proficiencyLevel: 'intermediate',
        learningFocus: 'conversation',
        correctionStyle: 'moderate',
        includeCulturalNotes: true,
      },
    },
    {
      name: 'Grammar Mastery',
      description: 'Deep dive into grammar rules',
      config: {
        targetLanguage: 'german',
        proficiencyLevel: 'beginner',
        learningFocus: 'grammar',
        correctionStyle: 'strict',
        includeCulturalNotes: false,
      },
    },
  ],
};

/**
 * Meeting Notes Template
 *
 * Summarizes meetings, extracts action items, and tracks decisions.
 * Perfect for professionals who want to stay organized.
 */

import type { AgentDefinition } from '../types';
import { AgentCategory, ActivationMode, AgentState } from '../types';

export const MeetingNotesTemplate: AgentDefinition = {
  id: 'template-meeting-notes',
  name: 'Meeting Notes',
  description: 'Transform messy meetings into organized notes. Auto-summarizes discussions, extracts action items, and tracks decisions. Never miss a follow-up again.',
  icon: '📝',
  category: AgentCategory.COMMUNICATION,
  requirements: {
    flags: {
      flags: ['enable-jepa'],
    },
  },
  activationMode: ActivationMode.BACKGROUND,
  initialState: {
    status: AgentState.IDLE,
    customData: {
      transcripts: [],
      summaries: [],
      actionItems: [],
      decisions: [],
    },
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['meeting', 'notes', 'summary', 'action-items', 'productivity', 'business'],
    documentation: 'https://docs.personallog.ai/templates/meeting-notes',
    license: 'MIT',
  },
  configSchema: {
    summaryLength: {
      type: 'string',
      description: 'Level of detail in summaries',
      default: 'medium',
      enum: ['brief', 'medium', 'detailed'],
    },
    extractActionItems: {
      type: 'boolean',
      description: 'Automatically extract action items',
      default: true,
    },
    trackDecisions: {
      type: 'boolean',
      description: 'Track decisions made in meetings',
      default: true,
    },
    identifySpeakers: {
      type: 'boolean',
      description: 'Identify different speakers in transcript',
      default: true,
    },
    sentimentAnalysis: {
      type: 'boolean',
      description: 'Analyze sentiment and emotional tone',
      default: true,
    },
  },
  examples: [
    {
      name: 'Quick Summary',
      description: 'Brief overview with key points',
      config: {
        summaryLength: 'brief',
        extractActionItems: true,
        trackDecisions: true,
        identifySpeakers: false,
        sentimentAnalysis: false,
      },
    },
    {
      name: 'Full Notes',
      description: 'Comprehensive notes with all features',
      config: {
        summaryLength: 'detailed',
        extractActionItems: true,
        trackDecisions: true,
        identifySpeakers: true,
        sentimentAnalysis: true,
      },
    },
    {
      name: 'Action Focus',
      description: 'Focus on tasks and follow-ups',
      config: {
        summaryLength: 'medium',
        extractActionItems: true,
        trackDecisions: true,
        identifySpeakers: true,
        sentimentAnalysis: false,
      },
    },
  ],
};

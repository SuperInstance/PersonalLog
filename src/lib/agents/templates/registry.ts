/**
 * Agent Template Registry
 *
 * Central registry for all agent templates.
 * Provides helper functions to retrieve templates by ID, category, or search.
 */

import { AgentCategory } from '../types';
import type { AgentDefinition } from '../types';
import { ResearchAssistantTemplate } from './research-assistant';
import { CodeReviewerTemplate } from './code-reviewer';
import { MeetingNotesTemplate } from './meeting-notes';
import { CreativeWriterTemplate } from './creative-writer';
import { FitnessCoachTemplate } from './fitness-coach';
import { LanguageTutorTemplate } from './language-tutor';

/**
 * All available agent templates
 */
export const AGENT_TEMPLATES: AgentDefinition[] = [
  ResearchAssistantTemplate,
  CodeReviewerTemplate,
  MeetingNotesTemplate,
  CreativeWriterTemplate,
  FitnessCoachTemplate,
  LanguageTutorTemplate,
];

/**
 * Template categories for organization
 */
export const TEMPLATE_CATEGORIES = {
  [AgentCategory.ANALYSIS]: {
    label: 'Analysis',
    description: 'Insight generation and research',
    icon: '📊',
  },
  [AgentCategory.KNOWLEDGE]: {
    label: 'Knowledge',
    description: 'Information management and retrieval',
    icon: '📚',
  },
  [AgentCategory.CREATIVE]: {
    label: 'Creative',
    description: 'Content creation and imagination',
    icon: '🎨',
  },
  [AgentCategory.AUTOMATION]: {
    label: 'Automation',
    description: 'Task automation and workflows',
    icon: '⚙️',
  },
  [AgentCategory.COMMUNICATION]: {
    label: 'Communication',
    description: 'Messaging and collaboration',
    icon: '💬',
  },
  [AgentCategory.DATA]: {
    label: 'Learning',
    description: 'Education and skill development',
    icon: '🎓',
  },
} as const;

/**
 * Get template by ID
 *
 * @param templateId - Template ID (e.g., 'template-research-assistant')
 * @returns Template definition or undefined if not found
 */
export function getTemplateById(templateId: string): AgentDefinition | undefined {
  return AGENT_TEMPLATES.find((template) => template.id === templateId);
}

/**
 * Get templates by category
 *
 * @param category - Agent category
 * @returns Array of templates in the category
 */
export function getTemplatesByCategory(category: AgentCategory): AgentDefinition[] {
  return AGENT_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Search templates by query
 *
 * @param query - Search query string
 * @returns Array of matching templates
 */
export function searchTemplates(query: string): AgentDefinition[] {
  const lowerQuery = query.toLowerCase();

  return AGENT_TEMPLATES.filter((template) => {
    // Search in name, description, and tags
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.metadata.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get all unique categories from templates
 *
 * @returns Array of categories that have templates
 */
export function getTemplateCategories(): AgentCategory[] {
  const categories = new Set(AGENT_TEMPLATES.map((template) => template.category));
  return Array.from(categories);
}

/**
 * Get featured templates (curated selection)
 *
 * @returns Array of featured templates
 */
export function getFeaturedTemplates(): AgentDefinition[] {
  // Return a curated selection of templates
  return [
    ResearchAssistantTemplate,
    MeetingNotesTemplate,
    CreativeWriterTemplate,
  ];
}

/**
 * Get popular templates (most used)
 *
 * @returns Array of popular templates
 */
export function getPopularTemplates(): AgentDefinition[] {
  // In a real app, this would be based on actual usage data
  // For now, return a curated selection
  return [
    ResearchAssistantTemplate,
    CodeReviewerTemplate,
    FitnessCoachTemplate,
  ];
}

/**
 * Get new/recent templates
 *
 * @returns Array of new templates
 */
export function getNewTemplates(): AgentDefinition[] {
  // All templates are currently new
  return AGENT_TEMPLATES;
}

/**
 * Filter templates by requirements
 *
 * @param hardwareScore - Hardware score (0-100)
 * @returns Array of compatible templates
 */
export function getCompatibleTemplates(hardwareScore: number): AgentDefinition[] {
  return AGENT_TEMPLATES.filter((template) => {
    // If no requirements, it's compatible
    if (!template.requirements) {
      return true;
    }

    // Check hardware requirements
    if (template.requirements.hardware?.minJEPAScore) {
      return hardwareScore >= template.requirements.hardware.minJEPAScore;
    }

    return true;
  });
}

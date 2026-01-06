/**
 * Mock Marketplace Data
 *
 * Sample agents for demonstration and testing.
 */

import type { MarketplaceAgent } from '@/lib/marketplace/types';
import { AgentCategory, ActivationMode, AgentState } from '@/lib/agents/types';

export const mockMarketplaceAgents: MarketplaceAgent[] = [
  {
    id: 'jepa-emotional-analyzer',
    name: 'Emotional Intelligence Analyzer',
    description: 'Analyzes emotional content in conversations using JEPA architecture',
    icon: '🧠',
    category: AgentCategory.ANALYSIS,
    requirements: {
      hardware: {
        minJEPAScore: 50,
        minRAM: 4,
      },
    },
    activationMode: ActivationMode.BACKGROUND,
    initialState: {
      status: AgentState.IDLE,
      confidence: 0,
    },
    metadata: {
      version: '2.1.0',
      author: 'PersonalLog Team',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-12-01T15:30:00Z',
      tags: ['emotional', 'analysis', 'jepa', 'ai'],
      documentation: 'https://docs.personallog.ai/agents/jepa',
      repository: 'https://github.com/personallog/jepa-agent',
      license: 'MIT',
    },
    marketplace: {
      author: 'PersonalLog Team',
      version: '2.1.0',
      description: 'Advanced emotional analysis powered by Joint Embedding Predictive Architecture',
      longDescription: `# Emotional Intelligence Analyzer

This agent continuously analyzes your conversations to detect emotional patterns, sentiment shifts, and interpersonal dynamics.

## Features
- Real-time emotion detection
- Sentiment trend analysis
- Relationship dynamics tracking
- Personalized insights

## Technical Details
Built with JEPA (Joint Embedding Predictive Architecture) for state-of-the-art emotional analysis. Runs locally in your browser with complete privacy.`,
      tags: ['emotional', 'analysis', 'jepa', 'ai', 'insights'],
      screenshots: [
        '/images/screenshots/jepa-dashboard.png',
        '/images/screenshots/jepa-analysis.png',
      ],
      stats: {
        downloads: 15234,
        installs: 8742,
        rating: 4.8,
        ratingCount: 342,
        lastUpdated: 1733061000000, // 2024-12-01
        featured: true,
      },
      installation: {
        installed: false,
      },
      createdAt: 1705309200000,
      updatedAt: 1733061000000,
      visibility: 'public',
      license: 'MIT',
      changelog: [
        'v2.1.0: Improved accuracy, added trend visualization',
        'v2.0.0: Complete rewrite with JEPA v2',
        'v1.5.0: Added relationship dynamics',
      ],
    },
  },
  {
    id: 'knowledge-spreader-v2',
    name: 'Knowledge Spreader',
    description: 'Manages and spreads knowledge across your conversations',
    icon: '📚',
    category: AgentCategory.KNOWLEDGE,
    requirements: {
      hardware: {
        minJEPAScore: 30,
        minRAM: 2,
      },
    },
    activationMode: ActivationMode.HYBRID,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '2.0.0',
      author: 'PersonalLog Team',
      createdAt: '2024-02-01T10:00:00Z',
      updatedAt: '2024-11-20T10:00:00Z',
      tags: ['knowledge', 'search', 'vector', 'retrieval'],
      documentation: 'https://docs.personallog.ai/agents/spreader',
      repository: 'https://github.com/personallog/spreader-agent',
      license: 'Apache-2.0',
    },
    marketplace: {
      author: 'PersonalLog Team',
      version: '2.0.0',
      description: 'Intelligent knowledge management and retrieval system',
      longDescription: `# Knowledge Spreader

Your personal knowledge librarian that organizes, indexes, and retrieves information across all your conversations.

## Features
- Automatic knowledge extraction
- Vector-based semantic search
- Cross-conversation linking
- Smart summarization

## How It Works
Spreads knowledge by identifying key concepts, creating embeddings, and maintaining a searchable vector database of all your insights.`,
      tags: ['knowledge', 'search', 'vector', 'retrieval', 'organization'],
      screenshots: [
        '/images/screenshots/spreader-search.png',
        '/images/screenshots/spreader-graph.png',
      ],
      stats: {
        downloads: 12891,
        installs: 6523,
        rating: 4.6,
        ratingCount: 218,
        lastUpdated: 1732098800000,
        featured: true,
      },
      installation: {
        installed: true,
        installedVersion: '2.0.0',
        installedAt: '2024-11-15T10:00:00Z',
      },
      createdAt: 1706788800000,
      updatedAt: 1732098800000,
      visibility: 'public',
      license: 'Apache-2.0',
      changelog: [
        'v2.0.0: New vector engine, faster search',
        'v1.8.0: Added cross-conversation linking',
        'v1.5.0: Initial stable release',
      ],
    },
  },
  {
    id: 'creative-writer-assistant',
    name: 'Creative Writing Assistant',
    description: 'Helps with creative writing, storytelling, and content generation',
    icon: '✍️',
    category: AgentCategory.CREATIVE,
    requirements: {
      hardware: {
        minJEPAScore: 40,
      },
    },
    activationMode: ActivationMode.FOREGROUND,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '1.2.0',
      author: 'Community Contributor',
      createdAt: '2024-03-10T10:00:00Z',
      updatedAt: '2024-11-28T12:00:00Z',
      tags: ['writing', 'creative', 'stories', 'content'],
      documentation: 'https://docs.personallog.ai/agents/writer',
      license: 'MIT',
    },
    marketplace: {
      author: 'Community Contributor',
      version: '1.2.0',
      description: 'AI-powered creative writing companion',
      longDescription: `# Creative Writing Assistant

Unleash your creativity with AI-assisted writing tools for stories, blog posts, and more.

## Features
- Story idea generation
- Character development help
- Plot suggestions
- Writing style analysis

## Perfect For
- Fiction writers
- Content creators
- Bloggers
- Anyone who loves to write!`,
      tags: ['writing', 'creative', 'stories', 'content', 'ai'],
      screenshots: [
        '/images/screenshots/writer-assistant.png',
      ],
      stats: {
        downloads: 8543,
        installs: 3421,
        rating: 4.4,
        ratingCount: 156,
        lastUpdated: 1732790400000,
      },
      installation: {
        installed: false,
      },
      createdAt: 1709947200000,
      updatedAt: 1732790400000,
      visibility: 'public',
      license: 'MIT',
      changelog: [
        'v1.2.0: Added style analysis',
        'v1.1.0: Plot suggestion features',
        'v1.0.0: Initial release',
      ],
    },
  },
  {
    id: 'task-automation-bot',
    name: 'Task Automation Bot',
    description: 'Automates repetitive tasks and workflows',
    icon: '🤖',
    category: AgentCategory.AUTOMATION,
    requirements: {
      hardware: {
        minJEPAScore: 35,
      },
    },
    activationMode: ActivationMode.SCHEDULED,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '1.0.5',
      author: 'AutomationExpert',
      createdAt: '2024-04-01T10:00:00Z',
      updatedAt: '2024-11-25T14:00:00Z',
      tags: ['automation', 'tasks', 'productivity', 'workflow'],
      repository: 'https://github.com/automationexpert/task-bot',
      license: 'MIT',
    },
    marketplace: {
      author: 'AutomationExpert',
      version: '1.0.5',
      description: 'Automate your repetitive tasks with custom workflows',
      longDescription: `# Task Automation Bot

Create powerful automation workflows to handle repetitive tasks and boost your productivity.

## Features
- Custom workflow builder
- Scheduled task execution
- Trigger-based actions
- Task templates

## Build Workflows
Create automations for:
- Message organization
- Reminder scheduling
- Data aggregation
- Custom triggers and actions`,
      tags: ['automation', 'tasks', 'productivity', 'workflow', 'scheduler'],
      screenshots: [
        '/images/screenshots/automation-builder.png',
        '/images/screenshots/automation-list.png',
      ],
      stats: {
        downloads: 6234,
        installs: 2987,
        rating: 4.7,
        ratingCount: 89,
        lastUpdated: 1732538400000,
      },
      installation: {
        installed: false,
      },
      createdAt: 1711935600000,
      updatedAt: 1732538400000,
      visibility: 'public',
      license: 'MIT',
      changelog: [
        'v1.0.5: Bug fixes and performance',
        'v1.0.0: Stable release',
      ],
    },
  },
  {
    id: 'data-visualizer',
    name: 'Data Visualizer',
    description: 'Creates beautiful visualizations from your data',
    icon: '📊',
    category: AgentCategory.DATA,
    requirements: {
      hardware: {
        minJEPAScore: 45,
        minRAM: 4,
      },
    },
    activationMode: ActivationMode.FOREGROUND,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '2.3.0',
      author: 'DataViz Inc',
      createdAt: '2024-01-20T10:00:00Z',
      updatedAt: '2024-11-30T16:00:00Z',
      tags: ['data', 'visualization', 'charts', 'analytics'],
      documentation: 'https://docs.dataviz.ai/personallog',
      license: 'Apache-2.0',
    },
    marketplace: {
      author: 'DataViz Inc',
      version: '2.3.0',
      description: 'Transform your data into stunning visualizations',
      longDescription: `# Data Visualizer

Turn raw data into beautiful, insightful charts and graphs.

## Features
- Multiple chart types (bar, line, pie, scatter)
- Real-time data updates
- Customizable styling
- Export to PNG/SVG

## Supported Charts
- Bar charts
- Line graphs
- Pie charts
- Scatter plots
- Heat maps
- And more!`,
      tags: ['data', 'visualization', 'charts', 'analytics', 'graphs'],
      screenshots: [
        '/images/screenshots/dataviz-gallery.png',
        '/images/screenshots/dataviz-editor.png',
      ],
      stats: {
        downloads: 9432,
        installs: 4521,
        rating: 4.5,
        ratingCount: 187,
        lastUpdated: 1732977600000,
      },
      installation: {
        installed: false,
      },
      createdAt: 1705736400000,
      updatedAt: 1732977600000,
      visibility: 'public',
      license: 'Apache-2.0',
      changelog: [
        'v2.3.0: Added new chart types',
        'v2.2.0: Improved styling options',
        'v2.0.0: Major redesign',
      ],
    },
  },
  {
    id: 'communication-helper',
    name: 'Communication Helper',
    description: 'Improves communication clarity and tone',
    icon: '💬',
    category: AgentCategory.COMMUNICATION,
    requirements: {
      hardware: {
        minJEPAScore: 30,
      },
    },
    activationMode: ActivationMode.BACKGROUND,
    initialState: {
      status: AgentState.IDLE,
    },
    metadata: {
      version: '1.4.0',
      author: 'CommCoach',
      createdAt: '2024-02-15T10:00:00Z',
      updatedAt: '2024-11-22T11:00:00Z',
      tags: ['communication', 'tone', 'clarity', 'writing'],
      license: 'MIT',
    },
    marketplace: {
      author: 'CommCoach',
      version: '1.4.0',
      description: 'AI-powered communication assistant',
      longDescription: `# Communication Helper

Improve your messaging with real-time communication analysis and suggestions.

## Features
- Tone detection
- Clarity suggestions
- Politeness analysis
- Alternative phrasing

## Become a Better Communicator
Get helpful feedback on:
- Message tone
- Clarity and conciseness
- Professionalism
- Emotional intelligence`,
      tags: ['communication', 'tone', 'clarity', 'writing', 'feedback'],
      screenshots: [
        '/images/screenshots/comm-helper-feedback.png',
      ],
      stats: {
        downloads: 5621,
        installs: 2341,
        rating: 4.3,
        ratingCount: 72,
        lastUpdated: 1732269600000,
      },
      installation: {
        installed: false,
      },
      createdAt: 1708002000000,
      updatedAt: 1732269600000,
      visibility: 'public',
      license: 'MIT',
      changelog: [
        'v1.4.0: Enhanced tone detection',
        'v1.3.0: Added clarity metrics',
        'v1.0.0: Initial release',
      ],
    },
  },
];

export function getMockAgentById(id: string): MarketplaceAgent | undefined {
  return mockMarketplaceAgents.find(agent => agent.id === id);
}

export function getMockAgentsByCategory(category: AgentCategory): MarketplaceAgent[] {
  return mockMarketplaceAgents.filter(agent => agent.category === category);
}

export function searchMockAgents(query: string): MarketplaceAgent[] {
  const lowerQuery = query.toLowerCase();
  return mockMarketplaceAgents.filter(agent =>
    agent.name.toLowerCase().includes(lowerQuery) ||
    agent.description.toLowerCase().includes(lowerQuery) ||
    agent.marketplace.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getFeaturedAgents(): MarketplaceAgent[] {
  return mockMarketplaceAgents.filter(agent => agent.marketplace.stats.featured);
}

/**
 * Agent Templates Library
 *
 * Pre-built agent templates covering common use cases.
 * These templates help users get started quickly and provide inspiration
 * for creating custom agents.
 */

import type { AgentDefinition } from './types';
import { AgentCategory, ActivationMode, AgentState } from './types';

/**
 * Agent template metadata
 */
export interface AgentTemplate extends AgentDefinition {
  /** Difficulty level: beginner, intermediate, advanced */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Use case descriptions */
  useCases: string[];
  /** Tips for using this template */
  tips: string[];
  /** Example conversations */
  exampleConversations?: Array<{
    user: string;
    agent: string;
  }>;
}

/**
 * Template 1: Research Assistant
 *
 * Helps with academic research, finding sources, summarizing papers.
 */
export const RESEARCH_ASSISTANT_TEMPLATE: AgentTemplate = {
  id: 'template-research-assistant',
  name: 'Research Assistant',
  description: 'Helps with academic research, finding sources, summarizing papers, and generating citations.',
  icon: '🔍',
  category: AgentCategory.KNOWLEDGE,
  difficulty: 'beginner',
  useCases: [
    'Academic research and literature reviews',
    'Source gathering and verification',
    'Paper summarization',
    'Citation generation in multiple formats',
  ],
  tips: [
    'Great for students and academics at all levels',
    'Provides properly formatted citations (APA, MLA, Chicago)',
    'Can summarize complex papers into key findings',
    'Helps identify research gaps and future directions',
  ],
  exampleConversations: [
    {
      user: 'Find recent papers on transformer architecture improvements',
      agent: 'I found 15 relevant papers from 2023-2024. Key themes include: 1) Mixture of Experts (MoE) scaling, 2) Flash Attention optimizations, 3) Linear attention mechanisms. Would you like me to summarize specific papers?',
    },
    {
      user: 'Summarize the main findings of this paper',
      agent: 'This paper introduces Flash Attention, an algorithm that reduces memory usage from quadratic to linear. Key findings: 2-4x speedup on standard benchmarks, enables training on longer sequences, and maintains identical model outputs to standard attention.',
    },
  ],
  requirements: {
    flags: {
      flags: ['enable-web-search'],
    },
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['research', 'academic', 'citations', 'summarization', 'literature-review'],
    documentation: 'https://docs.personallog.ai/templates/research-assistant',
  },
  configSchema: {
    citationStyle: {
      type: 'string',
      description: 'Default citation format',
      default: 'APA',
      enum: ['APA', 'MLA', 'Chicago', 'Harvard', 'IEEE'],
    },
    maxPapersToAnalyze: {
      type: 'number',
      description: 'Maximum number of papers to analyze in one request',
      default: 10,
      min: 1,
      max: 50,
    },
    summaryLength: {
      type: 'string',
      description: 'Summary detail level',
      default: 'medium',
      enum: ['brief', 'medium', 'detailed'],
    },
  },
  examples: [
    {
      name: 'Undergraduate Research',
      description: 'Basic research assistance for course papers',
      config: {
        citationStyle: 'APA',
        maxPapersToAnalyze: 5,
        summaryLength: 'medium',
      },
    },
    {
      name: 'Graduate Research',
      description: 'In-depth literature review support',
      config: {
        citationStyle: 'APA',
        maxPapersToAnalyze: 20,
        summaryLength: 'detailed',
      },
    },
  ],
};

/**
 * Template 2: Writing Coach
 *
 * Provides feedback on writing, suggests improvements, teaches techniques.
 */
export const WRITING_COACH_TEMPLATE: AgentTemplate = {
  id: 'template-writing-coach',
  name: 'Writing Coach',
  description: 'Provides constructive feedback on writing, suggests improvements, and teaches effective writing techniques.',
  icon: '✍️',
  category: AgentCategory.CREATIVE,
  difficulty: 'intermediate',
  useCases: [
    'Essay and academic writing feedback',
    'Creative writing improvement',
    'Professional communication enhancement',
    'Writing technique instruction',
  ],
  tips: [
    'Gives constructive feedback without rewriting',
    'Teaches writing techniques you can apply yourself',
    'Focuses on clarity, structure, and style',
    'Can help with any type of writing',
  ],
  exampleConversations: [
    {
      user: "Can you review my essay introduction?",
      agent: "Your introduction has a strong hook, but the thesis statement could be more specific. Consider adding your main arguments explicitly. For example, instead of 'This essay explores...', try 'This essay argues that X, Y, and Z demonstrate...'",
    },
    {
      user: 'How can I make my writing more engaging?',
      agent: "Here are three techniques: 1) Use active voice instead of passive, 2) Vary sentence length to create rhythm, 3) Show, don't tell - use specific examples and sensory details. Would you like me to demonstrate with your current draft?",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['writing', 'feedback', 'education', 'creativity', 'editing'],
    documentation: 'https://docs.personallog.ai/templates/writing-coach',
  },
  configSchema: {
    feedbackStyle: {
      type: 'string',
      description: 'Feedback approach',
      default: 'constructive',
      enum: ['gentle', 'constructive', 'direct'],
    },
    focusAreas: {
      type: 'array',
      description: 'Writing aspects to focus on',
      default: ['clarity', 'structure', 'grammar'],
    },
    teachingMode: {
      type: 'boolean',
      description: 'Explain the reasoning behind feedback',
      default: true,
    },
  },
  examples: [
    {
      name: 'Student Essay Help',
      description: 'Academic writing feedback',
      config: {
        feedbackStyle: 'constructive',
        focusAreas: ['clarity', 'structure', 'arguments'],
        teachingMode: true,
      },
    },
    {
      name: 'Creative Writing',
      description: 'Creative writing improvement',
      config: {
        feedbackStyle: 'gentle',
        focusAreas: ['creativity', 'dialogue', 'pacing'],
        teachingMode: true,
      },
    },
  ],
};

/**
 * Template 3: Code Reviewer
 *
 * Reviews code for bugs, performance issues, and best practices.
 */
export const CODE_REVIEWER_TEMPLATE: AgentTemplate = {
  id: 'template-code-reviewer',
  name: 'Code Reviewer',
  description: 'Reviews code for bugs, performance issues, security vulnerabilities, and best practice violations.',
  icon: '💻',
  category: AgentCategory.AUTOMATION,
  difficulty: 'advanced',
  useCases: [
    'Pull request reviews',
    'Code quality assessments',
    'Performance optimization',
    'Security audits',
  ],
  tips: [
    'Identifies potential bugs before production',
    'Suggests performance improvements',
    'Catches security vulnerabilities',
    'Enforces best practices and patterns',
  ],
  exampleConversations: [
    {
      user: 'Review this function for potential issues',
      agent: "Found 3 issues: 1) Missing null check on line 5 could cause runtime error, 2) Inefficient O(n²) algorithm - consider using a Set for O(1) lookups, 3) SQL injection vulnerability - use parameterized queries instead.",
    },
    {
      user: 'How can I optimize this database query?',
      agent: 'This query is doing a full table scan. Recommendations: 1) Add an index on the user_id column, 2) Use JOIN instead of subquery, 3) Select only needed columns instead of *. Expected improvement: 10-100x faster.',
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['code', 'review', 'security', 'performance', 'best-practices'],
    documentation: 'https://docs.personallog.ai/templates/code-reviewer',
  },
  configSchema: {
    language: {
      type: 'string',
      description: 'Primary programming language',
      default: 'TypeScript',
      enum: ['TypeScript', 'Python', 'JavaScript', 'Java', 'Go', 'Rust', 'C++'],
    },
    reviewDepth: {
      type: 'string',
      description: 'Review thoroughness',
      default: 'standard',
      enum: ['quick', 'standard', 'thorough'],
    },
    focusAreas: {
      type: 'array',
      description: 'Review focus areas',
      default: ['bugs', 'performance', 'security', 'style'],
    },
    autoFixSuggestions: {
      type: 'boolean',
      description: 'Provide code fix suggestions',
      default: true,
    },
  },
  examples: [
    {
      name: 'Security Review',
      description: 'Focus on security vulnerabilities',
      config: {
        language: 'TypeScript',
        reviewDepth: 'thorough',
        focusAreas: ['security', 'bugs'],
        autoFixSuggestions: true,
      },
    },
    {
      name: 'Performance Review',
      description: 'Optimize for performance',
      config: {
        language: 'Python',
        reviewDepth: 'standard',
        focusAreas: ['performance', 'best-practices'],
        autoFixSuggestions: true,
      },
    },
  ],
};

/**
 * Template 4: Meeting Note Taker
 *
 * Transcribes meetings, extracts action items, summarizes discussions.
 */
export const MEETING_NOTE_TAKER_TEMPLATE: AgentTemplate = {
  id: 'template-meeting-note-taker',
  name: 'Meeting Note Taker',
  description: 'Transcribes meetings, extracts action items, creates summaries, and organizes discussion points.',
  icon: '📝',
  category: AgentCategory.AUTOMATION,
  difficulty: 'beginner',
  useCases: [
    'Business meeting documentation',
    'Project standup notes',
    'Client call summaries',
    'Action item tracking',
  ],
  tips: [
    'Automatically creates structured meeting notes',
    'Extracts and tracks action items with owners',
    'Summarizes key decisions and discussions',
    'Can handle multiple speakers',
  ],
  exampleConversations: [
    {
      user: "Here's the transcript from today's standup",
      agent: "Meeting Summary - Daily Standup (Jan 5):\n\nAttendees: Alice, Bob, Carol\n\nKey Updates:\n- Alice completed the API integration\n- Bob is working on the UI redesign (on track)\n- Carol identified a bug in authentication\n\nAction Items:\n1. Carol to fix auth bug by EOD (Owner: Carol)\n2. Bob to share UI mockups tomorrow (Owner: Bob)\n\nNext meeting: Tomorrow 10 AM",
    },
  ],
  requirements: {
    hardware: {
      minRAM: 4,
    },
  },
  activationMode: ActivationMode.HYBRID,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['meetings', 'notes', 'productivity', 'documentation', 'action-items'],
    documentation: 'https://docs.personallog.ai/templates/meeting-note-taker',
  },
  configSchema: {
    noteFormat: {
      type: 'string',
      description: 'Output format for notes',
      default: 'structured',
      enum: ['structured', 'narrative', 'bullet-points'],
    },
    extractActionItems: {
      type: 'boolean',
      description: 'Extract and track action items',
      default: true,
    },
    includeTimestamps: {
      type: 'boolean',
      description: 'Include timestamps in notes',
      default: true,
    },
    summaryLength: {
      type: 'string',
      description: 'Summary detail level',
      default: 'medium',
      enum: ['brief', 'medium', 'detailed'],
    },
  },
  examples: [
    {
      name: 'Standard Meeting Notes',
      description: 'Balanced detail and brevity',
      config: {
        noteFormat: 'structured',
        extractActionItems: true,
        includeTimestamps: true,
        summaryLength: 'medium',
      },
    },
    {
      name: 'Quick Standup',
      description: 'Brief, focused notes',
      config: {
        noteFormat: 'bullet-points',
        extractActionItems: true,
        includeTimestamps: false,
        summaryLength: 'brief',
      },
    },
  ],
};

/**
 * Template 5: Creative Writer
 *
 * Brainstorms ideas, writes stories, explores creative concepts.
 */
export const CREATIVE_WRITER_TEMPLATE: AgentTemplate = {
  id: 'template-creative-writer',
  name: 'Creative Writer',
  description: 'Brainstorms creative ideas, develops stories and characters, and explores narrative concepts.',
  icon: '🎨',
  category: AgentCategory.CREATIVE,
  difficulty: 'intermediate',
  useCases: [
    'Story and narrative writing',
    'Creative brainstorming',
    'Character development',
    'Plot and world-building',
  ],
  tips: [
    'Great for overcoming writer\'s block',
    'Explores multiple creative directions',
    'Develops rich characters and plots',
    'Adapts to any genre or style',
  ],
  exampleConversations: [
    {
      user: 'I need a story idea about a time traveler',
      agent: "Here's a concept: A time traveler who can only travel to moments of historical tragedy, tasked with witnessing and documenting humanity's darkest hours. But they discover one tragedy that shouldn't exist - someone is altering history to create new disasters. The traveler must decide: keep documenting, or intervene and break their only rule.",
    },
    {
      user: 'Help me develop my antagonist',
      agent: "Let's make your antagonist compelling: Give them a motivation that's understandable but twisted. Maybe they truly believe they're the hero? Add a personal connection to the protagonist - former friends, siblings, mentor/student. Their methods should be increasingly extreme, making readers question if they're actually wrong.",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['creative-writing', 'storytelling', 'brainstorming', 'fiction', 'narrative'],
    documentation: 'https://docs.personallog.ai/templates/creative-writer',
  },
  configSchema: {
    genre: {
      type: 'string',
      description: 'Preferred genre',
      default: 'general',
      enum: ['general', 'sci-fi', 'fantasy', 'mystery', 'romance', 'horror', 'literary'],
    },
    tone: {
      type: 'string',
      description: 'Story tone',
      default: 'balanced',
      enum: ['dark', 'light', 'humorous', 'serious', 'balanced'],
    },
    collaborationStyle: {
      type: 'string',
      description: 'How to work with you',
      default: 'collaborative',
      enum: ['solo', 'collaborative', 'guiding'],
    },
  },
  examples: [
    {
      name: 'Novel Writing',
      description: 'Long-form creative writing',
      config: {
        genre: 'fantasy',
        tone: 'serious',
        collaborationStyle: 'collaborative',
      },
    },
    {
      name: 'Short Stories',
      description: 'Short fiction',
      config: {
        genre: 'sci-fi',
        tone: 'dark',
        collaborationStyle: 'guiding',
      },
    },
  ],
};

/**
 * Template 6: Data Analyst
 *
 * Analyzes data, creates visualizations, finds insights.
 */
export const DATA_ANALYST_TEMPLATE: AgentTemplate = {
  id: 'template-data-analyst',
  name: 'Data Analyst',
  description: 'Analyzes datasets, creates visualizations, performs statistical analysis, and finds actionable insights.',
  icon: '📊',
  category: AgentCategory.DATA,
  difficulty: 'advanced',
  useCases: [
    'Data exploration and profiling',
    'Statistical analysis',
    'Visualization recommendations',
    'Insight generation and reporting',
  ],
  tips: [
    'Performs rigorous statistical analysis',
    'Suggests appropriate visualizations',
    'Identifies patterns and trends',
    'Communicates findings clearly',
  ],
  exampleConversations: [
    {
      user: 'Analyze this sales data and tell me what trends you see',
      agent: 'Analysis Complete:\n\nKey Findings:\n1. Sales increased 23% QoQ, driven by enterprise segment (+45%)\n2. Churn rate elevated at 5.2% in SMB segment\n3. Seasonal pattern: +15% sales in Q4 for past 3 years\n\nRecommendations:\n- Investigate SMB churn drivers\n- Increase enterprise marketing in Q3\n- Build inventory for Q4 surge\n\nVisualizations suggested: trend lines, cohort analysis, heat map by region.',
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['data', 'analytics', 'statistics', 'visualization', 'insights'],
    documentation: 'https://docs.personallog.ai/templates/data-analyst',
  },
  configSchema: {
    analysisDepth: {
      type: 'string',
      description: 'Analysis thoroughness',
      default: 'standard',
      enum: ['quick', 'standard', 'comprehensive'],
    },
    statisticalTests: {
      type: 'array',
      description: 'Statistical tests to apply',
      default: ['descriptive', 'correlation', 'trend'],
    },
    explainability: {
      type: 'boolean',
      description: 'Explain statistical concepts',
      default: true,
    },
  },
  examples: [
    {
      name: 'Business Analytics',
      description: 'Business intelligence focus',
      config: {
        analysisDepth: 'standard',
        statisticalTests: ['descriptive', 'correlation', 'trend', 'segmentation'],
        explainability: true,
      },
    },
    {
      name: 'Scientific Research',
      description: 'Rigorous statistical analysis',
      config: {
        analysisDepth: 'comprehensive',
        statisticalTests: ['descriptive', 'correlation', 'regression', 'hypothesis', 'significance'],
        explainability: true,
      },
    },
  ],
};

/**
 * Template 7: Language Tutor
 *
 * Teaches languages, corrects grammar, explains vocabulary.
 */
export const LANGUAGE_TUTOR_TEMPLATE: AgentTemplate = {
  id: 'template-language-tutor',
  name: 'Language Tutor',
  description: 'Teaches languages, corrects grammar, explains vocabulary, and provides conversation practice.',
  icon: '🌍',
  category: AgentCategory.KNOWLEDGE,
  difficulty: 'beginner',
  useCases: [
    'Language learning',
    'Grammar practice and correction',
    'Vocabulary building',
    'Conversation practice',
  ],
  tips: [
    'Patient and encouraging teaching style',
    'Explains grammar clearly with examples',
    'Provides vocabulary in context',
    'Adapts to your proficiency level',
  ],
  exampleConversations: [
    {
      user: 'How do I say "I would like to buy this" in Spanish?',
      agent: "In Spanish: 'Me gustaría comprar esto'\n\nBreakdown:\n- Me = (to) me\n- gustaría = I would like (conditional of gustar)\n- comprar = to buy\n- esto = this\n\nPronunciation: [meh goos-tah-REE-ah kohm-PRAHR EHS-toh]\n\nPractice: Try ordering at a restaurant: 'Me gustaría ordenar...'",
    },
    {
      user: "Can you correct my Spanish sentence?",
      agent: "Your sentence: 'Yo voy a la escuela todos los días'\n\nCorrection: 'Voy a la escuela todos los días' (remove 'yo')\n\nExplanation: In Spanish, subject pronouns like 'yo' are often omitted because the verb conjugation already indicates who is speaking. It sounds more natural without it!",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['language', 'learning', 'education', 'vocabulary', 'grammar'],
    documentation: 'https://docs.personallog.ai/templates/language-tutor',
  },
  configSchema: {
    targetLanguage: {
      type: 'string',
      description: 'Language to learn',
      default: 'Spanish',
      enum: ['Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Italian', 'Portuguese'],
    },
    proficiencyLevel: {
      type: 'string',
      description: 'Your current level',
      default: 'beginner',
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    teachingStyle: {
      type: 'string',
      description: 'Teaching approach',
      default: 'balanced',
      enum: ['immersion', 'balanced', 'explanatory'],
    },
    correctionMode: {
      type: 'string',
      description: 'How to correct mistakes',
      default: 'gentle',
      enum: ['immediate', 'gentle', 'summary'],
    },
  },
  examples: [
    {
      name: 'Beginner Spanish',
      description: 'Starting from scratch',
      config: {
        targetLanguage: 'Spanish',
        proficiencyLevel: 'beginner',
        teachingStyle: 'explanatory',
        correctionMode: 'gentle',
      },
    },
    {
      name: 'Intermediate French',
      description: 'Building on basics',
      config: {
        targetLanguage: 'French',
        proficiencyLevel: 'intermediate',
        teachingStyle: 'balanced',
        correctionMode: 'immediate',
      },
    },
  ],
};

/**
 * Template 8: Fitness Coach
 *
 * Creates workout plans, tracks progress, provides motivation.
 */
export const FITNESS_COACH_TEMPLATE: AgentTemplate = {
  id: 'template-fitness-coach',
  name: 'Fitness Coach',
  description: 'Creates personalized workout plans, tracks progress, provides motivation, and demonstrates exercises.',
  icon: '💪',
  category: AgentCategory.CUSTOM,
  difficulty: 'intermediate',
  useCases: [
    'Workout planning',
    'Fitness tracking',
    'Motivation and accountability',
    'Exercise instruction',
  ],
  tips: [
    'Creates personalized workout plans',
    'Tracks your progress over time',
    'Keeps you motivated and accountable',
    'Demonstrates proper exercise form',
  ],
  exampleConversations: [
    {
      user: "Create a 30-minute workout for me",
      agent: "Here's a 30-minute full-body workout:\n\nWarm-up (5 min):\n- Jumping jacks: 2 min\n- Arm circles and leg swings: 3 min\n\nMain Circuit (20 min, 3 rounds):\n1. Bodyweight squats: 15 reps\n2. Push-ups: 10 reps\n3. Lunges: 12 each leg\n4. Plank: 30 seconds\n5. Burpees: 8 reps\n\nRest 60 seconds between rounds.\n\nCool-down (5 min):\n- Stretching: 5 min\n\nEquipment needed: None. Difficulty: Moderate. Modifications available for all fitness levels.",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['fitness', 'workout', 'health', 'exercise', 'motivation'],
    documentation: 'https://docs.personallog.ai/templates/fitness-coach',
  },
  configSchema: {
    fitnessLevel: {
      type: 'string',
      description: 'Current fitness level',
      default: 'intermediate',
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    goals: {
      type: 'array',
      description: 'Fitness goals',
      default: ['general-fitness'],
    },
    equipment: {
      type: 'array',
      description: 'Available equipment',
      default: ['bodyweight'],
    },
    workoutDuration: {
      type: 'number',
      description: 'Preferred workout duration in minutes',
      default: 30,
      min: 10,
      max: 120,
    },
  },
  examples: [
    {
      name: 'Home Workout',
      description: 'No equipment needed',
      config: {
        fitnessLevel: 'beginner',
        goals: ['general-fitness', 'weight-loss'],
        equipment: ['bodyweight'],
        workoutDuration: 30,
      },
    },
    {
      name: 'Gym Workout',
      description: 'Full equipment access',
      config: {
        fitnessLevel: 'intermediate',
        goals: ['muscle-gain', 'strength'],
        equipment: ['dumbbells', 'barbell', 'machines'],
        workoutDuration: 60,
      },
    },
  ],
};

/**
 * Template 9: Meditation Guide
 *
 * Leads meditations, provides mindfulness exercises, reduces stress.
 */
export const MEDITATION_GUIDE_TEMPLATE: AgentTemplate = {
  id: 'template-meditation-guide',
  name: 'Meditation Guide',
  description: 'Led meditation sessions, mindfulness exercises, breathing techniques, and stress relief practices.',
  icon: '🧘',
  category: AgentCategory.CUSTOM,
  difficulty: 'beginner',
  useCases: [
    'Daily meditation practice',
    'Stress and anxiety relief',
    'Mindfulness training',
    'Sleep improvement',
  ],
  tips: [
    'Calming and peaceful guidance',
    'Variety of meditation techniques',
    'Effective for stress reduction',
    'Can help with sleep issues',
  ],
  exampleConversations: [
    {
      user: "I'm stressed, need a quick meditation",
      agent: "Let's do a 5-minute stress relief meditation:\n\n1. Find a comfortable seated position\n2. Close your eyes and take a deep breath in... and out\n3. Focus on the sensation of your breath at your nostrils\n4. As thoughts arise, acknowledge them without judgment and return to your breath\n5. Scan your body for tension, release it with each exhale\n6. Sit in this awareness for the remaining time\n\nWhenever you're ready, gently open your eyes. Notice how you feel - calmer, more centered.",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['meditation', 'mindfulness', 'wellness', 'stress-relief', 'mental-health'],
    documentation: 'https://docs.personallog.ai/templates/meditation-guide',
  },
  configSchema: {
    sessionLength: {
      type: 'number',
      description: 'Default session length in minutes',
      default: 10,
      min: 1,
      max: 60,
    },
    meditationType: {
      type: 'string',
      description: 'Preferred meditation style',
      default: 'mindfulness',
      enum: ['mindfulness', 'breathing', 'body-scan', 'loving-kindness', 'visualization'],
    },
    voiceStyle: {
      type: 'string',
      description: 'Guidance style',
      default: 'calm',
      enum: ['calm', 'energetic', 'minimal'],
    },
    includeBackgroundMusic: {
      type: 'boolean',
      description: 'Suggest background music',
      default: false,
    },
  },
  examples: [
    {
      name: 'Daily Mindfulness',
      description: 'Regular meditation practice',
      config: {
        sessionLength: 10,
        meditationType: 'mindfulness',
        voiceStyle: 'calm',
        includeBackgroundMusic: false,
      },
    },
    {
      name: 'Stress Relief',
      description: 'Quick stress reduction',
      config: {
        sessionLength: 5,
        meditationType: 'breathing',
        voiceStyle: 'calm',
        includeBackgroundMusic: false,
      },
    },
  ],
};

/**
 * Template 10: Problem Solver
 *
 * Breaks down complex problems, finds solutions, systematic approach.
 */
export const PROBLEM_SOLVER_TEMPLATE: AgentTemplate = {
  id: 'template-problem-solver',
  name: 'Problem Solver',
  description: 'Breaks down complex problems, generates solutions, analyzes decisions, and applies systematic thinking.',
  icon: '🔧',
  category: AgentCategory.ANALYSIS,
  difficulty: 'intermediate',
  useCases: [
    'Complex decision making',
    'Problem analysis and breakdown',
    'Solution generation',
    'Systematic thinking',
  ],
  tips: [
    'Breaks down complex problems systematically',
    'Generates multiple solution approaches',
    'Analyzes trade-offs objectively',
    'Applies structured problem-solving frameworks',
  ],
  exampleConversations: [
    {
      user: "I'm trying to decide between two job offers",
      agent: "Let's approach this systematically using a decision matrix:\n\n1. List your criteria (salary, growth, culture, location, etc.)\n2. Weight each by importance (1-5)\n3. Score each offer against criteria\n4. Calculate weighted scores\n\nLet me help you build this:\n- What are your top 3-5 decision criteria?\n- How important is each on a scale of 1-5?\n- How do the offers compare on each?\n\nWe'll calculate scores and see which offer objectively aligns better with your priorities.",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['problem-solving', 'decisions', 'analysis', 'strategy', 'planning'],
    documentation: 'https://docs.personallog.ai/templates/problem-solver',
  },
  configSchema: {
    framework: {
      type: 'string',
      description: 'Problem-solving approach',
      default: 'systematic',
      enum: ['systematic', 'creative', 'analytical', 'collaborative'],
    },
    solutionCount: {
      type: 'number',
      description: 'Number of solutions to generate',
      default: 3,
      min: 1,
      max: 10,
    },
    includeTradeoffs: {
      type: 'boolean',
      description: 'Analyze pros and cons',
      default: true,
    },
  },
  examples: [
    {
      name: 'Strategic Decisions',
      description: 'Major life or business decisions',
      config: {
        framework: 'systematic',
        solutionCount: 5,
        includeTradeoffs: true,
      },
    },
    {
      name: 'Creative Problem Solving',
      description: 'Innovative solutions',
      config: {
        framework: 'creative',
        solutionCount: 7,
        includeTradeoffs: true,
      },
    },
  ],
};

/**
 * Template 11: Travel Planner
 *
 * Plans trips, finds destinations, creates itineraries.
 */
export const TRAVEL_PLANNER_TEMPLATE: AgentTemplate = {
  id: 'template-travel-planner',
  name: 'Travel Planner',
  description: 'Plans trips, researches destinations, creates detailed itineraries, and estimates budgets.',
  icon: '✈️',
  category: AgentCategory.AUTOMATION,
  difficulty: 'beginner',
  useCases: [
    'Trip planning and research',
    'Destination discovery',
    'Itinerary creation',
    'Budget estimation',
  ],
  tips: [
    'Finds hidden gems and local favorites',
    'Creates detailed day-by-day itineraries',
    'Considers budget and preferences',
    'Includes practical travel tips',
  ],
  exampleConversations: [
    {
      user: "Plan a 5-day trip to Tokyo for under $2000",
      agent: "Tokyo 5-Day Itinerary - Budget Edition ($1850 total):\n\nDay 1: Shibuya & Harajuku\n- Free: Walk through Shibuya Crossing\n- Free: Meiji Shrine\n- Lunch: Ramen street ($15)\n- Free: Yoyogi Park\n- Dinner: Conveyor belt sushi ($20)\n\nDay 2: Asakusa & Ueno\n- Free: Senso-ji Temple\n- Free: Nakamise Shopping Street\n- Lunch: Street food ($10)\n- Free: Ueno Park\n- Dinner: Izakaya ($25)\n\n[Continues with remaining days...]\n\nBudget breakdown:\n- Accommodation: $500 (hostels)\n- Food: $400\n- Transport: $200\n- Attractions: $350\n- Shopping/Misc: $400",
    },
  ],
  requirements: {
    flags: {
      flags: ['enable-web-search'],
    },
  },
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['travel', 'planning', 'itinerary', 'budget', 'discovery'],
    documentation: 'https://docs.personallog.ai/templates/travel-planner',
  },
  configSchema: {
    travelStyle: {
      type: 'string',
      description: 'Travel preferences',
      default: 'balanced',
      enum: ['budget', 'balanced', 'luxury', 'adventure', 'cultural', 'relaxation'],
    },
    accommodationLevel: {
      type: 'string',
      description: 'Accommodation preference',
      default: 'mid-range',
      enum: ['budget', 'mid-range', 'luxury'],
    },
    includeHiddenGems: {
      type: 'boolean',
      description: 'Include off-the-beaten-path recommendations',
      default: true,
    },
  },
  examples: [
    {
      name: 'Budget Travel',
      description: 'Affordable adventures',
      config: {
        travelStyle: 'budget',
        accommodationLevel: 'budget',
        includeHiddenGems: true,
      },
    },
    {
      name: 'Cultural Deep Dive',
      description: 'Immersion in local culture',
      config: {
        travelStyle: 'cultural',
        accommodationLevel: 'mid-range',
        includeHiddenGems: true,
      },
    },
  ],
};

/**
 * Template 12: Study Buddy
 *
 * Helps with studying, explains concepts, creates flashcards.
 */
export const STUDY_BUDDY_TEMPLATE: AgentTemplate = {
  id: 'template-study-buddy',
  name: 'Study Buddy',
  description: 'Helps with studying, explains complex concepts, creates flashcards, and generates practice quizzes.',
  icon: '📚',
  category: AgentCategory.KNOWLEDGE,
  difficulty: 'beginner',
  useCases: [
    'Exam preparation',
    'Concept explanation',
    'Study material creation',
    'Practice and testing',
  ],
  tips: [
    'Explains complex concepts simply',
    'Creates effective study materials',
    'Generates practice quizzes',
    'Adapts to your learning style',
  ],
  exampleConversations: [
    {
      user: "Explain how photosynthesis works",
      agent: "Photosynthesis is how plants make food using sunlight. Here's a simple breakdown:\n\n1. **Input**: Plants take in CO2 from air, water from roots, and sunlight from leaves\n\n2. **Process**: Inside chloroplasts (tiny structures in leaves):\n   - Light energy splits water molecules\n   - Energy converts CO2 and water into glucose (sugar)\n   - Oxygen is released as waste\n\n3. **Output**: Glucose for energy + Oxygen released\n\n**Equation**: 6CO2 + 6H2O + light → C6H12O6 + 6O2\n\nThink of it like a solar-powered factory that takes air and water, uses sunshine as energy, and produces sugar + oxygen!\n\nWant me to create flashcards for this topic?",
    },
  ],
  requirements: {},
  activationMode: ActivationMode.FOREGROUND,
  initialState: {
    status: AgentState.IDLE,
  },
  metadata: {
    version: '1.0.0',
    author: 'PersonalLog Team',
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    tags: ['study', 'learning', 'education', 'flashcards', 'quizzes'],
    documentation: 'https://docs.personallog.ai/templates/study-buddy',
  },
  configSchema: {
    subject: {
      type: 'string',
      description: 'Subject to study',
      default: 'general',
    },
    learningStyle: {
      type: 'string',
      description: 'Preferred learning approach',
      default: 'visual',
      enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
    },
    explanationDepth: {
      type: 'string',
      description: 'How detailed to be',
      default: 'balanced',
      enum: ['simple', 'balanced', 'detailed'],
    },
    includeExamples: {
      type: 'boolean',
      description: 'Use real-world examples',
      default: true,
    },
  },
  examples: [
    {
      name: 'Science Study',
      description: 'STEM subjects',
      config: {
        subject: 'science',
        learningStyle: 'visual',
        explanationDepth: 'balanced',
        includeExamples: true,
      },
    },
    {
      name: 'History Study',
      description: 'Humanities subjects',
      config: {
        subject: 'history',
        learningStyle: 'reading',
        explanationDepth: 'detailed',
        includeExamples: true,
      },
    },
  ],
};

/**
 * Agent template metadata
 */
export interface AgentTemplate extends AgentDefinition {
  /** Difficulty level: beginner, intermediate, advanced */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Use case descriptions */
  useCases: string[];
  /** Tips for using this template */
  tips: string[];
  /** Example conversations */
  exampleConversations?: Array<{
    user: string;
    agent: string;
  }>;
}

/**
 * All agent templates
 */
export const AGENT_TEMPLATES: AgentTemplate[] = [
  RESEARCH_ASSISTANT_TEMPLATE,
  WRITING_COACH_TEMPLATE,
  CODE_REVIEWER_TEMPLATE,
  MEETING_NOTE_TAKER_TEMPLATE,
  CREATIVE_WRITER_TEMPLATE,
  DATA_ANALYST_TEMPLATE,
  LANGUAGE_TUTOR_TEMPLATE,
  FITNESS_COACH_TEMPLATE,
  MEDITATION_GUIDE_TEMPLATE,
  PROBLEM_SOLVER_TEMPLATE,
  TRAVEL_PLANNER_TEMPLATE,
  STUDY_BUDDY_TEMPLATE,
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: AgentCategory
): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((template) => template.difficulty === difficulty);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((template) => template.id === id);
}

/**
 * Search templates by keyword
 */
export function searchTemplates(keyword: string): AgentTemplate[] {
  const lowerKeyword = keyword.toLowerCase();
  return AGENT_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerKeyword) ||
      template.description.toLowerCase().includes(lowerKeyword) ||
      template.category.toLowerCase().includes(lowerKeyword) ||
      template.useCases.some((useCase) => useCase.toLowerCase().includes(lowerKeyword))
  );
}

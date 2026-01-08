/**
 * Task Taxonomy for Neural MPC Agent Selection
 *
 * Defines the hierarchical structure of task types for classification.
 * This taxonomy enables the model to map user inputs to appropriate agents.
 */

/**
 * Primary task categories
 * Each category maps to specific agent capabilities
 */
export enum TaskCategory {
  /** Code writing, debugging, refactoring, testing */
  CODING = 'coding',

  /** Content creation, editing, documentation */
  WRITING = 'writing',

  /** Data analysis, pattern recognition, insights */
  ANALYSIS = 'analysis',

  /** Emotion detection, sentiment analysis, mood tracking */
  EMOTION = 'emotion',

  /** Information gathering, fact-finding, exploration */
  RESEARCH = 'research',

  /** Workflow automation, batch operations, scheduling */
  AUTOMATION = 'automation',

  /** Messaging, collaboration, notifications */
  COMMUNICATION = 'communication',

  /** System configuration, settings management */
  CONFIGURATION = 'configuration',

  /** Learning, tutorials, explanations */
  LEARNING = 'learning',

  /** Creative tasks, brainstorming, ideation */
  CREATIVE = 'creative',
}

/**
 * Task subcategories for finer-grained classification
 */
export enum TaskSubcategory {
  // Coding subcategories
  CODING_DEBUG = 'coding.debug',
  CODING_REFACTOR = 'coding.refactor',
  CODING_IMPLEMENT = 'coding.implement',
  CODING_TEST = 'coding.test',
  CODING_REVIEW = 'coding.review',
  CODING_DOCUMENT = 'coding.document',
  CODING_OPTIMIZE = 'coding.optimize',

  // Writing subcategories
  WRITING_CREATE = 'writing.create',
  WRITING_EDIT = 'writing.edit',
  WRITING_SUMMARIZE = 'writing.summarize',
  WRITING_TRANSLATE = 'writing.translate',
  WRITING_FORMAT = 'writing.format',

  // Analysis subcategories
  ANALYTICS_DATA = 'analysis.data',
  ANALYTICS_PATTERN = 'analysis.pattern',
  ANALYTICS_METRIC = 'analysis.metric',
  ANALYTICS_FORECAST = 'analysis.forecast',

  // Emotion subcategories
  EMOTION_DETECT = 'emotion.detect',
  EMOTION_TRACK = 'emotion.track',
  EMOTION_REPORT = 'emotion.report',

  // Research subcategories
  RESEARCH_SEARCH = 'research.search',
  RESEARCH_COMPARE = 'research.compare',
  RESEARCH_VALIDATE = 'research.validate',

  // Automation subcategories
  AUTOMATION_WORKFLOW = 'automation.workflow',
  AUTOMATION_BATCH = 'automation.batch',
  AUTOMATION_SCHEDULE = 'automation.schedule',

  // Communication subcategories
  COMMUNICATION_MESSAGE = 'communication.message',
  COMMUNICATION_NOTIFY = 'communication.notify',
  COMMULATION_COLLABORATE = 'communication.collaborate',

  // Configuration subcategories
  CONFIG_SETTINGS = 'config.settings',
  CONFIG_INTEGRATION = 'config.integration',
  CONFIG_CUSTOMIZE = 'config.customize',

  // Learning subcategories
  LEARNING_TUTORIAL = 'learning.tutorial',
  LEARNING_EXPLAIN = 'learning.explain',
  LEARNING_EXAMPLE = 'learning.example',

  // Creative subcategories
  CREATIVE_BRAINSTORM = 'creative.brainstorm',
  CREATIVE_IDEATE = 'creative.ideate',
  CREATIVE_DESIGN = 'creative.design',
}

/**
 * Map subcategories to primary categories
 */
export const SUBCATEGORY_TO_CATEGORY: Record<TaskSubcategory, TaskCategory> = {
  // Coding
  [TaskSubcategory.CODING_DEBUG]: TaskCategory.CODING,
  [TaskSubcategory.CODING_REFACTOR]: TaskCategory.CODING,
  [TaskSubcategory.CODING_IMPLEMENT]: TaskCategory.CODING,
  [TaskSubcategory.CODING_TEST]: TaskCategory.CODING,
  [TaskSubcategory.CODING_REVIEW]: TaskCategory.CODING,
  [TaskSubcategory.CODING_DOCUMENT]: TaskCategory.CODING,
  [TaskSubcategory.CODING_OPTIMIZE]: TaskCategory.CODING,

  // Writing
  [TaskSubcategory.WRITING_CREATE]: TaskCategory.WRITING,
  [TaskSubcategory.WRITING_EDIT]: TaskCategory.WRITING,
  [TaskSubcategory.WRITING_SUMMARIZE]: TaskCategory.WRITING,
  [TaskSubcategory.WRITING_TRANSLATE]: TaskCategory.WRITING,
  [TaskSubcategory.WRITING_FORMAT]: TaskCategory.WRITING,

  // Analysis
  [TaskSubcategory.ANALYTICS_DATA]: TaskCategory.ANALYSIS,
  [TaskSubcategory.ANALYTICS_PATTERN]: TaskCategory.ANALYSIS,
  [TaskSubcategory.ANALYTICS_METRIC]: TaskCategory.ANALYSIS,
  [TaskSubcategory.ANALYTICS_FORECAST]: TaskCategory.ANALYSIS,

  // Emotion
  [TaskSubcategory.EMOTION_DETECT]: TaskCategory.EMOTION,
  [TaskSubcategory.EMOTION_TRACK]: TaskCategory.EMOTION,
  [TaskSubcategory.EMOTION_REPORT]: TaskCategory.EMOTION,

  // Research
  [TaskSubcategory.RESEARCH_SEARCH]: TaskCategory.RESEARCH,
  [TaskSubcategory.RESEARCH_COMPARE]: TaskCategory.RESEARCH,
  [TaskSubcategory.RESEARCH_VALIDATE]: TaskCategory.RESEARCH,

  // Automation
  [TaskSubcategory.AUTOMATION_WORKFLOW]: TaskCategory.AUTOMATION,
  [TaskSubcategory.AUTOMATION_BATCH]: TaskCategory.AUTOMATION,
  [TaskSubcategory.AUTOMATION_SCHEDULE]: TaskCategory.AUTOMATION,

  // Communication
  [TaskSubcategory.COMMUNICATION_MESSAGE]: TaskCategory.COMMUNICATION,
  [TaskSubcategory.COMMUNICATION_NOTIFY]: TaskCategory.COMMUNICATION,
  [TaskSubcategory.COMMULATION_COLLABORATE]: TaskCategory.COMMUNICATION,

  // Configuration
  [TaskSubcategory.CONFIG_SETTINGS]: TaskCategory.CONFIGURATION,
  [TaskSubcategory.CONFIG_INTEGRATION]: TaskCategory.CONFIGURATION,
  [TaskSubcategory.CONFIG_CUSTOMIZE]: TaskCategory.CONFIGURATION,

  // Learning
  [TaskSubcategory.LEARNING_TUTORIAL]: TaskCategory.LEARNING,
  [TaskSubcategory.LEARNING_EXPLAIN]: TaskCategory.LEARNING,
  [TaskSubcategory.LEARNING_EXAMPLE]: TaskCategory.LEARNING,

  // Creative
  [TaskSubcategory.CREATIVE_BRAINSTORM]: TaskCategory.CREATIVE,
  [TaskSubcategory.CREATIVE_IDEATE]: TaskCategory.CREATIVE,
  [TaskSubcategory.CREATIVE_DESIGN]: TaskCategory.CREATIVE,
};

/**
 * Task complexity levels
 */
export enum TaskComplexity {
  TRIVIAL = 'trivial',     // < 1 minute, simple action
  SIMPLE = 'simple',       // 1-5 minutes, straightforward
  MODERATE = 'moderate',   // 5-15 minutes, some complexity
  COMPLEX = 'complex',     // 15-60 minutes, multiple steps
  EXPERT = 'expert',       // > 1 hour, deep expertise needed
}

/**
 * Task urgency levels
 */
export enum TaskUrgency {
  LOW = 'low',           // Can wait
  NORMAL = 'normal',     // Standard priority
  HIGH = 'high',         // Important, time-sensitive
  CRITICAL = 'critical', // Urgent, blocking
}

/**
 * Task domain (subject matter)
 */
export enum TaskDomain {
  SOFTWARE_DEVELOPMENT = 'software_development',
  DATA_SCIENCE = 'data_science',
  DESIGN = 'design',
  BUSINESS = 'business',
  PERSONAL = 'personal',
  ACADEMIC = 'academic',
  SYSTEM = 'system',
  GENERAL = 'general',
}

/**
 * Task features for ML classification
 */
export interface TaskFeatures {
  /** Input text length (character count) */
  inputLength: number;

  /** Number of words */
  wordCount: number;

  /** Number of sentences */
  sentenceCount: number;

  /** Average word length */
  avgWordLength: number;

  /** Contains code snippet */
  hasCode: boolean;

  /** Code language detected */
  codeLanguage?: string;

  /** Contains question marks */
  hasQuestion: boolean;

  /** Contains action verbs */
  hasActionVerbs: boolean;

  /** Number of action verbs */
  actionVerbCount: number;

  /** Contains technical terms */
  hasTechnicalTerms: boolean;

  /** Number of technical terms */
  technicalTermCount: number;

  /** Task complexity (estimated) */
  complexity: TaskComplexity;

  /** Domain (estimated) */
  domain: TaskDomain;

  /** Current app/page context */
  appContext?: string;

  /** Time of day (hour) */
  hourOfDay: number;

  /** Day of week (0-6, 0=Sunday) */
  dayOfWeek: number;

  /** Input contains URLs */
  hasUrls: boolean;

  /** Input contains file paths */
  hasFilePaths: boolean;

  /** Input contains numbers/stats */
  hasNumbers: boolean;

  /** Sentiment polarity (-1 to 1) */
  sentiment: number;

  /** Subjectivity score (0-1) */
  subjectivity: number;
}

/**
 * Complete task metadata
 */
export interface TaskMetadata {
  /** Unique task ID */
  taskId: string;

  /** Original user input */
  input: string;

  /** Task context */
  context: {
    /** Current app/page */
    appContext?: string;
    /** Timestamp */
    timestamp: number;
    /** Recent user actions */
    recentActions?: string[];
  };

  /** Extracted features */
  features: TaskFeatures;

  /** Predicted category */
  predictedCategory?: TaskCategory;

  /** Predicted subcategory */
  predictedSubcategory?: TaskSubcategory;

  /** Confidence score (0-1) */
  confidence?: number;

  /** Actual category (for training) */
  actualCategory?: TaskCategory;

  /** Actual subcategory (for training) */
  actualSubcategory?: TaskSubcategory;

  /** Whether this is a training example */
  isTrainingExample: boolean;

  /** Agent selected for this task */
  selectedAgent?: string;

  /** Task completion status */
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Action verbs that indicate task intent
 */
export const ACTION_VERBS = [
  'create', 'make', 'build', 'write', 'generate', 'develop', 'implement',
  'fix', 'debug', 'solve', 'resolve', 'repair', 'correct',
  'analyze', 'examine', 'investigate', 'study', 'review', 'evaluate',
  'optimize', 'improve', 'enhance', 'refactor', 'streamline',
  'test', 'verify', 'validate', 'check', 'confirm',
  'document', 'explain', 'describe', 'summarize', 'outline',
  'search', 'find', 'locate', 'lookup', 'research', 'discover',
  'automate', 'schedule', 'batch', 'orchestrate', 'coordinate',
  'configure', 'setup', 'customize', 'adjust', 'modify',
  'learn', 'teach', 'train', 'tutorial', 'guide', 'show',
  'brainstorm', 'ideate', 'design', 'prototype', 'conceptualize',
  'send', 'notify', 'message', 'communicate', 'broadcast',
  'track', 'monitor', 'observe', 'watch', 'measure',
];

/**
 * Technical terms by domain
 */
export const TECHNICAL_TERMS = {
  [TaskDomain.SOFTWARE_DEVELOPMENT]: [
    'function', 'class', 'method', 'variable', 'algorithm', 'api',
    'debug', 'compile', 'deploy', 'repository', 'commit', 'merge',
    'typescript', 'javascript', 'python', 'react', 'node', 'database',
  ],
  [TaskDomain.DATA_SCIENCE]: [
    'model', 'training', 'dataset', 'feature', 'prediction', 'accuracy',
    'regression', 'classification', 'neural', 'machine learning', 'statistics',
  ],
  [TaskDomain.SYSTEM]: [
    'plugin', 'integration', 'configuration', 'settings', 'hardware', 'performance',
  ],
};

/**
 * Code language keywords for detection
 */
export const CODE_KEYWORDS = {
  typescript: ['interface', 'type', 'enum', 'namespace', 'decorator'],
  javascript: ['function', 'const', 'let', 'var', 'async', 'await'],
  python: ['def', 'class', 'import', 'from', 'lambda', 'yield'],
  java: ['public', 'private', 'protected', 'class', 'interface', 'extends'],
  cpp: ['include', 'namespace', 'template', 'class', 'struct'],
  html: ['<div', '<span', '<html', '<body', '<head'],
  css: ['@media', '@keyframes', ':hover', ':active', 'flexbox'],
  sql: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY'],
  bash: ['#!/bin/bash', 'if [', 'for ', 'echo ', 'export'],
};

/**
 * Get category for a subcategory
 */
export function getCategoryForSubcategory(
  subcategory: TaskSubcategory
): TaskCategory {
  return SUBCATEGORY_TO_CATEGORY[subcategory];
}

/**
 * Get all subcategories for a category
 */
export function getSubcategoriesForCategory(
  category: TaskCategory
): TaskSubcategory[] {
  return Object.entries(SUBCATEGORY_TO_CATEGORY)
    .filter(([_, cat]) => cat === category)
    .map(([subcat, _]) => subcat as TaskSubcategory);
}

/**
 * Validate task category
 */
export function isValidTaskCategory(value: string): value is TaskCategory {
  return Object.values(TaskCategory).includes(value as TaskCategory);
}

/**
 * Validate task subcategory
 */
export function isValidTaskSubcategory(value: string): value is TaskSubcategory {
  return Object.values(TaskSubcategory).includes(value as TaskSubcategory);
}

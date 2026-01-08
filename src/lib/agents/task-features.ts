/**
 * Task Feature Extraction for Neural MPC
 *
 * Extracts numerical and categorical features from user input
 * to enable ML-based task classification.
 */

import {
  TaskFeatures,
  TaskComplexity,
  TaskDomain,
  ACTION_VERBS,
  TECHNICAL_TERMS,
  CODE_KEYWORDS,
} from './task-taxonomy';

/**
 * Context information for feature extraction
 */
export interface FeatureExtractionContext {
  /** Current app/page */
  appContext?: string;

  /** Timestamp */
  timestamp: number;

  /** Recent user actions */
  recentActions?: string[];

  /** User's historical patterns */
  userPatterns?: {
    preferredCategories?: string[];
    commonTasks?: string[];
    averageTaskLength?: number;
  };
}

/**
 * Extract features from user input
 */
export function extractTaskFeatures(
  input: string,
  context: FeatureExtractionContext
): TaskFeatures {
  const text = input.trim();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Basic text statistics
  const inputLength = text.length;
  const wordCount = words.length;
  const sentenceCount = sentences.length;
  const avgWordLength = wordCount > 0
    ? words.reduce((sum, w) => sum + w.length, 0) / wordCount
    : 0;

  // Code detection
  const codeInfo = detectCode(text);
  const hasCode = codeInfo.hasCode;
  const codeLanguage = codeInfo.language;

  // Question detection
  const hasQuestion = text.includes('?');

  // Action verb detection
  const actionVerbs = detectActionVerbs(text);
  const hasActionVerbs = actionVerbs.length > 0;
  const actionVerbCount = actionVerbs.length;

  // Technical term detection
  const technicalTerms = detectTechnicalTerms(text);
  const hasTechnicalTerms = technicalTerms.length > 0;
  const technicalTermCount = technicalTerms.length;

  // Complexity estimation
  const complexity = estimateComplexity(
    inputLength,
    wordCount,
    hasCode,
    actionVerbCount,
    technicalTermCount
  );

  // Domain detection
  const domain = detectDomain(text, technicalTerms, codeLanguage, context.appContext);

  // Time context
  const date = new Date(context.timestamp);
  const hourOfDay = date.getHours();
  const dayOfWeek = date.getDay();

  // Special content detection
  const hasUrls = /https?:\/\/[^\s]+/i.test(text);
  const hasFilePaths = /\/[\w\-._]+\/[\w\-._/]*/.test(text) || /[A-Z]:\\[\w\-._\\]*/.test(text);
  const hasNumbers = /\d+/.test(text);

  // Sentiment analysis (simple)
  const sentiment = analyzeSentiment(text);
  const subjectivity = analyzeSubjectivity(text);

  return {
    inputLength,
    wordCount,
    sentenceCount,
    avgWordLength,
    hasCode,
    codeLanguage,
    hasQuestion,
    hasActionVerbs,
    actionVerbCount,
    hasTechnicalTerms,
    technicalTermCount,
    complexity,
    domain,
    appContext: context.appContext,
    hourOfDay,
    dayOfWeek,
    hasUrls,
    hasFilePaths,
    hasNumbers,
    sentiment,
    subjectivity,
  };
}

/**
 * Detect code in input text
 */
function detectCode(text: string): { hasCode: boolean; language?: string } {
  // Check for code block markers
  const codeBlockMatch = text.match(/```(\w+)?/);
  if (codeBlockMatch) {
    return { hasCode: true, language: codeBlockMatch[1] || 'unknown' };
  }

  // Check for inline code
  if (text.includes('`')) {
    return { hasCode: true, language: 'unknown' };
  }

  // Check for code-specific keywords
  for (const [lang, keywords] of Object.entries(CODE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        return { hasCode: true, language: lang };
      }
    }
  }

  // Check for function calls, variable assignments, etc.
  const codePatterns = [
    /\w+\.\w+\(/, // method call
    /\w+\s*\(/, // function call
    /const\s+\w+\s*=/, // const assignment
    /let\s+\w+\s*=/, // let assignment
    /class\s+\w+/, // class definition
    /def\s+\w+/, // Python function
    /function\s+\w+/, // JS function
  ];

  for (const pattern of codePatterns) {
    if (pattern.test(text)) {
      return { hasCode: true, language: 'unknown' };
    }
  }

  return { hasCode: false };
}

/**
 * Detect action verbs in text
 */
function detectActionVerbs(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const verb of ACTION_VERBS) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.push(verb);
    }
  }

  return found;
}

/**
 * Detect technical terms in text
 */
function detectTechnicalTerms(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  // Check all technical term lists
  for (const terms of Object.values(TECHNICAL_TERMS)) {
    for (const term of terms) {
      if (lowerText.includes(term.toLowerCase())) {
        found.push(term);
      }
    }
  }

  return found;
}

/**
 * Estimate task complexity
 */
function estimateComplexity(
  inputLength: number,
  wordCount: number,
  hasCode: boolean,
  actionVerbCount: number,
  technicalTermCount: number
): TaskComplexity {
  // Simple scoring system
  let score = 0;

  // Length score (0-2)
  if (wordCount < 10) score += 0;
  else if (wordCount < 30) score += 1;
  else score += 2;

  // Code score (0-2)
  if (hasCode) score += 2;

  // Action verb score (0-2)
  if (actionVerbCount === 0) score += 0;
  else if (actionVerbCount < 3) score += 1;
  else score += 2;

  // Technical term score (0-2)
  if (technicalTermCount === 0) score += 0;
  else if (technicalTermCount < 3) score += 1;
  else score += 2;

  // Map score to complexity
  if (score <= 2) return TaskComplexity.TRIVIAL;
  if (score <= 4) return TaskComplexity.SIMPLE;
  if (score <= 6) return TaskComplexity.MODERATE;
  if (score <= 7) return TaskComplexity.COMPLEX;
  return TaskComplexity.EXPERT;
}

/**
 * Detect task domain
 */
function detectDomain(
  text: string,
  technicalTerms: string[],
  codeLanguage: string | undefined,
  appContext: string | undefined
): TaskDomain {
  const lowerText = text.toLowerCase();

  // Check app context first
  if (appContext) {
    if (appContext.includes('jepa') || appContext.includes('emotion')) {
      return TaskDomain.SOFTWARE_DEVELOPMENT;
    }
    if (appContext.includes('analytics') || appContext.includes('data')) {
      return TaskDomain.DATA_SCIENCE;
    }
  }

  // Check for code
  if (codeLanguage) {
    return TaskDomain.SOFTWARE_DEVELOPMENT;
  }

  // Check for data science terms
  const dataScienceTerms = ['model', 'training', 'dataset', 'feature', 'prediction', 'accuracy'];
  if (dataScienceTerms.some(term => lowerText.includes(term))) {
    return TaskDomain.DATA_SCIENCE;
  }

  // Check for system terms
  const systemTerms = ['plugin', 'integration', 'configuration', 'settings', 'hardware'];
  if (systemTerms.some(term => lowerText.includes(term))) {
    return TaskDomain.SYSTEM;
  }

  // Check for business terms
  const businessTerms = ['report', 'kpi', 'metric', 'business', 'customer', 'revenue'];
  if (businessTerms.some(term => lowerText.includes(term))) {
    return TaskDomain.BUSINESS;
  }

  // Check for academic terms
  const academicTerms = ['research', 'paper', 'study', 'academic', 'citation'];
  if (academicTerms.some(term => lowerText.includes(term))) {
    return TaskDomain.ACADEMIC;
  }

  // Check for personal terms
  const personalTerms = ['personal', 'life', 'health', 'fitness', 'habit'];
  if (personalTerms.some(term => lowerText.includes(term))) {
    return TaskDomain.PERSONAL;
  }

  // Default to general
  return TaskDomain.GENERAL;
}

/**
 * Analyze sentiment (simple approach)
 * Returns value between -1 (negative) and 1 (positive)
 */
function analyzeSentiment(text: string): number {
  const lowerText = text.toLowerCase();

  // Positive words
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'happy', 'excited', 'pleased', 'thank', 'thanks',
  ];

  // Negative words
  const negativeWords = [
    'bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated',
    'disappointed', 'sad', 'upset', 'error', 'bug', 'issue',
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of positiveWords) {
    if (lowerText.includes(word)) positiveCount++;
  }

  for (const word of negativeWords) {
    if (lowerText.includes(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return 0;

  return (positiveCount - negativeCount) / total;
}

/**
 * Analyze subjectivity
 * Returns value between 0 (objective) and 1 (subjective)
 */
function analyzeSubjectivity(text: string): number {
  const lowerText = text.toLowerCase();

  // Subjective indicators
  const subjectiveWords = [
    'i think', 'i feel', 'i believe', 'in my opinion', 'maybe', 'perhaps',
    'seems', 'appears', 'probably', 'likely', 'should', 'could',
  ];

  // Objective indicators
  const objectiveWords = [
    'is', 'are', 'was', 'were', 'according to', 'based on', 'data shows',
    'results indicate', 'study found', 'analysis shows',
  ];

  let subjectiveCount = 0;
  let objectiveCount = 0;

  for (const phrase of subjectiveWords) {
    if (lowerText.includes(phrase)) subjectiveCount++;
  }

  for (const phrase of objectiveWords) {
    if (lowerText.includes(phrase)) objectiveCount++;
  }

  const total = subjectiveCount + objectiveCount;
  if (total === 0) return 0.5; // Neutral

  return subjectiveCount / total;
}

/**
 * Normalize features for ML model
 * Converts features to a numeric vector
 */
export function normalizeFeatures(features: TaskFeatures): number[] {
  return [
    // Normalize input length (0-1, assuming max 1000 chars)
    Math.min(features.inputLength / 1000, 1),

    // Normalize word count (0-1, assuming max 200 words)
    Math.min(features.wordCount / 200, 1),

    // Normalize sentence count (0-1, assuming max 20 sentences)
    Math.min(features.sentenceCount / 20, 1),

    // Average word length (0-1, assuming max 10 chars)
    Math.min(features.avgWordLength / 10, 1),

    // Binary features
    features.hasCode ? 1 : 0,
    features.hasQuestion ? 1 : 0,
    features.hasActionVerbs ? 1 : 0,

    // Action verb count (0-1, assuming max 10)
    Math.min(features.actionVerbCount / 10, 1),

    // Technical term count (0-1, assuming max 20)
    Math.min(features.technicalTermCount / 20, 1),

    // Complexity (encoded as 0-1)
    complexityToNumber(features.complexity),

    // Domain (encoded as 0-1)
    domainToNumber(features.domain),

    // Hour of day (0-1)
    features.hourOfDay / 24,

    // Day of week (0-1)
    features.dayOfWeek / 7,

    // Binary features
    features.hasUrls ? 1 : 0,
    features.hasFilePaths ? 1 : 0,
    features.hasNumbers ? 1 : 0,

    // Sentiment (-1 to 1, mapped to 0-1)
    (features.sentiment + 1) / 2,

    // Subjectivity (already 0-1)
    features.subjectivity,
  ];
}

/**
 * Convert complexity enum to number
 */
function complexityToNumber(complexity: TaskComplexity): number {
  switch (complexity) {
    case TaskComplexity.TRIVIAL: return 0;
    case TaskComplexity.SIMPLE: return 0.25;
    case TaskComplexity.MODERATE: return 0.5;
    case TaskComplexity.COMPLEX: return 0.75;
    case TaskComplexity.EXPERT: return 1;
  }
}

/**
 * Convert domain enum to number
 */
function domainToNumber(domain: TaskDomain): number {
  const domains = Object.values(TaskDomain);
  return domains.indexOf(domain) / domains.length;
}

/**
 * Get feature names for debugging/visualization
 */
export function getFeatureNames(): string[] {
  return [
    'inputLength',
    'wordCount',
    'sentenceCount',
    'avgWordLength',
    'hasCode',
    'hasQuestion',
    'hasActionVerbs',
    'actionVerbCount',
    'technicalTermCount',
    'complexity',
    'domain',
    'hourOfDay',
    'dayOfWeek',
    'hasUrls',
    'hasFilePaths',
    'hasNumbers',
    'sentiment',
    'subjectivity',
  ];
}

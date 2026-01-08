/**
 * Task Classifier for Neural MPC Agent Selection
 *
 * Multi-class classifier that predicts task categories from user input.
 * Uses a simple yet effective Naive Bayes approach with feature weighting.
 */

import {
  TaskCategory,
  TaskSubcategory,
  TaskMetadata,
  isValidTaskCategory,
  isValidTaskSubcategory,
} from './task-taxonomy';
import {
  extractTaskFeatures,
  normalizeFeatures,
  FeatureExtractionContext,
} from './task-features';

/**
 * Classification result with probability distribution
 */
export interface ClassificationResult {
  /** Task ID */
  taskId: string;

  /** Predicted category */
  category: TaskCategory;

  /** Predicted subcategory */
  subcategory?: TaskSubcategory;

  /** Confidence score (0-1) */
  confidence: number;

  /** Probability distribution over categories */
  probabilities: Record<TaskCategory, number>;

  /** Extracted features */
  features: ReturnType<typeof extractTaskFeatures>;

  /** Timestamp */
  timestamp: number;
}

/**
 * Training example for the classifier
 */
export interface TrainingExample {
  /** Input text */
  input: string;

  /** True category */
  category: TaskCategory;

  /** True subcategory (optional) */
  subcategory?: TaskSubcategory;

  /** Context */
  context: FeatureExtractionContext;
}

/**
 * Model metrics
 */
export interface ModelMetrics {
  /** Overall accuracy */
  accuracy: number;

  /** Number of training examples */
  trainingExamples: number;

  /** Number of predictions made */
  predictions: number;

  /** Per-category accuracy */
  categoryAccuracy: Record<TaskCategory, number>;

  /** Last training timestamp */
  lastTrained: number;

  /** Model version */
  version: number;
}

/**
 * Simple Naive Bayes Classifier
 */
class NaiveBayesClassifier {
  private categoryPriors: Record<string, number> = {};
  private featureLikelihoods: Record<string, Record<string, number>> = {};
  private categoryCounts: Record<string, number> = {};
  private totalExamples = 0;

  /**
   * Train the classifier
   */
  train(examples: Array<{ features: number[]; category: string }>): void {
    // Reset counts
    this.categoryPriors = {};
    this.featureLikelihoods = {};
    this.categoryCounts = {};
    this.totalExamples = examples.length;

    // Count examples per category
    for (const example of examples) {
      const cat = example.category;
      this.categoryCounts[cat] = (this.categoryCounts[cat] || 0) + 1;
    }

    // Calculate priors
    for (const [cat, count] of Object.entries(this.categoryCounts)) {
      this.categoryPriors[cat] = count / this.totalExamples;
    }

    // Calculate feature likelihoods with Laplace smoothing
    const numFeatures = examples[0]?.features.length || 0;
    const bins = 10; // Discretize continuous features into 10 bins

    for (const example of examples) {
      const cat = example.category;

      if (!this.featureLikelihoods[cat]) {
        this.featureLikelihoods[cat] = {};
      }

      for (let i = 0; i < numFeatures; i++) {
        const featureValue = example.features[i] as number;
        const bin = Math.floor(featureValue * bins);
        const key = `${i}_${bin}`;

        if (!this.featureLikelihoods[cat][key]) {
          this.featureLikelihoods[cat][key] = 0;
        }

        this.featureLikelihoods[cat][key] = (this.featureLikelihoods[cat][key] || 0) + 1;
      }
    }

    // Normalize likelihoods
    for (const cat of Object.keys(this.categoryCounts)) {
      for (let i = 0; i < numFeatures; i++) {
        for (let b = 0; b < bins; b++) {
          const key = `${i}_${b}`;
          const count = this.featureLikelihoods[cat]?.[key] || 0;
          // Laplace smoothing
          const catCount = this.categoryCounts[cat] || 0;
          this.featureLikelihoods[cat]![key] = (count + 1) / (catCount + bins);
        }
      }
    }
  }

  /**
   * Predict category for features
   */
  predict(features: number[]): Record<string, number> {
    const probabilities: Record<string, number> = {};
    const bins = 10;

    for (const [cat, prior] of Object.entries(this.categoryPriors)) {
      let logProb = Math.log(prior);

      for (let i = 0; i < features.length; i++) {
        const featureValue = features[i] as number;
        const bin = Math.floor(featureValue * bins);
        const key = `${i}_${bin}`;
        const likelihood = this.featureLikelihoods[cat]?.[key] || 0.0001; // Small default
        logProb += Math.log(likelihood);
      }

      probabilities[cat] = logProb;
    }

    // Convert log probabilities to probabilities (with softmax)
    return softmax(probabilities);
  }
}

/**
 * Softmax function to convert log probabilities to probabilities
 */
function softmax(logProbs: Record<string, number>): Record<string, number> {
  const maxLogProb = Math.max(...Object.values(logProbs));
  const exps: Record<string, number> = {};

  let sumExp = 0;
  for (const [cat, logProb] of Object.entries(logProbs)) {
    exps[cat] = Math.exp(logProb - maxLogProb);
    sumExp += exps[cat];
  }

  const probs: Record<string, number> = {};
  for (const [cat, exp] of Object.entries(exps)) {
    probs[cat] = exp / sumExp;
  }

  return probs;
}

/**
 * Task Classifier
 */
class TaskClassifier {
  private classifier: NaiveBayesClassifier;
  private trainingExamples: TrainingExample[] = [];
  private predictions: number = 0;
  private correctPredictions: number = 0;
  private categoryCorrect: Record<TaskCategory, number> = {} as any;
  private categoryTotal: Record<TaskCategory, number> = {} as any;
  private lastTrained: number = Date.now();
  private version: number = 1;

  constructor() {
    this.classifier = new NaiveBayesClassifier();
    this.initializeCategoryTracking();
  }

  private initializeCategoryTracking(): void {
    for (const cat of Object.values(TaskCategory)) {
      this.categoryCorrect[cat] = 0;
      this.categoryTotal[cat] = 0;
    }
  }

  /**
   * Train the model with examples
   */
  trainModel(examples: TrainingExample[]): void {
    // Store training examples
    this.trainingExamples = [...examples];

    // Extract features and prepare training data
    const trainingData = examples.map(ex => ({
      features: normalizeFeatures(extractTaskFeatures(ex.input, ex.context)),
      category: ex.category,
    }));

    // Train the classifier
    this.classifier.train(trainingData);

    // Update metadata
    this.lastTrained = Date.now();
    this.version++;

    // Reset prediction tracking
    this.predictions = 0;
    this.correctPredictions = 0;
    this.initializeCategoryTracking();
  }

  /**
   * Update model with a new example (online learning)
   */
  updateModel(example: TrainingExample): void {
    this.trainingExamples.push(example);

    // Retrain with updated dataset
    this.trainModel(this.trainingExamples);
  }

  /**
   * Classify a task
   */
  classifyTask(
    input: string,
    context: FeatureExtractionContext
  ): ClassificationResult {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const features = extractTaskFeatures(input, context);
    const normalizedFeatures = normalizeFeatures(features);

    // Get probabilities
    const probabilities = this.classifier.predict(normalizedFeatures);

    // Find best category
    let bestCategory = TaskCategory.CODING; // Default fallback
    let bestProb = 0;

    for (const [cat, prob] of Object.entries(probabilities)) {
      if (prob > bestProb && isValidTaskCategory(cat)) {
        bestProb = prob;
        bestCategory = cat as TaskCategory;
      }
    }

    // Find best subcategory (simplified: use domain-specific rules)
    const subcategory = this.predictSubcategory(input, bestCategory);

    const result: ClassificationResult = {
      taskId,
      category: bestCategory,
      subcategory,
      confidence: bestProb,
      probabilities: probabilities as Record<TaskCategory, number>,
      features,
      timestamp: Date.now(),
    };

    // Track prediction
    this.predictions++;

    return result;
  }

  /**
   * Predict subcategory based on category and input
   */
  private predictSubcategory(
    input: string,
    category: TaskCategory
  ): TaskSubcategory | undefined {
    const lowerInput = input.toLowerCase();

    // Simple rule-based subcategory prediction
    switch (category) {
      case TaskCategory.CODING:
        if (lowerInput.includes('debug') || lowerInput.includes('fix') || lowerInput.includes('bug')) {
          return TaskSubcategory.CODING_DEBUG;
        }
        if (lowerInput.includes('refactor') || lowerInput.includes('improve')) {
          return TaskSubcategory.CODING_REFACTOR;
        }
        if (lowerInput.includes('test') || lowerInput.includes('verify')) {
          return TaskSubcategory.CODING_TEST;
        }
        if (lowerInput.includes('document') || lowerInput.includes('comment')) {
          return TaskSubcategory.CODING_DOCUMENT;
        }
        return TaskSubcategory.CODING_IMPLEMENT;

      case TaskCategory.WRITING:
        if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
          return TaskSubcategory.WRITING_SUMMARIZE;
        }
        if (lowerInput.includes('edit') || lowerInput.includes('revise')) {
          return TaskSubcategory.WRITING_EDIT;
        }
        return TaskSubcategory.WRITING_CREATE;

      case TaskCategory.ANALYSIS:
        if (lowerInput.includes('pattern') || lowerInput.includes('trend')) {
          return TaskSubcategory.ANALYTICS_PATTERN;
        }
        if (lowerInput.includes('metric') || lowerInput.includes('kpi')) {
          return TaskSubcategory.ANALYTICS_METRIC;
        }
        return TaskSubcategory.ANALYTICS_DATA;

      case TaskCategory.EMOTION:
        if (lowerInput.includes('track') || lowerInput.includes('monitor')) {
          return TaskSubcategory.EMOTION_TRACK;
        }
        if (lowerInput.includes('report') || lowerInput.includes('summary')) {
          return TaskSubcategory.EMOTION_REPORT;
        }
        return TaskSubcategory.EMOTION_DETECT;

      case TaskCategory.RESEARCH:
        if (lowerInput.includes('compare')) {
          return TaskSubcategory.RESEARCH_COMPARE;
        }
        return TaskSubcategory.RESEARCH_SEARCH;

      case TaskCategory.AUTOMATION:
        if (lowerInput.includes('workflow')) {
          return TaskSubcategory.AUTOMATION_WORKFLOW;
        }
        if (lowerInput.includes('schedule')) {
          return TaskSubcategory.AUTOMATION_SCHEDULE;
        }
        return TaskSubcategory.AUTOMATION_BATCH;

      default:
        return undefined;
    }
  }

  /**
   * Provide feedback on a prediction (for online learning)
   */
  provideFeedback(
    taskId: string,
    actualCategory: TaskCategory,
    actualSubcategory?: TaskSubcategory
  ): void {
    // This would be used to update the model
    // For now, we'll track accuracy
    // In a full implementation, we'd associate the taskId with the prediction
    // and update based on the feedback
  }

  /**
   * Get model metrics
   */
  getModelMetrics(): ModelMetrics {
    const accuracy = this.predictions > 0
      ? this.correctPredictions / this.predictions
      : 0;

    const categoryAccuracy: Record<TaskCategory, number> = {} as any;
    for (const cat of Object.values(TaskCategory)) {
      categoryAccuracy[cat] = this.categoryTotal[cat] > 0
        ? this.categoryCorrect[cat] / this.categoryTotal[cat]
        : 0;
    }

    return {
      accuracy,
      trainingExamples: this.trainingExamples.length,
      predictions: this.predictions,
      categoryAccuracy,
      lastTrained: this.lastTrained,
      version: this.version,
    };
  }

  /**
   * Get training examples
   */
  getTrainingExamples(): TrainingExample[] {
    return [...this.trainingExamples];
  }

  /**
   * Get feature extraction for inspection
   */
  getTaskFeatures(input: string, context: FeatureExtractionContext) {
    return extractTaskFeatures(input, context);
  }

  /**
   * Reset the model
   */
  reset(): void {
    this.trainingExamples = [];
    this.predictions = 0;
    this.correctPredictions = 0;
    this.initializeCategoryTracking();
    this.lastTrained = Date.now();
    this.version = 1;
  }
}

// Singleton instance
let classifierInstance: TaskClassifier | null = null;

/**
 * Get the classifier instance
 */
function getClassifier(): TaskClassifier {
  if (!classifierInstance) {
    classifierInstance = new TaskClassifier();
  }
  return classifierInstance;
}

/**
 * Classify a task
 */
export function classifyTask(
  input: string,
  context: FeatureExtractionContext
): ClassificationResult {
  return getClassifier().classifyTask(input, context);
}

/**
 * Get classification result by task ID
 */
export function getClassification(taskId: string): ClassificationResult | null {
  // In a full implementation, we'd store classifications
  // For now, return null
  return null;
}

/**
 * Extract task features for inspection
 */
export function getTaskFeatures(input: string, context: FeatureExtractionContext) {
  return getClassifier().getTaskFeatures(input, context);
}

/**
 * Train the model with examples
 */
export function trainModel(examples: TrainingExample[]): void {
  getClassifier().trainModel(examples);
}

/**
 * Update model with a new example (online learning)
 */
export function updateModel(example: TrainingExample): void {
  getClassifier().updateModel(example);
}

/**
 * Get model accuracy and metrics
 */
export function getModelAccuracy(): ModelMetrics {
  return getClassifier().getModelMetrics();
}

/**
 * Get training examples
 */
export function getTrainingExamples(): TrainingExample[] {
  return getClassifier().getTrainingExamples();
}

/**
 * Reset the model
 */
export function resetModel(): void {
  getClassifier().reset();
}

/**
 * Default training examples
 */
export const DEFAULT_TRAINING_EXAMPLES: TrainingExample[] = [
  // Coding examples
  {
    input: 'Fix the bug in the authentication function',
    category: TaskCategory.CODING,
    subcategory: TaskSubcategory.CODING_DEBUG,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Refactor the user service to use the new API',
    category: TaskCategory.CODING,
    subcategory: TaskSubcategory.CODING_REFACTOR,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Write unit tests for the analytics module',
    category: TaskCategory.CODING,
    subcategory: TaskSubcategory.CODING_TEST,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Implement a new feature for user preferences',
    category: TaskCategory.CODING,
    subcategory: TaskSubcategory.CODING_IMPLEMENT,
    context: { timestamp: Date.now() },
  },

  // Writing examples
  {
    input: 'Create documentation for the plugin system',
    category: TaskCategory.WRITING,
    subcategory: TaskSubcategory.WRITING_CREATE,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Summarize the meeting notes from today',
    category: TaskCategory.WRITING,
    subcategory: TaskSubcategory.WRITING_SUMMARIZE,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Edit this email to make it more professional',
    category: TaskCategory.WRITING,
    subcategory: TaskSubcategory.WRITING_EDIT,
    context: { timestamp: Date.now() },
  },

  // Analysis examples
  {
    input: 'Analyze the user engagement metrics from last week',
    category: TaskCategory.ANALYSIS,
    subcategory: TaskSubcategory.ANALYTICS_DATA,
    context: { timestamp: Date.now() },
  },
  {
    input: 'What patterns do you see in the usage data?',
    category: TaskCategory.ANALYSIS,
    subcategory: TaskSubcategory.ANALYTICS_PATTERN,
    context: { timestamp: Date.now() },
  },

  // Emotion examples
  {
    input: 'Detect the emotion in this audio clip',
    category: TaskCategory.EMOTION,
    subcategory: TaskSubcategory.EMOTION_DETECT,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Show me my emotion trends over the past week',
    category: TaskCategory.EMOTION,
    subcategory: TaskSubcategory.EMOTION_TRACK,
    context: { timestamp: Date.now() },
  },

  // Research examples
  {
    input: 'Research the latest developments in neural networks',
    category: TaskCategory.RESEARCH,
    subcategory: TaskSubcategory.RESEARCH_SEARCH,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Compare different approaches to sentiment analysis',
    category: TaskCategory.RESEARCH,
    subcategory: TaskSubcategory.RESEARCH_COMPARE,
    context: { timestamp: Date.now() },
  },

  // Automation examples
  {
    input: 'Create a workflow to automatically generate daily reports',
    category: TaskCategory.AUTOMATION,
    subcategory: TaskSubcategory.AUTOMATION_WORKFLOW,
    context: { timestamp: Date.now() },
  },
  {
    input: 'Schedule weekly backups of the database',
    category: TaskCategory.AUTOMATION,
    subcategory: TaskSubcategory.AUTOMATION_SCHEDULE,
    context: { timestamp: Date.now() },
  },
];

// Initialize with default examples
trainModel(DEFAULT_TRAINING_EXAMPLES);

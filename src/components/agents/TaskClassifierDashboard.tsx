/**
 * Task Classifier Dashboard
 *
 * Visualizes and tests the task classification system.
 * Shows feature extraction, classification results, and model metrics.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  classifyTask,
  getModelAccuracy,
  getTaskFeatures,
  getTrainingExamples,
  DEFAULT_TRAINING_EXAMPLES,
  trainModel,
  updateModel,
  resetModel,
  ClassificationResult,
  ModelMetrics,
} from '@/lib/agents/task-classifier';
import {
  TaskCategory,
  TaskComplexity,
  TaskDomain,
} from '@/lib/agents/task-taxonomy';
import { FeatureExtractionContext } from '@/lib/agents/task-features';

interface FeatureDisplayProps {
  features: ReturnType<typeof getTaskFeatures>;
}

function FeatureDisplay({ features }: FeatureDisplayProps) {
  const featureItems = [
    { label: 'Input Length', value: features.inputLength.toString() },
    { label: 'Word Count', value: features.wordCount.toString() },
    { label: 'Sentence Count', value: features.sentenceCount.toString() },
    { label: 'Avg Word Length', value: features.avgWordLength.toFixed(2) },
    { label: 'Has Code', value: features.hasCode ? 'Yes' : 'No' },
    { label: 'Code Language', value: features.codeLanguage || 'None' },
    { label: 'Has Question', value: features.hasQuestion ? 'Yes' : 'No' },
    { label: 'Action Verbs', value: features.actionVerbCount.toString() },
    { label: 'Technical Terms', value: features.technicalTermCount.toString() },
    { label: 'Complexity', value: features.complexity },
    { label: 'Domain', value: features.domain },
    { label: 'Has URLs', value: features.hasUrls ? 'Yes' : 'No' },
    { label: 'Has File Paths', value: features.hasFilePaths ? 'Yes' : 'No' },
    { label: 'Has Numbers', value: features.hasNumbers ? 'Yes' : 'No' },
    { label: 'Sentiment', value: features.sentiment.toFixed(2) },
    { label: 'Subjectivity', value: features.subjectivity.toFixed(2) },
    { label: 'Hour of Day', value: features.hourOfDay.toString() },
    { label: 'Day of Week', value: features.dayOfWeek.toString() },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
      {featureItems.map((item) => (
        <div key={item.label} className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
          <div className="font-medium text-gray-700 dark:text-gray-300">{item.label}</div>
          <div className="text-gray-900 dark:text-gray-100">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

interface ProbabilityBarProps {
  category: TaskCategory;
  probability: number;
  isHighest: boolean;
}

function ProbabilityBar({ category, probability, isHighest }: ProbabilityBarProps) {
  const percentage = (probability * 100).toFixed(1);

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 text-sm truncate" title={category}>
        {category}
      </div>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isHighest
              ? 'bg-blue-500 dark:bg-blue-400'
              : 'bg-blue-300 dark:bg-blue-600'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="w-12 text-sm text-right">{percentage}%</div>
    </div>
  );
}

export default function TaskClassifierDashboard() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [features, setFeatures] = useState<ReturnType<typeof getTaskFeatures> | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [trainingCount, setTrainingCount] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const [showFeatures, setShowFeatures] = useState(true);
  const [showProbabilities, setShowProbabilities] = useState(true);

  // Load initial metrics
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = () => {
    const currentMetrics = getModelAccuracy();
    setMetrics(currentMetrics);
    setTrainingCount(getTrainingExamples().length);
  };

  const handleClassify = () => {
    if (!input.trim()) return;

    setIsClassifying(true);

    try {
      const context: FeatureExtractionContext = {
        timestamp: Date.now(),
        appContext: 'dashboard',
      };

      // Classify
      const classificationResult = classifyTask(input, context);
      setResult(classificationResult);

      // Extract features
      const taskFeatures = getTaskFeatures(input, context);
      setFeatures(taskFeatures);

      // Reload metrics
      loadMetrics();
    } catch (error) {
      console.error('Classification error:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleExampleClick = (exampleInput: string) => {
    setInput(exampleInput);
  };

  const handleResetModel = () => {
    if (confirm('Are you sure you want to reset the model? This will clear all training data.')) {
      resetModel();
      trainModel(DEFAULT_TRAINING_EXAMPLES);
      setResult(null);
      setFeatures(null);
      loadMetrics();
    }
  };

  const handleRetrain = () => {
    trainModel(getTrainingExamples());
    loadMetrics();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b dark:border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Task Classifier Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Test and visualize the ML-based task classification system for intelligent agent selection
        </p>
      </div>

      {/* Model Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Model Metrics
        </h2>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Accuracy
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {(metrics.accuracy * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                Training Examples
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {metrics.trainingExamples}
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
              <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Predictions
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {metrics.predictions}
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded">
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                Model Version
              </div>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {metrics.version}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleRetrain}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
          >
            Retrain Model
          </button>
          <button
            onClick={handleResetModel}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
          >
            Reset Model
          </button>
        </div>
      </div>

      {/* Classification Test */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Test Classification
        </h2>

        <div className="space-y-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a task description to classify..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-none"
            rows={3}
          />

          <div className="flex gap-2">
            <button
              onClick={handleClassify}
              disabled={isClassifying || !input.trim()}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded transition font-medium"
            >
              {isClassifying ? 'Classifying...' : 'Classify Task'}
            </button>
          </div>

          {/* Example Inputs */}
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Try these examples:
            </div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_TRAINING_EXAMPLES.slice(0, 6).map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example.input)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
                >
                  {example.input.slice(0, 30)}...
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Classification Result */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Classification Result
          </h2>

          <div className="space-y-4">
            {/* Primary Category */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Predicted Category
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {result.category}
              </div>
              {result.subcategory && (
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Subcategory: {result.subcategory}
                </div>
              )}
            </div>

            {/* Confidence */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confidence
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {(result.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${result.confidence * 100}%` }}
                />
              </div>
            </div>

            {/* Probability Distribution */}
            {showProbabilities && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Probability Distribution
                  </h3>
                  <button
                    onClick={() => setShowProbabilities(!showProbabilities)}
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    Hide
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(result.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, probability], index) => (
                      <ProbabilityBar
                        key={category}
                        category={category as TaskCategory}
                        probability={probability}
                        isHighest={index === 0}
                      />
                    ))}
                </div>
              </div>
            )}

            {!showProbabilities && (
              <button
                onClick={() => setShowProbabilities(true)}
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                Show Probability Distribution
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feature Visualization */}
      {features && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Extracted Features
            </h2>
            <button
              onClick={() => setShowFeatures(!showFeatures)}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              {showFeatures ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFeatures && <FeatureDisplay features={features} />}
        </div>
      )}

      {/* Per-Category Accuracy */}
      {metrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Per-Category Accuracy
          </h2>

          <div className="space-y-2">
            {Object.entries(metrics.categoryAccuracy)
              .sort(([, a], [, b]) => b - a)
              .map(([category, accuracy]) => (
                <div key={category} className="flex items-center gap-2">
                  <div className="w-32 text-sm truncate" title={category}>
                    {category}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-500 dark:bg-green-400 h-3 transition-all duration-300"
                      style={{ width: `${(accuracy * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-right text-gray-600 dark:text-gray-400">
                    {accuracy > 0 ? `${(accuracy * 100).toFixed(0)}%` : 'N/A'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About Task Classification
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            This dashboard demonstrates the ML-based task classification system for Neural MPC
            (Model Predictive Control) agent selection. The system uses:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Naive Bayes classifier with feature engineering</li>
            <li>18-dimensional feature vector from text analysis</li>
            <li>10 primary task categories with subcategories</li>
            <li>Online learning for continuous improvement</li>
            <li>Target: 80%+ classification accuracy</li>
          </ul>
          <p className="mt-2">
            Try entering different task descriptions above to see how the classifier predicts
            the appropriate agent. The system learns from feedback and improves over time.
          </p>
        </div>
      </div>
    </div>
  );
}

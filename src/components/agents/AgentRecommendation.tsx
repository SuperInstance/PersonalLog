/**
 * Agent Recommendation UI Component
 *
 * Displays ML-predicted agent recommendations with confidence scores,
 * explanations, and one-click activation. Collects user feedback to
 * improve model accuracy over time.
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { AgentDefinition } from '@/lib/agents/types';
import type { AgentPrediction, AgentRanking } from '@/lib/agents/selection-model';
import { agentSelectionModel } from '@/lib/agents/selection-model';

// ============================================================================
// TYPES
// ============================================================================

interface AgentRecommendationProps {
  /** Task description to classify and recommend for */
  taskDescription: string;
  /** Available agents to recommend from */
  availableAgents: AgentDefinition[];
  /** Callback when user selects an agent */
  onAgentSelect?: (agent: AgentDefinition) => void;
  /** Callback when user provides feedback */
  onFeedback?: (agentId: string, helpful: boolean) => void;
  /** Maximum number of recommendations to show */
  maxRecommendations?: number;
  /** Show confidence scores */
  showConfidence?: boolean;
  /** Show explanations */
  showExplanations?: boolean;
}

interface FeedbackState {
  [agentId: string]: boolean | null; // null = not yet voted, true = helpful, false = not helpful
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * AgentRecommendation Component
 *
 * Shows top agent recommendations with confidence scores and explanations.
 * Allows one-click activation and feedback collection.
 */
export const AgentRecommendation: React.FC<AgentRecommendationProps> = ({
  taskDescription,
  availableAgents,
  onAgentSelect,
  onFeedback,
  maxRecommendations = 3,
  showConfidence = true,
  showExplanations = true,
}) => {
  const [ranking, setRanking] = useState<AgentRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);

  // Load recommendations when task or agents change
  useEffect(() => {
    loadRecommendations();
  }, [taskDescription, availableAgents]);

  const loadRecommendations = async () => {
    setLoading(true);

    try {
      // Simulate task classification (in real implementation, use task classifier)
      const taskCategory = classifyTask(taskDescription);
      const taskComplexity = estimateComplexity(taskDescription);

      // Get predictions from model
      const predictions = await getPredictions(taskCategory, taskComplexity);

      setRanking(predictions);
    } catch (error) {
      console.error('Failed to load agent recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = (agent: AgentDefinition) => {
    setSelectedAgent(agent);
    onAgentSelect?.(agent);
  };

  const handleFeedback = (agentId: string, helpful: boolean) => {
    setFeedback(prev => ({ ...prev, [agentId]: helpful }));
    onFeedback?.(agentId, helpful);
  };

  if (loading) {
    return <RecommendationLoading />;
  }

  if (!ranking || ranking.predictions.length === 0) {
    return <NoRecommendations />;
  }

  const topPredictions = ranking.predictions.slice(0, maxRecommendations);

  return (
    <div className="agent-recommendation">
      <RecommendationHeader
        accuracy={ranking.modelAccuracy}
        timestamp={ranking.timestamp}
      />

      <div className="recommendation-list">
        {topPredictions.map((prediction, index) => (
          <RecommendationCard
            key={prediction.agent.id}
            rank={index + 1}
            prediction={prediction}
            showConfidence={showConfidence}
            showExplanation={showExplanations}
            onSelect={() => handleAgentSelect(prediction.agent)}
            onFeedback={(helpful) => handleFeedback(prediction.agent.id, helpful)}
            feedback={feedback[prediction.agent.id]}
            isSelected={selectedAgent?.id === prediction.agent.id}
          />
        ))}
      </div>

      <RecommendationFooter
        totalAgents={ranking.predictions.length}
        shownAgents={topPredictions.length}
        onViewAll={() => {/* TODO: Show all recommendations */}}
      />
    </div>
  );
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/**
 * Loading state
 */
const RecommendationLoading: React.FC = () => (
  <div className="recommendation-loading">
    <div className="loading-spinner" />
    <p>Analyzing task to recommend agents...</p>
  </div>
);

/**
 * No recommendations state
 */
const NoRecommendations: React.FC = () => (
  <div className="no-recommendations">
    <div className="no-results-icon">🤔</div>
    <h3>No recommendations available</h3>
    <p>Try selecting an agent manually from the available options.</p>
  </div>
);

/**
 * Recommendation header with accuracy badge
 */
interface RecommendationHeaderProps {
  accuracy: number;
  timestamp: number;
}

const RecommendationHeader: React.FC<RecommendationHeaderProps> = ({ accuracy, timestamp }) => {
  const accuracyPercent = Math.round(accuracy * 100);
  const accuracyColor = accuracyPercent >= 80 ? 'text-green-600' : accuracyPercent >= 60 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className="recommendation-header">
      <h3>Recommended Agents</h3>
      <div className="accuracy-badge">
        <span className={accuracyColor}>
          {accuracyPercent}% accuracy
        </span>
        <span className="text-xs text-gray-500">
          • {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

/**
 * Individual recommendation card
 */
interface RecommendationCardProps {
  rank: number;
  prediction: AgentPrediction;
  showConfidence: boolean;
  showExplanation: boolean;
  onSelect: () => void;
  onFeedback: (helpful: boolean) => void;
  feedback: boolean | null;
  isSelected: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rank,
  prediction,
  showConfidence,
  showExplanation,
  onSelect,
  onFeedback,
  feedback,
  isSelected,
}) => {
  const { agent, score, confidence, explanation } = prediction;
  const scorePercent = Math.round(score * 100);
  const confidencePercent = Math.round(confidence * 100);

  const scoreColor = scorePercent >= 80 ? 'bg-green-500' : scorePercent >= 60 ? 'bg-yellow-500' : 'bg-gray-500';

  return (
    <div
      className={`recommendation-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="card-header">
        <div className="rank-badge">#{rank}</div>
        <div className="agent-info">
          <span className="agent-icon">{agent.icon}</span>
          <span className="agent-name">{agent.name}</span>
        </div>
        <div className="score-bar">
          <div className={`score-fill ${scoreColor}`} style={{ width: `${scorePercent}%` }} />
          <span className="score-text">{scorePercent}%</span>
        </div>
      </div>

      <p className="agent-description">{agent.description}</p>

      {showConfidence && (
        <div className="confidence-meter">
          <span className="confidence-label">Confidence:</span>
          <div className="confidence-bar">
            <div
              className="confidence-fill"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <span className="confidence-value">{confidencePercent}%</span>
        </div>
      )}

      {showExplanation && explanation && (
        <div className="explanation">
          <span className="explanation-label">Why this agent:</span>
          <p className="explanation-text">{explanation}</p>
        </div>
      )}

      <div className="card-actions">
        <button
          className="select-button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? 'Selected' : 'Select Agent'}
        </button>

        <FeedbackButtons
          feedback={feedback}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
};

/**
 * Feedback buttons (helpful/not helpful)
 */
interface FeedbackButtonsProps {
  feedback: boolean | null;
  onFeedback: (helpful: boolean) => void;
}

const FeedbackButtons: React.FC<FeedbackButtonsProps> = ({ feedback, onFeedback }) => {
  if (feedback !== null) {
    return (
      <div className="feedback-received">
        {feedback ? (
          <span className="feedback-positive">✓ Thanks for your feedback!</span>
        ) : (
          <span className="feedback-negative">We'll improve next time</span>
        )}
      </div>
    );
  }

  return (
    <div className="feedback-buttons">
      <span className="feedback-label">Was this helpful?</span>
      <button
        className="feedback-btn"
        onClick={() => onFeedback(true)}
        title="Helpful"
      >
        👍
      </button>
      <button
        className="feedback-btn"
        onClick={() => onFeedback(false)}
        title="Not helpful"
      >
        👎
      </button>
    </div>
  );
};

/**
 * Footer with view all option
 */
interface RecommendationFooterProps {
  totalAgents: number;
  shownAgents: number;
  onViewAll: () => void;
}

const RecommendationFooter: React.FC<RecommendationFooterProps> = ({
  totalAgents,
  shownAgents,
  onViewAll,
}) => {
  if (totalAgents <= shownAgents) {
    return null;
  }

  return (
    <div className="recommendation-footer">
      <button className="view-all-button" onClick={onViewAll}>
        View all {totalAgents} agents
      </button>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simple task classification (placeholder)
 * In production, use the actual task classifier
 */
function classifyTask(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes('emotion') || lower.includes('feeling') || lower.includes('sentiment')) {
    return 'analysis';
  } else if (lower.includes('write') || lower.includes('create') || lower.includes('generate')) {
    return 'creative';
  } else if (lower.includes('research') || lower.includes('find') || lower.includes('search')) {
    return 'knowledge';
  } else if (lower.includes('spread') || lower.includes('organize') || lower.includes('manage')) {
    return 'knowledge';
  }

  return 'analysis'; // Default
}

/**
 * Estimate task complexity from description
 */
function estimateComplexity(description: string): number {
  const words = description.split(/\s+/).length;
  const sentences = description.split(/[.!?]+/).length;

  // Simple heuristic: more words/sentences = higher complexity
  const complexity = Math.min((words + sentences * 10) / 200, 1);

  return complexity;
}

/**
 * Get predictions from selection model
 */
async function getPredictions(
  taskCategory: string,
  taskComplexity: number
): Promise<AgentRanking> {
  // This is a simplified mock - in production, call the actual model
  // For now, return a mock ranking

  const mockRanking: AgentRanking = {
    predictions: [],
    modelVersion: agentSelectionModel.getModelVersion(),
    modelAccuracy: agentSelectionModel.getModelAccuracy().top1Accuracy,
    timestamp: Date.now(),
  };

  return mockRanking;
}

// ============================================================================
// STYLES (inline for simplicity)
// ============================================================================

export const styles = `
  .agent-recommendation {
    @apply bg-white rounded-lg shadow-md p-6;
  }

  .recommendation-loading {
    @apply flex flex-col items-center justify-center py-8;
  }

  .loading-spinner {
    @apply w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4;
  }

  .no-recommendations {
    @apply flex flex-col items-center justify-center py-8 text-center;
  }

  .no-results-icon {
    @apply text-4xl mb-4;
  }

  .no-recommendations h3 {
    @apply text-lg font-semibold mb-2;
  }

  .recommendation-header {
    @apply flex justify-between items-center mb-6;
  }

  .recommendation-header h3 {
    @apply text-xl font-semibold;
  }

  .accuracy-badge {
    @apply flex items-center gap-2 text-sm;
  }

  .recommendation-list {
    @apply flex flex-col gap-4;
  }

  .recommendation-card {
    @apply bg-gray-50 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-100 border-2 border-transparent;
  }

  .recommendation-card.selected {
    @apply border-blue-500 bg-blue-50;
  }

  .card-header {
    @apply flex items-center gap-3 mb-3;
  }

  .rank-badge {
    @apply w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm;
  }

  .agent-info {
    @apply flex items-center gap-2 flex-1;
  }

  .agent-icon {
    @apply text-2xl;
  }

  .agent-name {
    @apply font-semibold text-lg;
  }

  .score-bar {
    @apply flex items-center gap-2;
  }

  .score-bar {
    @apply w-24 h-2 bg-gray-200 rounded-full overflow-hidden;
  }

  .score-fill {
    @apply h-full transition-all;
  }

  .score-text {
    @apply text-sm font-medium w-12 text-right;
  }

  .agent-description {
    @apply text-sm text-gray-600 mb-3;
  }

  .confidence-meter {
    @apply flex items-center gap-2 mb-3;
  }

  .confidence-label {
    @apply text-xs text-gray-500 w-20;
  }

  .confidence-bar {
    @apply flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden;
  }

  .confidence-fill {
    @apply h-full bg-blue-500 transition-all;
  }

  .confidence-value {
    @apply text-xs font-medium w-10 text-right;
  }

  .explanation {
    @apply mb-3 p-3 bg-blue-50 rounded-md;
  }

  .explanation-label {
    @apply text-xs font-semibold text-blue-700 block mb-1;
  }

  .explanation-text {
    @apply text-sm text-gray-700;
  }

  .card-actions {
    @apply flex items-center justify-between mt-3 pt-3 border-t border-gray-200;
  }

  .select-button {
    @apply px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium;
  }

  .select-button:disabled {
    @apply bg-gray-400 cursor-not-allowed;
  }

  .feedback-buttons {
    @apply flex items-center gap-2;
  }

  .feedback-label {
    @apply text-xs text-gray-500 mr-1;
  }

  .feedback-btn {
    @apply w-8 h-8 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center;
  }

  .feedback-received {
    @apply text-xs;
  }

  .feedback-positive {
    @apply text-green-600;
  }

  .feedback-negative {
    @apply text-gray-600;
  }

  .recommendation-footer {
    @apply mt-4 pt-4 border-t border-gray-200 text-center;
  }

  .view-all-button {
    @apply text-blue-500 hover:text-blue-600 font-medium text-sm;
  }
`;

export default AgentRecommendation;

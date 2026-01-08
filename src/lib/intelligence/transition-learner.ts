/**
 * Transition Learning System
 *
 * Learns state transition patterns from conversation history.
 * Builds probability matrices and detects common patterns.
 *
 * Part of Neural MPC Phase 2: World Model Foundation
 */

import type {
  ConversationState,
  StateTransition,
  TransitionProbability,
  TransitionPattern,
  TransitionLearningConfig,
} from './world-model-types';
import { TransitionTrigger } from './world-model-types';
import { DEFAULT_WORLD_MODEL_CONFIG } from './world-model-types';

// ============================================================================
// STATE
// ============================================================================

let config: TransitionLearningConfig = DEFAULT_WORLD_MODEL_CONFIG.transitionLearning;

// Transition history
let transitionHistory: StateTransition[] = [];

// Transition probability matrix: fromStateId -> [{toStateId, probability, count}]
let transitionMatrix: Map<string, TransitionProbability[]> = new Map();

// Detected patterns
let patterns: TransitionPattern[] = [];

// Temporal weights for transitions (stateId -> weight)
let temporalWeights: Map<string, number> = new Map();

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Update transition learning configuration
 */
export function updateTransitionLearningConfig(newConfig: Partial<TransitionLearningConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current configuration
 */
export function getTransitionLearningConfig(): TransitionLearningConfig {
  return { ...config };
}

/**
 * Reset all learned transitions
 */
export function resetTransitions(): void {
  transitionHistory = [];
  transitionMatrix.clear();
  patterns = [];
  temporalWeights.clear();
}

// ============================================================================
// TRANSITION TRACKING
// ============================================================================

/**
 * Record a state transition
 */
export function recordTransition(
  fromState: ConversationState,
  toState: ConversationState,
  trigger: TransitionTrigger
): StateTransition {
  const transition: StateTransition = {
    id: `trans-${fromState.id}-${toState.id}-${Date.now()}`,
    fromStateId: fromState.id,
    toStateId: toState.id,
    timestamp: Date.now(),
    timeDelta: toState.timestamp - fromState.timestamp,
    trigger,
    probability: 0, // Will be updated after matrix rebuild
    occurrenceCount: 1,
  };

  // Add to history
  transitionHistory.push(transition);

  // Trim history if needed
  if (transitionHistory.length > config.maxHistorySize) {
    transitionHistory = transitionHistory.slice(-config.maxHistorySize);
  }

  // Update transition matrix
  updateTransitionMatrix(transition);

  // Update temporal weights
  updateTemporalWeights(transition);

  // Mine for patterns periodically
  if (transitionHistory.length % 50 === 0) {
    minePatterns();
  }

  return transition;
}

/**
 * Update transition probability matrix
 */
function updateTransitionMatrix(transition: StateTransition): void {
  const { fromStateId, toStateId } = transition;

  // Get existing transitions from this state
  let transitions = transitionMatrix.get(fromStateId);
  if (!transitions) {
    transitions = [];
    transitionMatrix.set(fromStateId, transitions);
  }

  // Find existing transition to this target
  let existing = transitions.find((t) => t.toState === toStateId);
  if (existing) {
    // Update existing
    existing.count++;
    existing.lastSeen = transition.timestamp;
  } else {
    // Add new transition
    transitions.push({
      fromState: fromStateId,
      toState: toStateId,
      probability: 0, // Will be normalized
      count: 1,
      lastSeen: transition.timestamp,
    });
  }

  // Recalculate probabilities
  normalizeProbabilities(fromStateId);
}

/**
 * Normalize probabilities for transitions from a state
 */
function normalizeProbabilities(fromStateId: string): void {
  const transitions = transitionMatrix.get(fromStateId);
  if (!transitions || transitions.length === 0) return;

  // Calculate total occurrences
  let total = 0;
  for (const t of transitions) {
    let weight = t.count;

    // Apply temporal decay if enabled
    if (config.useTemporalDecay) {
      const age = Date.now() - t.lastSeen;
      const decayFactor = Math.exp(-config.decayRate * (age / 86400000)); // Decay per day
      weight *= decayFactor;
    }

    total += weight;
  }

  // Normalize
  for (const t of transitions) {
    let weight = t.count;

    if (config.useTemporalDecay) {
      const age = Date.now() - t.lastSeen;
      const decayFactor = Math.exp(-config.decayRate * (age / 86400000));
      weight *= decayFactor;
    }

    t.probability = total > 0 ? weight / total : 0;
  }
}

/**
 * Update temporal weights for states
 */
function updateTemporalWeights(transition: StateTransition): void {
  if (!config.useTemporalDecay) return;

  // Boost weight of recently used states
  const now = Date.now();
  const decay = Math.exp(-config.decayRate * ((now - transition.timestamp) / 86400000));

  temporalWeights.set(transition.fromStateId, (temporalWeights.get(transition.fromStateId) || 0) + decay);
  temporalWeights.set(transition.toStateId, (temporalWeights.get(transition.toStateId) || 0) + decay);
}

// ============================================================================
// PREDICTION
// ============================================================================

/**
 * Predict likely next states from current state
 */
export function predictTransitions(
  currentState: ConversationState,
  limit: number = 5
): Array<{ toState: string; probability: number; confidence: number }> {
  const transitions = transitionMatrix.get(currentState.id);

  if (!transitions || transitions.length === 0) {
    // No transition history for this state
    return [];
  }

  // Filter by minimum occurrences
  const filtered = transitions.filter((t) => t.count >= config.minOccurrences);

  // Sort by probability
  const sorted = filtered
    .map((t) => ({
      toState: t.toState,
      probability: t.probability,
      confidence: Math.min(1, t.count / 10), // More data = higher confidence
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, limit);

  return sorted;
}

/**
 * Get transition probability between two specific states
 */
export function getTransitionProbability(fromStateId: string, toStateId: string): number {
  const transitions = transitionMatrix.get(fromStateId);
  if (!transitions) return 0;

  const transition = transitions.find((t) => t.toState === toStateId);
  return transition?.probability || 0;
}

/**
 * Get all transitions from a state
 */
export function getTransitionsFrom(stateId: string): TransitionProbability[] {
  return transitionMatrix.get(stateId) || [];
}

/**
 * Get all transitions to a state
 */
export function getTransitionsTo(stateId: string): TransitionProbability[] {
  const results: TransitionProbability[] = [];

  for (const transitions of transitionMatrix.values()) {
    const found = transitions.find((t) => t.toState === stateId);
    if (found) {
      results.push(found);
    }
  }

  return results;
}

// ============================================================================
// PATTERN MINING
// ============================================================================

/**
 * Mine for common transition patterns
 */
export function minePatterns(): TransitionPattern[] {
  // Simple sequence mining: look for common 3-state sequences
  const sequences = new Map<string, { count: number; totalTime: number; triggers: Set<TransitionTrigger> }>();

  // Extract sequences
  for (let i = 0; i < transitionHistory.length - 2; i++) {
    const t1 = transitionHistory[i];
    const t2 = transitionHistory[i + 1];
    const t3 = transitionHistory[i + 2];

    const seqKey = `${t1.fromStateId}->${t2.fromStateId}->${t3.fromStateId}`;

    if (!sequences.has(seqKey)) {
      sequences.set(seqKey, { count: 0, totalTime: 0, triggers: new Set() });
    }

    const seq = sequences.get(seqKey)!;
    seq.count++;
    seq.totalTime += t1.timeDelta + t2.timeDelta;
    seq.triggers.add(t1.trigger);
  }

  // Convert to patterns
  const newPatterns: TransitionPattern[] = [];
  const totalTransitions = transitionHistory.length;

  for (const [seqKey, data] of sequences.entries()) {
    const frequency = data.count / totalTransitions;

    // Filter by minimum support
    if (frequency >= config.minSupport) {
      const stateSequence = seqKey.split('->');

      newPatterns.push({
        id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        stateSequence,
        frequency,
        avgDuration: data.totalTime / data.count,
        commonTriggers: Array.from(data.triggers),
        confidence: Math.min(1, data.count / 10),
      });
    }
  }

  // Sort by frequency
  newPatterns.sort((a, b) => b.frequency - a.frequency);

  // Keep top patterns
  patterns = newPatterns.slice(0, 100);

  return patterns;
}

/**
 * Get detected patterns
 */
export function getPatterns(): TransitionPattern[] {
  return [...patterns];
}

/**
 * Check if current state matches a pattern
 */
export function matchPattern(recentStateIds: string[]): TransitionPattern | null {
  if (recentStateIds.length < 3) return null;

  const sequenceKey = recentStateIds.slice(-3).join('->');

  for (const pattern of patterns) {
    const patternKey = pattern.stateSequence.join('->');
    if (patternKey === sequenceKey) {
      return pattern;
    }
  }

  return null;
}

// ============================================================================
// ANALYSIS
// ============================================================================

/**
 * Get transition statistics
 */
export function getTransitionStats(): {
  totalTransitions: number;
  uniqueStates: number;
  avgTransitionsPerState: number;
  mostCommonTriggers: Array<{ trigger: TransitionTrigger; count: number }>;
  patternCount: number;
} {
  const totalTransitions = transitionHistory.length;
  const uniqueStates = transitionMatrix.size;

  let avgTransitionsPerState = 0;
  if (uniqueStates > 0) {
    const totalFromStates = Array.from(transitionMatrix.values()).reduce((sum, trans) => sum + trans.length, 0);
    avgTransitionsPerState = totalFromStates / uniqueStates;
  }

  // Count triggers
  const triggerCounts = new Map<TransitionTrigger, number>();
  for (const trans of transitionHistory) {
    triggerCounts.set(trans.trigger, (triggerCounts.get(trans.trigger) || 0) + 1);
  }

  const mostCommonTriggers = Array.from(triggerCounts.entries())
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalTransitions,
    uniqueStates,
    avgTransitionsPerState,
    mostCommonTriggers,
    patternCount: patterns.length,
  };
}

/**
 * Get rare transitions (potential anomalies)
 */
export function getRareTransitions(threshold: number = 0.05): Array<{
  fromState: string;
  toState: string;
  probability: number;
  count: number;
}> {
  const rare: Array<{ fromState: string; toState: string; probability: number; count: number }> = [];

  for (const [fromState, transitions] of transitionMatrix.entries()) {
    for (const trans of transitions) {
      if (trans.probability < threshold && trans.count > 0) {
        rare.push({
          fromState,
          toState: trans.toState,
          probability: trans.probability,
          count: trans.count,
        });
      }
    }
  }

  // Sort by probability (ascending)
  rare.sort((a, b) => a.probability - b.probability);

  return rare.slice(0, 20);
}

// ============================================================================
// LEARNING FROM HISTORY
// ============================================================================

/**
 * Learn transitions from historical state sequence
 */
export function learnTransitions(states: ConversationState[], triggers?: TransitionTrigger[]): void {
  if (states.length < 2) return;

  for (let i = 1; i < states.length; i++) {
    const fromState = states[i - 1];
    const toState = states[i];
    const trigger = triggers?.[i - 1] || TransitionTrigger.UNKNOWN;

    recordTransition(fromState, toState, trigger);
  }

  // Mine patterns after learning
  minePatterns();
}

/**
 * Export learned transitions
 */
export function exportTransitions(): {
  matrix: Array<{ fromState: string; transitions: TransitionProbability[] }>;
  patterns: TransitionPattern[];
  stats: ReturnType<typeof getTransitionStats>;
} {
  const matrix = Array.from(transitionMatrix.entries()).map(([fromState, transitions]) => ({
    fromState,
    transitions: [...transitions],
  }));

  return {
    matrix,
    patterns: [...patterns],
    stats: getTransitionStats(),
  };
}

/**
 * Import learned transitions
 */
export function importTransitions(data: {
  matrix: Array<{ fromState: string; transitions: TransitionProbability[] }>;
  patterns?: TransitionPattern[];
}): void {
  // Rebuild matrix
  transitionMatrix.clear();
  for (const { fromState, transitions } of data.matrix) {
    transitionMatrix.set(fromState, [...transitions]);
  }

  // Import patterns if provided
  if (data.patterns) {
    patterns = data.patterns;
  }
}

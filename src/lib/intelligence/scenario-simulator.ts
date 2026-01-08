/**
 * Scenario Simulator for What-If Analysis
 *
 * Enables testing different actions before execution:
 * - "What if" simulations
 * - Test different actions before execution
 * - Predict outcomes
 * - Compare scenarios
 * - Recommend best action
 *
 * Features:
 * - Simulate agent activation/deactivation
 * - Simulate task changes
 * - Simulate resource usage
 * - Compare multiple scenarios
 * - Action recommendations
 *
 * Part of Neural MPC Phase 2: Scenario Simulation
 */

import type {
  ConversationState,
  PredictedState,
  UserIntent,
} from './world-model-types';
import type { TaskType } from '@/lib/agents/performance-types';
import { WorldModel } from './world-model';
import { predictEnsembleStates, PredictionMethod } from './advanced-prediction';
import { DEFAULT_HORIZONS } from './world-model-types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Action types for simulation
 */
export const enum ActionType {
  /** Activate an agent */
  ACTIVATE_AGENT = 'activate_agent',
  /** Deactivate an agent */
  DEACTIVATE_AGENT = 'deactivate_agent',
  /** Start a task */
  START_TASK = 'start_task',
  /** Complete a task */
  COMPLETE_TASK = 'complete_task',
  /** Send a message */
  SEND_MESSAGE = 'send_message',
  /** Change topic */
  CHANGE_TOPIC = 'change_topic',
  /** Wait (time passage) */
  WAIT = 'wait',
  /** Multiple actions in sequence */
  SEQUENCE = 'sequence',
}

/**
 * Simulated action
 */
export interface SimulatedAction {
  /** Action type */
  type: ActionType;
  /** Action parameters */
  params: {
    /** Agent ID (for agent actions) */
    agentId?: string;
    /** Task type (for task actions) */
    taskType?: TaskType;
    /** Message content (for message actions) */
    messageContent?: string;
    /** Topic (for topic change) */
    topic?: string;
    /** Wait duration in ms (for wait) */
    duration?: number;
    /** Sequence of actions (for sequence) */
    actions?: SimulatedAction[];
  };
  /** Expected outcome confidence (0-1) */
  expectedConfidence: number;
  /** Estimated resource cost */
  estimatedCost: {
    tokens: number;
    timeMs: number;
  };
}

/**
 * Simulation scenario
 */
export interface SimulationScenario {
  /** Scenario ID */
  id: string;
  /** Scenario name */
  name: string;
  /** Description */
  description: string;
  /** Initial state */
  initialState: ConversationState;
  /** Actions to simulate */
  actions: SimulatedAction[];
  /** Simulated outcome */
  outcome: SimulationOutcome;
  /** Simulated timestamp */
  timestamp: number;
}

/**
 * Simulation outcome
 */
export interface SimulationOutcome {
  /** Final predicted state */
  finalState: PredictedState[];
  /** Total resource cost */
  totalCost: {
    tokens: number;
    timeMs: number;
  };
  /** Expected user satisfaction (0-1) */
  userSatisfaction: number;
  /** Expected task completion (0-1) */
  taskCompletion: number;
  /** Risk score (0-1, higher = riskier) */
  riskScore: number;
  /** Conflicts or issues detected */
  issues: string[];
  /** Overall scenario score (0-1) */
  overallScore: number;
}

/**
 * Scenario comparison result
 */
export interface ScenarioComparison {
  /** Scenarios compared */
  scenarios: SimulationScenario[];
  /** Ranked scenarios */
  ranking: Array<{
    scenario: SimulationScenario;
    rank: number;
    score: number;
    pros: string[];
    cons: string[];
  }>;
  /** Recommendation */
  recommendation: {
    scenario: SimulationScenario;
    confidence: number;
    reason: string;
  };
}

/**
 * Action recommendation
 */
export interface ActionRecommendation {
  /** Recommended action */
  action: SimulatedAction;
  /** Expected outcome */
  expectedOutcome: SimulationOutcome;
  /** Confidence in recommendation (0-1) */
  confidence: number;
  /** Reason for recommendation */
  reason: string;
  /** Alternative actions */
  alternatives: Array<{
    action: SimulatedAction;
    outcome: SimulationOutcome;
    reason: string;
  }>;
}

// ============================================================================
// STATE
// ============================================================================

// Simulation history
const simulationHistory: SimulationScenario[] = [];

// Simulation configuration
let simConfig = {
  // Maximum simulation depth
  maxDepth: 10,

  // Maximum branch factor
  maxBranches: 5,

  // Resource cost estimates
  costEstimates: {
    agentActivation: { tokens: 500, timeMs: 2000 },
    agentDeactivation: { tokens: 100, timeMs: 500 },
    taskStart: { tokens: 1000, timeMs: 3000 },
    taskComplete: { tokens: 500, timeMs: 2000 },
    messageSend: { tokens: 2000, timeMs: 5000 },
    topicChange: { tokens: 300, timeMs: 1000 },
    wait: { tokens: 0, timeMs: 0 },
  },

  // Scoring weights
  scoringWeights: {
    userSatisfaction: 0.35,
    taskCompletion: 0.30,
    resourceEfficiency: 0.20,
    risk: 0.15,
  },
};

// ============================================================================
// ACTION SIMULATION
// ============================================================================

/**
 * Simulate a single action from a state
 */
export async function simulateAction(
  currentState: ConversationState,
  action: SimulatedAction,
  worldModel?: WorldModel
): Promise<SimulationOutcome> {
  const model = worldModel || new WorldModel();

  // Apply action to state to get next state
  const nextState = applyAction(currentState, action);

  // Predict future states from next state
  const predictions = await predictEnsembleStates(nextState, DEFAULT_HORIZONS.SHORT_TERM, model);

  // Calculate outcome metrics
  const totalCost = estimateActionCost(action);
  const userSatisfaction = estimateUserSatisfaction(currentState, nextState, action);
  const taskCompletion = estimateTaskCompletion(currentState, nextState, action);
  const riskScore = calculateRiskScore(currentState, action, predictions);
  const issues = detectIssues(currentState, action, predictions);

  // Calculate overall score
  const overallScore = calculateOverallScore({
    userSatisfaction,
    taskCompletion,
    resourceEfficiency: calculateResourceEfficiency(totalCost),
    risk: riskScore,
  });

  return {
    finalState: predictions,
    totalCost,
    userSatisfaction,
    taskCompletion,
    riskScore,
    issues,
    overallScore,
  };
}

/**
 * Apply action to state (deterministic state transition)
 */
function applyAction(state: ConversationState, action: SimulatedAction): ConversationState {
  const nextState: ConversationState = { ...state };

  switch (action.type) {
    case ActionType.ACTIVATE_AGENT:
      if (action.params.agentId && !nextState.activeAgents.includes(action.params.agentId)) {
        nextState.activeAgents = [...nextState.activeAgents, action.params.agentId];
        nextState.activeAgentCount = nextState.activeAgents.length;
        nextState.lastUsedAgent = action.params.agentId;
      }
      break;

    case ActionType.DEACTIVATE_AGENT:
      if (action.params.agentId) {
        nextState.activeAgents = nextState.activeAgents.filter((id) => id !== action.params.agentId);
        nextState.activeAgentCount = nextState.activeAgents.length;
      }
      break;

    case ActionType.START_TASK:
      if (action.params.taskType) {
        nextState.currentTaskType = action.params.taskType;
        nextState.tasksInProgress = (nextState.tasksInProgress || 0) + 1;
      }
      break;

    case ActionType.COMPLETE_TASK:
      nextState.tasksInProgress = Math.max(0, (nextState.tasksInProgress || 1) - 1);
      if (nextState.tasksInProgress === 0) {
        nextState.currentTaskType = null;
      }
      break;

    case ActionType.SEND_MESSAGE:
      nextState.messageCount = nextState.messageCount + 1;
      nextState.totalTokens = nextState.totalTokens + (action.estimatedCost.tokens || 1000);
      break;

    case ActionType.CHANGE_TOPIC:
      if (action.params.topic) {
        nextState.currentTopic = action.params.topic;
        nextState.topicShifts = (nextState.topicShifts || 0) + 1;
      }
      break;

    case ActionType.WAIT:
      if (action.params.duration) {
        nextState.timestamp = nextState.timestamp + action.params.duration;
        nextState.timeSinceLastMessage = nextState.timeSinceLastMessage + action.params.duration;
      }
      break;

    case ActionType.SEQUENCE:
      // Apply actions in sequence
      let seqState = nextState;
      for (const seqAction of action.params.actions || []) {
        seqState = applyAction(seqState, seqAction);
      }
      return seqState;
  }

  // Update timestamp
  nextState.timestamp = Date.now();

  return nextState;
}

/**
 * Estimate action cost
 */
function estimateActionCost(action: SimulatedAction): { tokens: number; timeMs: number } {
  const key = actionTypeToKey(action.type) as keyof typeof simConfig.costEstimates;
  const baseCost = simConfig.costEstimates[key] || { tokens: 100, timeMs: 100 };
  const estimated = action.estimatedCost || { tokens: 0, timeMs: 0 };

  return {
    tokens: baseCost.tokens + estimated.tokens,
    timeMs: baseCost.timeMs + estimated.timeMs,
  };
}

/**
 * Convert action type to cost key
 */
function actionTypeToKey(type: ActionType): string {
  const keyMap: Record<ActionType, keyof typeof simConfig.costEstimates> = {
    [ActionType.ACTIVATE_AGENT]: 'agentActivation',
    [ActionType.DEACTIVATE_AGENT]: 'agentDeactivation',
    [ActionType.START_TASK]: 'taskStart',
    [ActionType.COMPLETE_TASK]: 'taskComplete',
    [ActionType.SEND_MESSAGE]: 'messageSend',
    [ActionType.CHANGE_TOPIC]: 'topicChange',
    [ActionType.WAIT]: 'wait',
    [ActionType.SEQUENCE]: 'agentActivation', // Default
  };
  return keyMap[type];
}

// ============================================================================
// OUTCOME ESTIMATION
// ============================================================================

/**
 * Estimate user satisfaction after action
 */
function estimateUserSatisfaction(
  currentState: ConversationState,
  nextState: ConversationState,
  action: SimulatedAction
): number {
  let satisfaction = currentState.emotionState.valence; // Start from current

  // Positive impacts
  if (action.type === ActionType.COMPLETE_TASK) {
    satisfaction += 0.2; // Task completion feels good
  }
  if (action.type === ActionType.ACTIVATE_AGENT && action.params.agentId) {
    satisfaction += 0.1; // Help is available
  }
  if (nextState.emotionState.valence > currentState.emotionState.valence) {
    satisfaction += 0.15; // Emotion improving
  }

  // Negative impacts
  if (action.type === ActionType.DEACTIVATE_AGENT && nextState.activeAgentCount === 0) {
    satisfaction -= 0.1; // No help available
  }
  const cost = estimateActionCost(action);
  if (cost.tokens > 10000) {
    satisfaction -= 0.1; // Expensive operation
  }

  return Math.max(0, Math.min(1, satisfaction));
}

/**
 * Estimate task completion after action
 */
function estimateTaskCompletion(
  currentState: ConversationState,
  nextState: ConversationState,
  action: SimulatedAction
): number {
  let completion = currentState.taskCompletionRate || 0.5;

  // Task completion action
  if (action.type === ActionType.COMPLETE_TASK) {
    completion = Math.min(1, completion + 0.3);
  }

  // Starting a task resets progress
  if (action.type === ActionType.START_TASK) {
    completion = 0.1;
  }

  // Agent activation helps
  if (action.type === ActionType.ACTIVATE_AGENT) {
    completion = Math.min(1, completion + 0.1);
  }

  // Message progress
  if (action.type === ActionType.SEND_MESSAGE) {
    completion = Math.min(1, completion + 0.05);
  }

  return completion;
}

/**
 * Calculate risk score for action
 */
function calculateRiskScore(
  currentState: ConversationState,
  action: SimulatedAction,
  predictions: PredictedState[]
): number {
  let risk = 0;

  // High token usage
  if (action.estimatedCost.tokens > 5000) {
    risk += 0.2;
  }

  // Deactivating all agents
  if (action.type === ActionType.DEACTIVATE_AGENT && currentState.activeAgentCount <= 1) {
    risk += 0.3;
  }

  // Low prediction confidence
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  if (avgConfidence < 0.5) {
    risk += 0.3;
  }

  // Negative emotion prediction
  const negativeEmotions = predictions.filter((p) => (p.state.emotionState?.valence ?? 0.5) < 0.3).length;
  if (negativeEmotions > predictions.length / 2) {
    risk += 0.2;
  }

  return Math.min(1, risk);
}

/**
 * Detect potential issues with action
 */
function detectIssues(
  currentState: ConversationState,
  action: SimulatedAction,
  predictions: PredictedState[]
): string[] {
  const issues: string[] = [];

  // Check for resource constraints
  if (action.estimatedCost.tokens > 50000) {
    issues.push('Very high token usage - may exceed limits');
  }

  // Check for agent availability
  if (action.type === ActionType.ACTIVATE_AGENT) {
    const agentId = action.params.agentId;
    if (currentState.activeAgents.includes(agentId || '')) {
      issues.push('Agent already active - duplicate activation');
    }
  }

  // Check for task conflicts
  if (action.type === ActionType.START_TASK && currentState.currentTaskType) {
    issues.push('Task already in progress - starting new task may interrupt');
  }

  // Check for prediction uncertainty
  const lowConfidencePredictions = predictions.filter((p) => p.confidence < 0.4);
  if (lowConfidencePredictions.length > predictions.length / 2) {
    issues.push('High uncertainty in predictions - unexpected outcomes likely');
  }

  return issues;
}

/**
 * Calculate resource efficiency score (0-1, higher = better)
 */
function calculateResourceEfficiency(cost: { tokens: number; timeMs: number }): number {
  // Lower cost = higher efficiency
  const tokenScore = Math.max(0, 1 - cost.tokens / 20000);
  const timeScore = Math.max(0, 1 - cost.timeMs / 60000);

  return (tokenScore + timeScore) / 2;
}

/**
 * Calculate overall scenario score
 */
function calculateOverallScore(metrics: {
  userSatisfaction: number;
  taskCompletion: number;
  resourceEfficiency: number;
  risk: number;
}): number {
  const weights = simConfig.scoringWeights;

  const score =
    metrics.userSatisfaction * weights.userSatisfaction +
    metrics.taskCompletion * weights.taskCompletion +
    metrics.resourceEfficiency * weights.resourceEfficiency +
    (1 - metrics.risk) * weights.risk;

  return score;
}

// ============================================================================
// SCENARIO MANAGEMENT
// ============================================================================

/**
 * Create and run a simulation scenario
 */
export async function createScenario(
  name: string,
  description: string,
  initialState: ConversationState,
  actions: SimulatedAction[],
  worldModel?: WorldModel
): Promise<SimulationScenario> {
  console.log(`[ScenarioSimulator] Creating scenario: ${name}`);

  const startTime = performance.now();

  // Simulate actions in sequence
  let currentState = initialState;
  const totalCost = { tokens: 0, timeMs: 0 };
  const allIssues: string[] = [];

  for (const action of actions) {
    const outcome = await simulateAction(currentState, action, worldModel);

    // Accumulate costs
    totalCost.tokens += outcome.totalCost.tokens;
    totalCost.timeMs += outcome.totalCost.timeMs;

    // Collect issues
    allIssues.push(...outcome.issues);

    // Update state for next action
    if (outcome.finalState.length > 0) {
      currentState = outcome.finalState[0].state as ConversationState;
    }
  }

  // Predict final outcome
  const finalPredictions = await predictEnsembleStates(currentState, DEFAULT_HORIZONS.MEDIUM_TERM, worldModel);

  const scenario: SimulationScenario = {
    id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    initialState,
    actions,
    outcome: {
      finalState: finalPredictions,
      totalCost,
      userSatisfaction: 0, // Calculated below
      taskCompletion: 0,
      riskScore: 0,
      issues: allIssues,
      overallScore: 0,
    },
    timestamp: Date.now(),
  };

  // Calculate aggregate metrics
  const avgUserSatisfaction = actions.reduce((sum, action) => {
    const satisfaction = estimateUserSatisfaction(initialState, initialState, action);
    return sum + satisfaction;
  }, 0) / actions.length;

  const avgTaskCompletion = actions.reduce((sum, action) => {
    const completion = estimateTaskCompletion(initialState, initialState, action);
    return sum + completion;
  }, 0) / actions.length;

  const avgRisk = actions.reduce((sum, action) => {
    // Simplified risk calculation
    return sum + (action.estimatedCost.tokens > 5000 ? 0.2 : 0);
  }, 0) / actions.length;

  scenario.outcome.userSatisfaction = avgUserSatisfaction;
  scenario.outcome.taskCompletion = avgTaskCompletion;
  scenario.outcome.riskScore = avgRisk;
  scenario.outcome.overallScore = calculateOverallScore({
    userSatisfaction: avgUserSatisfaction,
    taskCompletion: avgTaskCompletion,
    resourceEfficiency: calculateResourceEfficiency(totalCost),
    risk: avgRisk,
  });

  // Store scenario
  simulationHistory.push(scenario);

  // Trim history
  if (simulationHistory.length > 100) {
    simulationHistory.splice(0, simulationHistory.length - 100);
  }

  const duration = performance.now() - startTime;
  console.log(`[ScenarioSimulator] Scenario created in ${duration.toFixed(2)}ms`);

  return scenario;
}

/**
 * Compare multiple scenarios
 */
export function compareScenarios(scenarios: SimulationScenario[]): ScenarioComparison {
  if (scenarios.length < 2) {
    throw new Error('Need at least 2 scenarios to compare');
  }

  // Rank scenarios by overall score
  const ranked = scenarios
    .map((scenario) => {
      const score = scenario.outcome.overallScore;

      // Generate pros and cons
      const pros: string[] = [];
      const cons: string[] = [];

      if (scenario.outcome.userSatisfaction > 0.7) {
        pros.push('High user satisfaction expected');
      } else if (scenario.outcome.userSatisfaction < 0.4) {
        cons.push('Low user satisfaction expected');
      }

      if (scenario.outcome.taskCompletion > 0.7) {
        pros.push('High task completion rate');
      } else if (scenario.outcome.taskCompletion < 0.4) {
        cons.push('Low task completion rate');
      }

      if (scenario.outcome.totalCost.tokens < 5000) {
        pros.push('Low resource usage');
      } else if (scenario.outcome.totalCost.tokens > 20000) {
        cons.push('High resource usage');
      }

      if (scenario.outcome.riskScore < 0.3) {
        pros.push('Low risk');
      } else if (scenario.outcome.riskScore > 0.6) {
        cons.push('High risk');
      }

      if (scenario.outcome.issues.length === 0) {
        pros.push('No issues detected');
      } else {
        cons.push(`${scenario.outcome.issues.length} issues detected`);
      }

      return { scenario, score, pros, cons };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  // Best scenario
  const best = ranked[0];
  const confidence = best.score > 0.7 ? 0.9 : best.score > 0.5 ? 0.7 : 0.5;

  return {
    scenarios,
    ranking: ranked,
    recommendation: {
      scenario: best.scenario,
      confidence,
      reason: `Highest overall score (${best.score.toFixed(2)}) with best balance of satisfaction, completion, and efficiency`,
    },
  };
}

// ============================================================================
// ACTION RECOMMENDATIONS
// ============================================================================

/**
 * Recommend best action for current state
 */
export async function recommendAction(
  currentState: ConversationState,
  possibleActions: SimulatedAction[],
  worldModel?: WorldModel
): Promise<ActionRecommendation> {
  console.log(`[ScenarioSimulator] Evaluating ${possibleActions.length} possible actions...`);

  // Simulate all actions
  const actionOutcomes = await Promise.all(
    possibleActions.map(async (action) => ({
      action,
      outcome: await simulateAction(currentState, action, worldModel),
    }))
  );

  // Sort by overall score
  actionOutcomes.sort((a, b) => b.outcome.overallScore - a.outcome.overallScore);

  const best = actionOutcomes[0];
  const alternatives = actionOutcomes.slice(1, 4).map((item) => ({
    action: item.action,
    outcome: item.outcome,
    reason: `Score: ${item.outcome.overallScore.toFixed(2)}`,
  }));

  // Generate reason for recommendation
  const reason = generateRecommendationReason(best.action, best.outcome);

  // Calculate confidence
  const scoreDiff = best.outcome.overallScore - (actionOutcomes[1]?.outcome.overallScore || 0);
  const confidence = Math.min(1, 0.5 + scoreDiff * 2);

  return {
    action: best.action,
    expectedOutcome: best.outcome,
    confidence,
    reason,
    alternatives,
  };
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(action: SimulatedAction, outcome: SimulationOutcome): string {
  const reasons: string[] = [];

  if (outcome.userSatisfaction > 0.7) {
    reasons.push('expected to satisfy user');
  }

  if (outcome.taskCompletion > 0.7) {
    reasons.push('advances task completion');
  }

  if (outcome.totalCost.tokens < 5000) {
    reasons.push('efficient resource usage');
  }

  if (outcome.riskScore < 0.3) {
    reasons.push('low risk');
  }

  if (reasons.length === 0) {
    reasons.push('best available option');
  }

  return `Recommended action: ${action.type}. ${reasons.join(', ')}.`;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get simulation history
 */
export function getSimulationHistory(): SimulationScenario[] {
  return [...simulationHistory];
}

/**
 * Clear simulation history
 */
export function clearSimulationHistory(): void {
  simulationHistory.length = 0;
}

/**
 * Update simulation configuration
 */
export function updateSimulationConfig(newConfig: Partial<typeof simConfig>): void {
  simConfig = { ...simConfig, ...newConfig };
}

/**
 * Get simulation configuration
 */
export function getSimulationConfig(): typeof simConfig {
  return { ...simConfig };
}

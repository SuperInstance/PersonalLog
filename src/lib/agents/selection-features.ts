/**
 * Selection Feature Extraction
 *
 * Extracts and engineers features for ML-based agent selection.
 * Combines task features, agent capabilities, user preferences, and context
 * to create feature vectors for ranking models.
 */

import type { AgentDefinition } from './types';
import type { HardwareProfile } from '@/lib/hardware/types';
import type { Message, Conversation } from '@/types/conversation';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Task classification result (from task classifier)
 */
export interface TaskClassification {
  /** Task category (e.g., 'analysis', 'creative', 'research') */
  category: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Task complexity score (0-1) */
  complexity: number;
  /** Estimated time to complete (seconds) */
  estimatedTime: number;
  /** Required capabilities */
  requiredCapabilities: string[];
}

/**
 * Agent performance metrics (from performance tracker)
 */
export interface AgentPerformanceMetrics {
  /** Agent ID */
  agentId: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Average execution time (ms) */
  avgExecutionTime: number;
  /** Total executions */
  totalExecutions: number;
  /** Last execution timestamp */
  lastExecution?: number;
  /** User satisfaction score (0-1) */
  userSatisfaction?: number;
  /** Error rate (0-1) */
  errorRate: number;
}

/**
 * User preference data
 */
export interface UserPreferences {
  /** Past agent selections by category */
  pastSelections: Map<string, string>; // category -> agentId
  /** Explicit agent preferences */
  preferredAgents: Set<string>;
  /** Agents to avoid */
  avoidedAgents: Set<string>;
  /** Selection history */
  selectionHistory: Array<{
    agentId: string;
    taskCategory: string;
    timestamp: number;
    successful: boolean;
  }>;
}

/**
 * System context at time of selection
 */
export interface SystemContext {
  /** Current time of day (0-23) */
  hourOfDay: number;
  /** Day of week (0-6) */
  dayOfWeek: number;
  /** System load (0-1) */
  systemLoad: number;
  /** Available memory (0-1) */
  availableMemory: number;
  /** Network status */
  networkOnline: boolean;
  /** Battery status (if available) */
  batteryLevel?: number;
  /** Current conversation context */
  conversationContext: {
    /** Message count */
    messageCount: number;
    /** Conversation length (tokens) */
    conversationLength: number;
    /** Active agents */
    activeAgents: string[];
  };
}

/**
 * Complete selection feature set
 */
export interface SelectionFeatures {
  /** Task features */
  task: {
    /** Task category (one-hot encoded) */
    category: Record<string, number>;
    /** Task complexity */
    complexity: number;
    /** Estimated time (normalized) */
    estimatedTime: number;
    /** Required capabilities (one-hot encoded) */
    capabilities: Record<string, number>;
  };

  /** Agent features */
  agent: {
    /** Agent category (one-hot encoded) */
    category: Record<string, number>;
    /** Hardware compatibility score (0-1) */
    hardwareCompatibility: number;
    /** Activation mode (one-hot encoded) */
    activationMode: Record<string, number>;
    /** Resource intensity (0-1) */
    resourceIntensity: number;
  };

  /** Performance features */
  performance: {
    /** Success rate (0-1) */
    successRate: number;
    /** Execution speed (normalized, 0-1) */
    executionSpeed: number;
    /** Reliability score (0-1) */
    reliability: number;
    /** User satisfaction (0-1) */
    userSatisfaction: number;
    /** Recent performance trend (-1 to 1) */
    trend: number;
  };

  /** Preference features */
  preferences: {
    /** Selection frequency (0-1) */
    selectionFrequency: number;
    /** Recent selection bias (0-1) */
    recentBias: number;
    /** User preference score (0-1) */
    userPreference: number;
    /** Avoid penalty (0-1, 1 means avoided) */
    avoidPenalty: number;
  };

  /** Context features */
  context: {
    /** Time of day (normalized 0-1) */
    timeOfDay: number;
    /** Day of week (normalized 0-1) */
    dayOfWeek: number;
    /** System load (0-1) */
    systemLoad: number;
    /** Available memory (0-1) */
    availableMemory: number;
    /** Network available (0-1) */
    networkAvailable: number;
    /** Conversation complexity (0-1) */
    conversationComplexity: number;
    /** Active agent count (normalized) */
    activeAgentCount: number;
  };
}

/**
 * Feature vector for ML model (flattened)
 */
export type FeatureVector = number[];

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract selection features for a task-agent pair
 *
 * @param taskClassification - Task classification result
 * @param agent - Agent definition
 * @param agentPerformance - Agent performance metrics
 * @param userPreferences - User preference data
 * @param systemContext - Current system context
 * @param hardwareProfile - Hardware profile
 * @returns Complete selection feature set
 */
export function extractSelectionFeatures(
  taskClassification: TaskClassification,
  agent: AgentDefinition,
  agentPerformance: AgentPerformanceMetrics | null,
  userPreferences: UserPreferences,
  systemContext: SystemContext,
  hardwareProfile: HardwareProfile
): SelectionFeatures {
  return {
    task: extractTaskFeatures(taskClassification),
    agent: extractAgentFeatures(agent, hardwareProfile),
    performance: extractPerformanceFeatures(agentPerformance, agent.id, userPreferences),
    preferences: extractPreferenceFeatures(agent.id, taskClassification, userPreferences),
    context: extractContextFeatures(systemContext),
  };
}

/**
 * Extract task-related features
 */
function extractTaskFeatures(task: TaskClassification): SelectionFeatures['task'] {
  // One-hot encode task category
  const categories = ['analysis', 'creative', 'research', 'automation', 'communication', 'data', 'custom'];
  const categoryEncoded: Record<string, number> = {};
  categories.forEach(cat => {
    categoryEncoded[cat] = task.category === cat ? 1 : 0;
  });

  // One-hot encode required capabilities
  const capabilityEncoded: Record<string, number> = {};
  const allCapabilities = [
    'audio', 'text', 'image', 'video',
    'analysis', 'generation', 'classification',
    'optimization', 'management', 'monitoring'
  ];
  allCapabilities.forEach(cap => {
    capabilityEncoded[cap] = task.requiredCapabilities.includes(cap) ? 1 : 0;
  });

  // Normalize estimated time (0-600 seconds -> 0-1)
  const normalizedTime = Math.min(task.estimatedTime / 600, 1);

  return {
    category: categoryEncoded,
    complexity: task.complexity,
    estimatedTime: normalizedTime,
    capabilities: capabilityEncoded,
  };
}

/**
 * Extract agent-related features
 */
function extractAgentFeatures(
  agent: AgentDefinition,
  hardwareProfile: HardwareProfile
): SelectionFeatures['agent'] {
  // One-hot encode agent category
  const categories = ['analysis', 'knowledge', 'creative', 'automation', 'communication', 'data', 'custom'];
  const categoryEncoded: Record<string, number> = {};
  categories.forEach(cat => {
    categoryEncoded[cat] = agent.category === cat ? 1 : 0;
  });

  // Calculate hardware compatibility
  const hardwareCompatibility = calculateHardwareCompatibility(agent, hardwareProfile);

  // One-hot encode activation mode
  const modes = ['background', 'foreground', 'hybrid', 'scheduled'];
  const modeEncoded: Record<string, number> = {};
  modes.forEach(mode => {
    modeEncoded[mode] = agent.activationMode === mode ? 1 : 0;
  });

  // Estimate resource intensity (0-1)
  const resourceIntensity = estimateResourceIntensity(agent, hardwareProfile);

  return {
    category: categoryEncoded,
    hardwareCompatibility,
    activationMode: modeEncoded,
    resourceIntensity,
  };
}

/**
 * Extract performance-related features
 */
function extractPerformanceFeatures(
  performance: AgentPerformanceMetrics | null,
  agentId: string,
  preferences: UserPreferences
): SelectionFeatures['performance'] {
  if (!performance) {
    // Default performance for new agents
    return {
      successRate: 0.5,
      executionSpeed: 0.5,
      reliability: 0.5,
      userSatisfaction: 0.5,
      trend: 0,
    };
  }

  // Calculate reliability (1 - error rate)
  const reliability = 1 - performance.errorRate;

  // Normalize execution speed (assume max 10 seconds is slow, 100ms is fast)
  const executionSpeed = normalizeExecutionSpeed(performance.avgExecutionTime);

  // Calculate performance trend from selection history
  const trend = calculatePerformanceTrend(agentId, preferences);

  return {
    successRate: performance.successRate,
    executionSpeed,
    reliability,
    userSatisfaction: performance.userSatisfaction ?? 0.5,
    trend,
  };
}

/**
 * Extract preference-related features
 */
function extractPreferenceFeatures(
  agentId: string,
  task: TaskClassification,
  preferences: UserPreferences
): SelectionFeatures['preferences'] {
  // Calculate selection frequency
  const totalSelections = preferences.selectionHistory.length;
  const agentSelections = preferences.selectionHistory.filter(
    s => s.agentId === agentId
  ).length;
  const selectionFrequency = totalSelections > 0
    ? agentSelections / totalSelections
    : 0;

  // Calculate recent selection bias (last 10 selections)
  const recentHistory = preferences.selectionHistory.slice(-10);
  const recentSelections = recentHistory.filter(s => s.agentId === agentId).length;
  const recentBias = recentHistory.length > 0
    ? recentSelections / recentHistory.length
    : 0;

  // Check if user explicitly prefers this agent
  const userPreference = preferences.preferredAgents.has(agentId) ? 1 : 0;

  // Check if user explicitly avoids this agent
  const avoidPenalty = preferences.avoidedAgents.has(agentId) ? 1 : 0;

  return {
    selectionFrequency,
    recentBias,
    userPreference,
    avoidPenalty,
  };
}

/**
 * Extract context-related features
 */
function extractContextFeatures(context: SystemContext): SelectionFeatures['context'] {
  // Normalize time of day (0-23 -> 0-1)
  const timeOfDay = context.hourOfDay / 23;

  // Normalize day of week (0-6 -> 0-1)
  const dayOfWeek = context.dayOfWeek / 6;

  // Calculate conversation complexity (message count + length)
  const messageComplexity = Math.min(context.conversationContext.messageCount / 100, 1);
  const lengthComplexity = Math.min(context.conversationContext.conversationLength / 10000, 1);
  const conversationComplexity = (messageComplexity + lengthComplexity) / 2;

  // Normalize active agent count (assume max 10 active agents)
  const activeAgentCount = Math.min(
    context.conversationContext.activeAgents.length / 10,
    1
  );

  return {
    timeOfDay,
    dayOfWeek,
    systemLoad: context.systemLoad,
    availableMemory: context.availableMemory,
    networkAvailable: context.networkOnline ? 1 : 0,
    conversationComplexity,
    activeAgentCount,
  };
}

// ============================================================================
// FEATURE VECTOR CONVERSION
// ============================================================================

/**
 * Convert selection features to flat feature vector for ML models
 *
 * @param features - Selection features
 * @returns Flattened feature vector
 */
export function featuresToVector(features: SelectionFeatures): FeatureVector {
  const vector: number[] = [];

  // Task features (already flat)
  Object.values(features.task.category).forEach(v => vector.push(v));
  vector.push(features.task.complexity);
  vector.push(features.task.estimatedTime);
  Object.values(features.task.capabilities).forEach(v => vector.push(v));

  // Agent features
  Object.values(features.agent.category).forEach(v => vector.push(v));
  vector.push(features.agent.hardwareCompatibility);
  Object.values(features.agent.activationMode).forEach(v => vector.push(v));
  vector.push(features.agent.resourceIntensity);

  // Performance features
  vector.push(features.performance.successRate);
  vector.push(features.performance.executionSpeed);
  vector.push(features.performance.reliability);
  vector.push(features.performance.userSatisfaction);
  vector.push(features.performance.trend);

  // Preference features
  vector.push(features.preferences.selectionFrequency);
  vector.push(features.preferences.recentBias);
  vector.push(features.preferences.userPreference);
  vector.push(features.preferences.avoidPenalty);

  // Context features
  vector.push(features.context.timeOfDay);
  vector.push(features.context.dayOfWeek);
  vector.push(features.context.systemLoad);
  vector.push(features.context.availableMemory);
  vector.push(features.context.networkAvailable);
  vector.push(features.context.conversationComplexity);
  vector.push(features.context.activeAgentCount);

  return vector;
}

/**
 * Get feature vector dimension
 */
export function getFeatureDimension(): number {
  // Task: 7 (categories) + 1 (complexity) + 1 (time) + 10 (capabilities) = 19
  // Agent: 7 (categories) + 1 (hw compat) + 4 (modes) + 1 (resource) = 13
  // Performance: 5 metrics
  // Preferences: 4 metrics
  // Context: 7 metrics
  // Total: 19 + 13 + 5 + 4 + 7 = 48
  return 48;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate hardware compatibility score for agent
 */
function calculateHardwareCompatibility(
  agent: AgentDefinition,
  hardwareProfile: HardwareProfile
): number {
  if (!agent.requirements?.hardware) {
    return 1.0; // No requirements = fully compatible
  }

  const hw = agent.requirements.hardware;
  let score = 1.0;

  // Check RAM
  if (hw.minRAM) {
    const ramGB = hardwareProfile.memory.totalGB || 0;
    score *= Math.min(ramGB / hw.minRAM, 1.0);
  }

  // Check CPU cores
  if (hw.minCores) {
    const cores = hardwareProfile.cpu.cores;
    score *= Math.min(cores / hw.minCores, 1.0);
  }

  // Check GPU
  if (hw.requiresGPU && !hardwareProfile.gpu.available) {
    score *= 0.0;
  }

  // Check features
  if (hw.features) {
    hw.features.forEach(feature => {
      if (feature === 'gpu-acceleration' && !hardwareProfile.gpu.webgpu.supported) {
        score *= 0.5;
      }
      if (feature === 'webgl' && !hardwareProfile.gpu.webgl.supported) {
        score *= 0.5;
      }
      if (feature === 'webassembly' && !hardwareProfile.features.webassembly) {
        score *= 0.5;
      }
    });
  }

  return score;
}

/**
 * Estimate resource intensity for agent (0-1)
 */
function estimateResourceIntensity(
  agent: AgentDefinition,
  hardwareProfile: HardwareProfile
): number {
  let intensity = 0.3; // Base intensity

  // Background agents consume more resources
  if (agent.activationMode === 'background' || agent.activationMode === 'hybrid') {
    intensity += 0.2;
  }

  // GPU required increases intensity
  if (agent.requirements?.hardware?.requiresGPU) {
    intensity += 0.3;
  }

  // Higher JEPA score requirement = more intensive
  if (agent.requirements?.hardware?.minJEPAScore) {
    intensity += (agent.requirements.hardware.minJEPAScore / 100) * 0.2;
  }

  return Math.min(intensity, 1.0);
}

/**
 * Normalize execution speed to 0-1
 */
function normalizeExecutionSpeed(avgTimeMs: number): number {
  // Assume 100ms is fast (1.0), 10 seconds is slow (0.0)
  const minMs = 100;
  const maxMs = 10000;
  return Math.max(0, Math.min(1, 1 - (avgTimeMs - minMs) / (maxMs - minMs)));
}

/**
 * Calculate performance trend from selection history
 */
function calculatePerformanceTrend(
  agentId: string,
  preferences: UserPreferences
): number {
  const agentHistory = preferences.selectionHistory
    .filter(s => s.agentId === agentId)
    .slice(-20); // Last 20 selections

  if (agentHistory.length < 2) {
    return 0; // Not enough data
  }

  // Calculate trend: compare recent vs older success rate
  const midPoint = Math.floor(agentHistory.length / 2);
  const olderSuccess = agentHistory.slice(0, midPoint).filter(s => s.successful).length / midPoint;
  const recentSuccess = agentHistory.slice(midPoint).filter(s => s.successful).length / (agentHistory.length - midPoint);

  return recentSuccess - olderSuccess; // -1 to 1
}

/**
 * Create default user preferences
 */
export function createDefaultUserPreferences(): UserPreferences {
  return {
    pastSelections: new Map(),
    preferredAgents: new Set(),
    avoidedAgents: new Set(),
    selectionHistory: [],
  };
}

/**
 * Create default system context
 */
export function createDefaultSystemContext(
  conversation?: Conversation
): SystemContext {
  const now = new Date();
  return {
    hourOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    systemLoad: 0.5,
    availableMemory: 0.5,
    networkOnline: navigator.onLine,
    batteryLevel: undefined, // Will be filled by Battery API if available
    conversationContext: {
      messageCount: conversation?.messages.length || 0,
      conversationLength: 0,
      activeAgents: [],
    },
  };
}

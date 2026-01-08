/**
 * Proactive Planning AI Hub
 *
 * A comprehensive intelligence system for proactive AI behavior combining:
 * - Intelligence Hub (central coordination)
 * - Proactive Engine (anticipatory agent activation)
 * - MPC Orchestrator (model-predictive control)
 * - World Model (state representation and prediction)
 * - Scenario Simulator (what-if analysis)
 *
 * @example
 * ```typescript
 * import { IntelligenceHub, proactiveEngine, mpcController } from '@superinstance/proactive-planning-ai-hub';
 *
 * // Initialize the hub
 * const hub = new IntelligenceHub();
 * await hub.initialize();
 *
 * // Start proactive monitoring
 * proactiveEngine.start();
 *
 * // Get proactive suggestions
 * const suggestions = await proactiveEngine.evaluateProactiveActions(context);
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// CORE INTELLIGENCE HUB
// ============================================================================

export { IntelligenceHub } from './core/hub';

// ============================================================================
// PROACTIVE ENGINE
// ============================================================================

export {
  ProactiveEngine,
  getProactiveEngine,
  initializeProactiveEngine,
} from './proactive/engine';

export {
  calculateConfidence,
  calculatePatternStrength,
  calculateHistoricalAccuracy,
  calculateContextClarity,
  calculateUserPreference,
  calculateTimeRelevance,
  calculateAgentAvailability,
  calibrateThresholds,
  getConfidenceLabel,
} from './proactive/confidence';

export {
  DEFAULT_PROACTIVE_CONFIG,
  DEFAULT_PROACTIVE_PREFERENCES,
} from './proactive/types';

// ============================================================================
// MPC ORCHESTRATOR
// ============================================================================

export {
  MPCController,
  mpcController,
} from './mpc/controller';

export {
  MPCStateManager,
  stateManager,
} from './mpc/state-manager';

export {
  MPCPredictionEngine,
  predictionEngine,
} from './mpc/prediction-engine';

// ============================================================================
// WORLD MODEL
// ============================================================================

export {
  WorldModel,
  getWorldModel,
} from './world-model/world-model';

export {
  ScenarioSimulator,
  getScenarioSimulator,
} from './world-model/scenario-simulator';

// ============================================================================
// CONVENIENCE API
// ============================================================================

import { IntelligenceHub } from './core/hub';
import { getProactiveEngine } from './proactive/engine';
import { mpcController } from './mpc/controller';
import { getWorldModel } from './world-model/world-model';
import { getScenarioSimulator } from './world-model/scenario-simulator';

/**
 * Unified API for the Proactive Planning AI Hub
 */
class ProactivePlanningAPI {
  private hub: IntelligenceHub;

  constructor() {
    this.hub = new IntelligenceHub();
  }

  /**
   * Initialize all proactive planning systems
   */
  async initialize(settings?: any): Promise<void> {
    await this.hub.initialize(settings);
    await getProactiveEngine().start();
    await getWorldModel().initialize();
    await getScenarioSimulator().initialize();
  }

  /**
   * Get the intelligence hub
   */
  getHub(): IntelligenceHub {
    return this.hub;
  }

  /**
   * Get the proactive engine
   */
  getProactiveEngine() {
    return getProactiveEngine();
  }

  /**
   * Get the MPC controller
   */
  getMPCController() {
    return mpcController;
  }

  /**
   * Get the world model
   */
  getWorldModel() {
    return getWorldModel();
  }

  /**
   * Get the scenario simulator
   */
  getScenarioSimulator() {
    return getScenarioSimulator();
  }

  /**
   * Shutdown all systems
   */
  async shutdown(): Promise<void> {
    getProactiveEngine().stop();
    await this.hub.shutdown();
    await mpcController.stop();
  }
}

// Singleton instance
const proactivePlanning = new ProactivePlanningAPI();

export default proactivePlanning;
export { proactivePlanning };

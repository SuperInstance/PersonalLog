/**
 * Scenario Simulator
 *
 * Simulates what-if scenarios for proactive planning
 */

import type { ScenarioSimulation, MPCState, MPCPlan } from '../types';

// ============================================================================
// SCENARIO SIMULATOR
// ============================================================================

export class ScenarioSimulator {
  private static instance: ScenarioSimulator | null = null;

  private simulations: Map<string, ScenarioSimulation> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ScenarioSimulator {
    if (!ScenarioSimulator.instance) {
      ScenarioSimulator.instance = new ScenarioSimulator();
    }
    return ScenarioSimulator.instance;
  }

  /**
   * Initialize scenario simulator
   */
  async initialize(): Promise<void> {
    console.log('[Scenario Simulator] Initialized');
  }

  /**
   * Simulate a scenario
   */
  async simulateScenario(
    currentState: MPCState,
    modifications: Array<{
      variable: string;
      original: unknown;
      modified: unknown;
    }>,
    currentPlan?: MPCPlan
  ): Promise<ScenarioSimulation> {
    const simulationId = `scenario-${Date.now()}`;

    // Create simulated state
    const simulatedState: MPCState = {
      ...currentState,
      id: `simulated-state-${Date.now()}`,
      timestamp: Date.now(),
    };

    // Apply modifications (simplified)
    for (const mod of modifications) {
      // In a real implementation, would apply modifications to state
    }

    // Calculate outcomes (simplified)
    const outcomes = {
      completionTime: Date.now() + 60000,
      qualityScore: 0.85,
      resourceUtilization: 0.7,
      risk: 0.2,
    };

    const simulation: ScenarioSimulation = {
      id: simulationId,
      description: `Scenario with ${modifications.length} modifications`,
      modifications,
      simulatedState,
      simulatedPlan: currentPlan,
      outcomes,
      comparison: {
        timeDiff: -5000,
        qualityDiff: 0.05,
        resourceUtilDiff: -0.1,
        riskDiff: -0.1,
      },
    };

    this.simulations.set(simulationId, simulation);

    return simulation;
  }

  /**
   * Get simulation by ID
   */
  getSimulation(simulationId: string): ScenarioSimulation | undefined {
    return this.simulations.get(simulationId);
  }

  /**
   * Get all simulations
   */
  getAllSimulations(): ScenarioSimulation[] {
    return Array.from(this.simulations.values());
  }

  /**
   * Compare scenarios
   */
  compareScenarios(scenarioIds: string[]): Array<{
    id: string;
    outcomes: any;
  }> {
    return scenarioIds.map(id => {
      const simulation = this.simulations.get(id);
      if (!simulation) {
        throw new Error(`Simulation not found: ${id}`);
      }

      return {
        id,
        outcomes: simulation.outcomes,
      };
    });
  }
}

/**
 * Global scenario simulator singleton
 */
export function getScenarioSimulator(): ScenarioSimulator {
  return ScenarioSimulator.getInstance();
}

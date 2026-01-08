/**
 * MPC State Manager
 *
 * Manages MPC system state, history, and metrics
 */

import type { MPCState, HardwareProfile } from '../types';

// ============================================================================
// MPC STATE MANAGER
// ============================================================================

export class MPCStateManager {
  private static instance: MPCStateManager | null = null;

  private state: MPCState | null = null;
  private stateHistory: MPCState[] = [];
  private maxHistorySize: number = 100;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MPCStateManager {
    if (!MPCStateManager.instance) {
      MPCStateManager.instance = new MPCStateManager();
    }
    return MPCStateManager.instance;
  }

  /**
   * Initialize state manager
   */
  async initialize(hardwareProfile: HardwareProfile, options?: { maxHistorySize?: number }): Promise<void> {
    if (options?.maxHistorySize) {
      this.maxHistorySize = options.maxHistorySize;
    }

    this.state = {
      id: `state-${Date.now()}`,
      timestamp: Date.now(),
      status: 'idle',
      agents: new Map(),
      tasks: new Map(),
      resources: new Map(),
      metrics: {
        totalCompleted: 0,
        totalFailed: 0,
        avgCompletionTime: 0,
        avgQualityScore: 0.8,
        totalTimeSaved: 0,
        resourceUtilization: 0.5,
        coordinationOverhead: 0.1,
        replanCount: 0,
        predictionAccuracy: 0.8,
        parallelizationLevel: 1,
      },
    };

    console.log('[MPC State Manager] Initialized');
  }

  /**
   * Get current state
   */
  getCurrentState(): MPCState | null {
    return this.state;
  }

  /**
   * Update state
   */
  async updateState(updates: Partial<MPCState>): Promise<void> {
    if (!this.state) {
      return;
    }

    // Save to history
    this.stateHistory.push({ ...this.state });
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistorySize);
    }

    // Apply updates
    this.state = { ...this.state, ...updates, timestamp: Date.now() };
  }

  /**
   * Commit state
   */
  async commitState(): Promise<void> {
    if (!this.state) {
      return;
    }

    this.state.timestamp = Date.now();
  }

  /**
   * Reset state
   */
  async reset(): Promise<void> {
    this.state = null;
    this.stateHistory = [];
    console.log('[MPC State Manager] Reset');
  }

  /**
   * Get state history
   */
  getStateHistory(): MPCState[] {
    return [...this.stateHistory];
  }
}

/**
 * Global state manager singleton
 */
export const stateManager = MPCStateManager.getInstance();

/**
 * World Model
 *
 * Maintains a representation of the world state for proactive planning
 */

import type { WorldState, Entity, Relationship, StateTransition } from '../types';

// ============================================================================
// WORLD MODEL
// ============================================================================

export class WorldModel {
  private static instance: WorldModel | null = null;

  private currentState: WorldState | null = null;
  private stateHistory: StateTransition[] = [];
  private entities: Map<string, Entity> = new Map();
  private relationships: Map<string, Relationship[]> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): WorldModel {
    if (!WorldModel.instance) {
      WorldModel.instance = new WorldModel();
    }
    return WorldModel.instance;
  }

  /**
   * Initialize world model
   */
  async initialize(): Promise<void> {
    this.currentState = {
      id: `world-state-${Date.now()}`,
      timestamp: Date.now(),
      entities: this.entities,
      relationships: this.relationships,
      globalState: {},
      confidence: 0.8,
    };

    console.log('[World Model] Initialized');
  }

  /**
   * Get current world state
   */
  getCurrentState(): WorldState | null {
    return this.currentState;
  }

  /**
   * Update entity in world model
   */
  async updateEntity(entity: Entity): Promise<void> {
    this.entities.set(entity.id, entity);

    if (this.currentState) {
      this.currentState.timestamp = Date.now();
    }
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Add relationship between entities
   */
  async addRelationship(relationship: Relationship): Promise<void> {
    const from = relationship.from;
    if (!this.relationships.has(from)) {
      this.relationships.set(from, []);
    }

    this.relationships.get(from)!.push(relationship);

    if (this.currentState) {
      this.currentState.timestamp = Date.now();
    }
  }

  /**
   * Get relationships for entity
   */
  getRelationships(entityId: string): Relationship[] {
    return this.relationships.get(entityId) || [];
  }

  /**
   * Record state transition
   */
  async recordTransition(transition: StateTransition): Promise<void> {
    this.stateHistory.push(transition);

    // Keep only last 1000 transitions
    if (this.stateHistory.length > 1000) {
      this.stateHistory = this.stateHistory.slice(-1000);
    }
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  /**
   * Predict next state
   */
  async predictNextState(currentState?: WorldState): Promise<WorldState> {
    const state = currentState || this.currentState;

    if (!state) {
      throw new Error('No current state available');
    }

    return {
      ...state,
      id: `predicted-state-${Date.now()}`,
      timestamp: Date.now() + 1000,
    };
  }
}

/**
 * Global world model singleton
 */
export function getWorldModel(): WorldModel {
  return WorldModel.getInstance();
}

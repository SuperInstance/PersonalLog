/**
 * Assignment Engine
 *
 * Handles consistent user-to-variant assignment using hashing
 * and supports multi-armed bandit optimization.
 */

import type {
  Variant,
  UserAssignment,
  ExperimentConfig,
  BanditState,
  PosteriorParameters,
} from './types';

/**
 * Consistent hashing for user assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate stable assignment hash
 */
function generateAssignmentHash(
  experimentId: string,
  userId: string,
  salt: string
): number {
  const combined = `${experimentId}:${userId}:${salt}`;
  return hashString(combined);
}

/**
 * Assignment engine implementation
 */
export class AssignmentEngine {
  private config: ExperimentConfig;
  private assignments: Map<string, UserAssignment> = new Map();
  private banditStates: Map<string, BanditState> = new Map();

  constructor(config: ExperimentConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Load assignments from storage
    this.loadFromStorage();
  }

  /**
   * Assign variant to user
   */
  assignVariant(
    experimentId: string,
    userId: string,
    variants: Variant[],
    sessionId?: string
  ): UserAssignment | null {
    // Check for existing assignment
    const existingKey = this.getAssignmentKey(experimentId, userId);
    const existing = this.assignments.get(existingKey);

    if (existing) {
      return existing;
    }

    // Determine assignment method
    const experimentUsesBandit = this.banditStates.has(experimentId);

    let variantId: string;

    if (experimentUsesBandit) {
      // Use bandit selection
      variantId = this.selectVariantBandit(experimentId, variants);
    } else {
      // Use deterministic hash-based assignment
      variantId = this.selectVariantHashed(experimentId, userId, variants);
    }

    // Create assignment
    const assignment: UserAssignment = {
      experimentId,
      userId,
      variantId,
      assignedAt: Date.now(),
      sessionId: sessionId || '',
      exposed: false,
    };

    // Store assignment
    this.assignments.set(existingKey, assignment);

    // Persist if enabled
    if (this.config.persistAssignments) {
      this.saveToStorage();
    }

    if (this.config.debug) {
      console.log('[Experiments] Assigned variant:', {
        experimentId,
        userId,
        variantId,
        method: experimentUsesBandit ? 'bandit' : 'hash',
      });
    }

    return assignment;
  }

  /**
   * Get existing assignment
   */
  getAssignment(experimentId: string, userId: string): UserAssignment | undefined {
    const key = this.getAssignmentKey(experimentId, userId);
    return this.assignments.get(key);
  }

  /**
   * Mark user as exposed to variant
   */
  markExposed(experimentId: string, userId: string): void {
    const key = this.getAssignmentKey(experimentId, userId);
    const assignment = this.assignments.get(key);

    if (assignment && !assignment.exposed) {
      assignment.exposed = true;
      assignment.exposedAt = Date.now();

      if (this.config.persistAssignments) {
        this.saveToStorage();
      }
    }
  }

  /**
   * Remove user's assignment (opt out)
   */
  removeAssignment(experimentId: string, userId: string): void {
    const key = this.getAssignmentKey(experimentId, userId);
    this.assignments.delete(key);

    if (this.config.persistAssignments) {
      this.saveToStorage();
    }
  }

  /**
   * Select variant using deterministic hashing
   */
  private selectVariantHashed(
    experimentId: string,
    userId: string,
    variants: Variant[]
  ): string {
    // Generate hash
    const hash = generateAssignmentHash(experimentId, userId, this.config.assignmentSalt);

    // Normalize hash to 0-1 range
    const normalized = (hash % 10000) / 10000;

    // Select variant based on weights
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (normalized <= cumulative) {
        return variant.id;
      }
    }

    // Fallback to last variant
    return variants[variants.length - 1].id;
  }

  /**
   * Select variant using multi-armed bandit
   */
  private selectVariantBandit(experimentId: string, variants: Variant[]): string {
    const banditState = this.banditStates.get(experimentId);
    if (!banditState || !this.config.banditByDefault) {
      // Fall back to uniform random if no bandit state
      return variants[Math.floor(Math.random() * variants.length)].id;
    }

    // Thompson sampling
    let bestVariant = variants[0].id;
    let bestSample = -Infinity;

    for (const variant of variants) {
      const posterior = banditState.posteriors[variant.id];
      if (!posterior) {
        // No data yet, use optimistic prior
        continue;
      }

      // Sample from Beta posterior
      const sample = this.sampleBeta(posterior.alpha, posterior.beta);

      if (sample > bestSample) {
        bestSample = sample;
        bestVariant = variant.id;
      }
    }

    // Exploration: sometimes pick random variant
    const explorationRate = banditState.lastUpdated ? 0.1 : 0.2; // 10-20% exploration
    if (Math.random() < explorationRate) {
      return variants[Math.floor(Math.random() * variants.length)].id;
    }

    return bestVariant;
  }

  /**
   * Sample from Beta distribution
   */
  private sampleBeta(alpha: number, beta: number): number {
    // Use Gamma distribution relation: Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
    const gamma1 = this.sampleGamma(alpha);
    const gamma2 = this.sampleGamma(beta);
    return gamma1 / (gamma1 + gamma2);
  }

  /**
   * Sample from Gamma distribution (Marsaglia and Tsang's method)
   */
  private sampleGamma(alpha: number): number {
    if (alpha < 1) {
      return this.sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
    }

    const d = alpha - 1/3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x, v;
      do {
        x = this.sampleNormal();
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = Math.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Sample from standard normal distribution (Box-Muller transform)
   */
  private sampleNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Update bandit state with new reward
   */
  updateBanditState(
    experimentId: string,
    variantId: string,
    reward: number
  ): void {
    let state = this.banditStates.get(experimentId);

    if (!state) {
      // Initialize bandit state
      state = {
        experimentId,
        counts: {},
        rewards: {},
        posteriors: {},
        lastUpdated: Date.now(),
      };
      this.banditStates.set(experimentId, state);
    }

    // Update counts and rewards
    state.counts[variantId] = (state.counts[variantId] || 0) + 1;
    state.rewards[variantId] = (state.rewards[variantId] || 0) + reward;

    // Update posterior (Beta distribution with uniform prior Beta(1,1))
    // For binary rewards: alpha = 1 + successes, beta = 1 + failures
    const posterior: PosteriorParameters = {
      alpha: 1 + state.rewards[variantId],
      beta: 1 + (state.counts[variantId] - state.rewards[variantId]),
      mean: (1 + state.rewards[variantId]) / (2 + state.counts[variantId]),
      variance: 0, // Calculated below
      stdDev: 0,
    };

    // Calculate variance for Beta distribution
    const a = posterior.alpha;
    const b = posterior.beta;
    posterior.variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
    posterior.stdDev = Math.sqrt(posterior.variance);

    state.posteriors[variantId] = posterior;
    state.lastUpdated = Date.now();

    if (this.config.debug) {
      console.log('[Experiments] Updated bandit state:', {
        experimentId,
        variantId,
        reward,
        posterior: posterior.mean,
      });
    }
  }

  /**
   * Get bandit state for experiment
   */
  getBanditState(experimentId: string): BanditState | undefined {
    return this.banditStates.get(experimentId);
  }

  /**
   * Reset bandit state for experiment
   */
  resetBanditState(experimentId: string): void {
    this.banditStates.delete(experimentId);
  }

  /**
   * Hash user ID to 0-100 range
   */
  hashUserId(userId: string): number {
    return hashString(userId) % 101;
  }

  /**
   * Get assignment key
   */
  private getAssignmentKey(experimentId: string, userId: string): string {
    return `${experimentId}:${userId}`;
  }

  /**
   * Export assignments
   */
  exportAssignments(): Record<string, UserAssignment> {
    const obj: Record<string, UserAssignment> = {};
    this.assignments.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Import assignments
   */
  importAssignments(data: Record<string, UserAssignment>): void {
    this.assignments.clear();
    Object.entries(data).forEach(([key, assignment]) => {
      this.assignments.set(key, assignment);
    });
  }

  /**
   * Export bandit states
   */
  exportBanditStates(): Record<string, BanditState> {
    const obj: Record<string, BanditState> = {};
    this.banditStates.forEach((state, key) => {
      obj[key] = state;
    });
    return obj;
  }

  /**
   * Import bandit states
   */
  importBanditStates(data: Record<string, BanditState>): void {
    this.banditStates.clear();
    Object.entries(data).forEach(([key, state]) => {
      this.banditStates.set(key, state);
    });
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (!this.config.persistAssignments || typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        assignments: this.exportAssignments(),
        banditStates: this.exportBanditStates(),
      };
      localStorage.setItem(`${this.config.storageKey}-assignments`, JSON.stringify(data));
    } catch (e) {
      console.error('[Experiments] Failed to save assignments:', e);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(`${this.config.storageKey}-assignments`);
      if (!stored) {
        return;
      }

      const data = JSON.parse(stored);

      if (data.assignments) {
        this.importAssignments(data.assignments);
      }

      if (data.banditStates) {
        this.importBanditStates(data.banditStates);
      }

      if (this.config.debug) {
        console.log('[Experiments] Loaded assignments from storage');
      }
    } catch (e) {
      console.error('[Experiments] Failed to load assignments:', e);
    }
  }
}

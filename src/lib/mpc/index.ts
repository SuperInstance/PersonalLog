/**
 * MPC (Model Predictive Control) Orchestrator
 *
 * Main export module for MPC system components.
 *
 * @example
 * ```typescript
 * import { mpcController, stateManager, predictionEngine } from '@/lib/mpc';
 *
 * // Initialize controller
 * await mpcController.initialize(config);
 *
 * // Start optimization loop
 * await mpcController.start();
 * ```
 */

// Controller
export { MPCController, mpcController } from './controller';

// State Manager
export { MPCStateManager, stateManager } from './state-manager';

// Prediction Engine
export { MPCPredictionEngine, predictionEngine } from './prediction-engine';

// Types
export * from './types';

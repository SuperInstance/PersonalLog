/**
 * Plugin Lifecycle Manager
 *
 * Comprehensive lifecycle management for PersonalLog plugins.
 * Handles hook registration, execution, event emission, and state tracking.
 *
 * @module lib/plugin/lifecycle
 */

import type {
  PluginId,
  PluginManifest,
  PluginHooks,
  PluginEvent,
  PluginEventType,
  PluginEventListener,
  PluginAPIContext,
  PluginActivationContext,
  PluginActivateHook,
  PluginDeactivateHook,
  PluginUninstallHook,
  PluginSettingsChangeHook,
} from './types';
import { PluginState } from './types';
import { getPluginRegistry } from './registry';
import { getPermissionManager } from './permissions';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Registered hook information
 */
interface RegisteredHook {
  /** Hook function */
  hook: (...args: any[]) => Promise<void> | void;

  /** Plugin ID */
  pluginId: PluginId;

  /** Hook type */
  hookType: keyof PluginHooks;

  /** Registration timestamp */
  registeredAt: number;
}

/**
 * Lifecycle state for a plugin
 */
interface LifecycleState {
  /** Plugin ID */
  pluginId: PluginId;

  /** Current state */
  state: PluginState;

  /** Previous state */
  previousState?: PluginState;

  /** Last state change timestamp */
  lastStateChange: number;

  /** State change history */
  stateHistory: Array<{
    state: PluginState;
    timestamp: number;
    reason?: string;
  }>;

  /** Active hooks */
  hooks: Map<keyof PluginHooks, RegisteredHook>;

  /** Lifecycle metadata */
  metadata: {
    /** Install timestamp */
    installedAt?: number;

    /** First activation timestamp */
    firstActivatedAt?: number;

    /** Total activations */
    totalActivations: number;

    /** Total deactivations */
    totalDeactivations: number;

    /** Last activation duration (ms) */
    lastActivationDuration?: number;

    /** Total active time (ms) */
    totalActiveTime: number;
  };
}

/**
 * Hook execution result
 */
interface HookExecutionResult {
  /** Success flag */
  success: boolean;

  /** Execution time (ms) */
  executionTime: number;

  /** Error if failed */
  error?: Error;

  /** Hook return value */
  returnValue?: any;
}

/**
 * Lifecycle event listener with metadata
 */
interface LifecycleEventListener {
  /** Listener function */
  listener: PluginEventListener;

  /** Listener ID */
  id: string;

  /** Registration timestamp */
  registeredAt: number;

  /** Once flag (auto-remove after first trigger) */
  once: boolean;

  /** Filter function */
  filter?: (event: PluginEvent) => boolean;
}

// ============================================================================
// PLUGIN LIFECYCLE CLASS
// ============================================================================

/**
 * PluginLifecycle - Manages plugin lifecycle hooks and events
 *
 * Responsibilities:
 * - Register and execute lifecycle hooks (onInstall, onActivate, onDeactivate, onUninstall)
 * - Emit lifecycle events to listeners
 * - Track plugin lifecycle states
 * - Handle hook failures gracefully
 * - Support async hooks with proper error handling
 */
export class PluginLifecycle {
  private registry = getPluginRegistry();
  private permissionManager = getPermissionManager();

  /** Lifecycle state per plugin */
  private lifecycleStates: Map<PluginId, LifecycleState> = new Map();

  /** Event listeners per event type */
  private eventListeners: Map<PluginEventType, Set<LifecycleEventListener>> = new Map();

  /** Global event listeners (all event types) */
  private globalListeners: Set<LifecycleEventListener> = new Set();

  /** Hook execution timeout (ms) */
  private readonly HOOK_TIMEOUT = 30000;

  /** Maximum state history entries */
  private readonly MAX_STATE_HISTORY = 50;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize lifecycle manager
   *
   * Loads lifecycle states for all installed plugins.
   */
  async initialize(): Promise<void> {
    await this.registry.initialize();

    // Load lifecycle states for all installed plugins
    const manifests = await this.registry.getAllManifests();

    for (const manifest of manifests) {
      const runtimeState = await this.registry.getRuntimeState(manifest.id);

      if (runtimeState) {
        this.initializeLifecycleState(manifest.id, runtimeState.state);
      }
    }
  }

  /**
   * Shutdown lifecycle manager
   *
   * Cleans up all lifecycle states and listeners.
   */
  async shutdown(): Promise<void> {
    // Clear all states
    this.lifecycleStates.clear();

    // Clear all listeners
    this.eventListeners.clear();
    this.globalListeners.clear();
  }

  // ========================================================================
  // LIFECYCLE STATE MANAGEMENT
  // ========================================================================

  /**
   * Initialize lifecycle state for a plugin
   */
  private initializeLifecycleState(
    pluginId: PluginId,
    initialState: PluginState
  ): LifecycleState {
    const state: LifecycleState = {
      pluginId,
      state: initialState,
      lastStateChange: Date.now(),
      stateHistory: [
        {
          state: initialState,
          timestamp: Date.now(),
          reason: 'initial',
        },
      ],
      hooks: new Map(),
      metadata: {
        totalActivations: 0,
        totalDeactivations: 0,
        totalActiveTime: 0,
      },
    };

    this.lifecycleStates.set(pluginId, state);
    return state;
  }

  /**
   * Get lifecycle state for a plugin
   */
  getLifecycleState(pluginId: PluginId): LifecycleState | null {
    return this.lifecycleStates.get(pluginId) || null;
  }

  /**
   * Update plugin lifecycle state
   */
  private async updateLifecycleState(
    pluginId: PluginId,
    newState: PluginState,
    reason?: string
  ): Promise<void> {
    let state = this.lifecycleStates.get(pluginId);

    if (!state) {
      state = this.initializeLifecycleState(pluginId, newState);
    } else {
      // Record state transition
      state.previousState = state.state;
      state.state = newState;
      state.lastStateChange = Date.now();

      // Add to history
      state.stateHistory.push({
        state: newState,
        timestamp: Date.now(),
        reason,
      });

      // Trim history if needed
      if (state.stateHistory.length > this.MAX_STATE_HISTORY) {
        state.stateHistory = state.stateHistory.slice(-this.MAX_STATE_HISTORY);
      }

      // Update metadata
      if (newState === 'active') {
        state.metadata.totalActivations++;
        if (!state.metadata.firstActivatedAt) {
          state.metadata.firstActivatedAt = Date.now();
        }
      } else if (newState === 'inactive' && state.previousState === 'active') {
        state.metadata.totalDeactivations++;

        // Calculate active time
        const now = Date.now();
        const activeTime = now - state.lastStateChange;
        state.metadata.totalActiveTime += activeTime;
        state.metadata.lastActivationDuration = activeTime;
      }
    }

    this.lifecycleStates.set(pluginId, state);
  }

  /**
   * Get plugin state
   */
  async getPluginState(pluginId: PluginId): Promise<PluginState | null> {
    const state = this.lifecycleStates.get(pluginId);
    return state?.state || null;
  }

  // ========================================================================
  // HOOK REGISTRATION
  // ========================================================================

  /**
   * Register a lifecycle hook for a plugin
   *
   * @param pluginId - Plugin ID
   * @param hookType - Hook type (onActivate, onDeactivate, etc.)
   * @param hook - Hook function
   * @throws Error if hook is invalid or plugin not found
   */
  registerHook(
    pluginId: PluginId,
    hookType: keyof PluginHooks,
    hook: (...args: any[]) => Promise<void> | void
  ): void {
    if (!pluginId) {
      throw new Error('Plugin ID is required');
    }

    if (!hookType) {
      throw new Error('Hook type is required');
    }

    if (typeof hook !== 'function') {
      throw new Error('Hook must be a function');
    }

    // Get or create lifecycle state
    let state = this.lifecycleStates.get(pluginId);
    if (!state) {
      state = this.initializeLifecycleState(pluginId, PluginState.INSTALLED);
    }

    // Register hook
    const registeredHook: RegisteredHook = {
      hook,
      pluginId,
      hookType,
      registeredAt: Date.now(),
    };

    state.hooks.set(hookType, registeredHook);
  }

  /**
   * Unregister a lifecycle hook
   *
   * @param pluginId - Plugin ID
   * @param hookType - Hook type to unregister
   */
  unregisterHook(pluginId: PluginId, hookType: keyof PluginHooks): void {
    const state = this.lifecycleStates.get(pluginId);
    if (state) {
      state.hooks.delete(hookType);
    }
  }

  /**
   * Get registered hook for a plugin
   *
   * @param pluginId - Plugin ID
   * @param hookType - Hook type
   * @returns Registered hook or null
   */
  getHook(
    pluginId: PluginId,
    hookType: keyof PluginHooks
  ): RegisteredHook | null {
    const state = this.lifecycleStates.get(pluginId);
    return state?.hooks.get(hookType) || null;
  }

  /**
   * Check if plugin has a specific hook
   *
   * @param pluginId - Plugin ID
   * @param hookType - Hook type
   * @returns True if hook is registered
   */
  hasHook(pluginId: PluginId, hookType: keyof PluginHooks): boolean {
    const state = this.lifecycleStates.get(pluginId);
    return state?.hooks.has(hookType) || false;
  }

  // ========================================================================
  // HOOK EXECUTION
  // ========================================================================

  /**
   * Execute a lifecycle hook with error handling and timeout
   *
   * @param pluginId - Plugin ID
   * @param hookType - Hook type to execute
   * @param args - Arguments to pass to hook
   * @returns Hook execution result
   */
  async executeHook(
    pluginId: PluginId,
    hookType: keyof PluginHooks,
    ...args: any[]
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();

    try {
      const state = this.lifecycleStates.get(pluginId);
      const registeredHook = state?.hooks.get(hookType);

      if (!registeredHook) {
        // Hook not found, not an error
        return {
          success: true,
          executionTime: Date.now() - startTime,
        };
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        registeredHook.hook,
        args,
        this.HOOK_TIMEOUT
      );

      return {
        success: true,
        executionTime: Date.now() - startTime,
        returnValue: result,
      };
    } catch (error) {
      // Log error but don't throw
      console.error(
        `Error executing ${hookType} hook for plugin ${pluginId}:`,
        error
      );

      // Emit error event
      await this.emitEvent({
        type: 'plugin.error' as PluginEventType,
        pluginId,
        timestamp: Date.now(),
        data: {
          hookType,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Execute function with timeout
   *
   * @param fn - Function to execute
   * @param args - Function arguments
   * @param timeout - Timeout in milliseconds
   * @returns Function result or throws error
   */
  private async executeWithTimeout<T>(
    fn: (...args: any[]) => Promise<T> | T,
    args: any[],
    timeout: number
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(fn(...args)),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Hook execution timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Execute onActivate hook
   *
   * @param pluginId - Plugin ID
   * @param context - Activation context
   */
  async executeActivateHook(
    pluginId: PluginId,
    context: PluginActivationContext
  ): Promise<HookExecutionResult> {
    const result = await this.executeHook(pluginId, 'onActivate', context);

    // Update lifecycle state
    if (result.success) {
      await this.updateLifecycleState(pluginId, PluginState.ACTIVE, 'activate');
    }

    return result;
  }

  /**
   * Execute onDeactivate hook
   *
   * @param pluginId - Plugin ID
   * @param context - Plugin context
   */
  async executeDeactivateHook(
    pluginId: PluginId,
    context: PluginAPIContext
  ): Promise<HookExecutionResult> {
    const result = await this.executeHook(pluginId, 'onDeactivate', context);

    // Update lifecycle state
    if (result.success) {
      await this.updateLifecycleState(pluginId, PluginState.INACTIVE, 'deactivate');
    }

    return result;
  }

  /**
   * Execute onUninstall hook
   *
   * @param pluginId - Plugin ID
   * @param context - Plugin context
   */
  async executeUninstallHook(
    pluginId: PluginId,
    context: PluginAPIContext
  ): Promise<HookExecutionResult> {
    const result = await this.executeHook(pluginId, 'onUninstall', context);

    // Update lifecycle state
    await this.updateLifecycleState(pluginId, PluginState.UNINSTALLING, 'uninstall');

    // Clean up lifecycle state
    this.lifecycleStates.delete(pluginId);

    return result;
  }

  /**
   * Execute onSettingsChange hook
   *
   * @param pluginId - Plugin ID
   * @param newSettings - New settings
   * @param oldSettings - Old settings
   * @param context - Plugin context
   */
  async executeSettingsChangeHook(
    pluginId: PluginId,
    newSettings: Record<string, any>,
    oldSettings: Record<string, any>,
    context: PluginAPIContext
  ): Promise<HookExecutionResult> {
    return this.executeHook(
      pluginId,
      'onSettingsChange',
      newSettings,
      oldSettings,
      context
    );
  }

  // ========================================================================
  // EVENT MANAGEMENT
  // ========================================================================

  /**
   * Subscribe to lifecycle events
   *
   * @param eventType - Event type or wildcard for all events
   * @param listener - Event listener function
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  on(
    eventType: PluginEventType | '*',
    listener: PluginEventListener,
    options?: {
      once?: boolean;
      filter?: (event: PluginEvent) => boolean;
    }
  ): () => void {
    const eventListener: LifecycleEventListener = {
      listener,
      id: `${Date.now()}-${Math.random()}`,
      registeredAt: Date.now(),
      once: options?.once || false,
      filter: options?.filter,
    };

    if (eventType === '*') {
      // Global listener
      this.globalListeners.add(eventListener);
    } else {
      // Specific event type listener
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, new Set());
      }
      this.eventListeners.get(eventType)!.add(eventListener);
    }

    // Return unsubscribe function
    return () => {
      if (eventType === '*') {
        this.globalListeners.delete(eventListener);
      } else {
        this.eventListeners.get(eventType)?.delete(eventListener);
      }
    };
  }

  /**
   * Unsubscribe from lifecycle events
   *
   * @param eventType - Event type
   * @param listener - Event listener to remove
   */
  off(eventType: PluginEventType | '*', listener: PluginEventListener): void {
    if (eventType === '*') {
      // Remove from global listeners
      for (const eventListener of this.globalListeners) {
        if (eventListener.listener === listener) {
          this.globalListeners.delete(eventListener);
          break;
        }
      }
    } else {
      // Remove from specific event type listeners
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        for (const eventListener of listeners) {
          if (eventListener.listener === listener) {
            listeners.delete(eventListener);
            break;
          }
        }
      }
    }
  }

  /**
   * Emit lifecycle event
   *
   * @param event - Event to emit
   */
  async emitEvent(event: PluginEvent): Promise<void> {
    // Notify specific event type listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      const listenersArray = Array.from(listeners);
      for (const eventListener of listenersArray) {
        try {
          // Check filter
          if (eventListener.filter && !eventListener.filter(event)) {
            continue;
          }

          // Call listener
          await eventListener.listener(event);

          // Remove if once
          if (eventListener.once) {
            listeners.delete(eventListener);
          }
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      }
    }

    // Notify global listeners
    const globalListenersArray = Array.from(this.globalListeners);
    for (const eventListener of globalListenersArray) {
      try {
        // Check filter
        if (eventListener.filter && !eventListener.filter(event)) {
          continue;
        }

        // Call listener
        await eventListener.listener(event);

        // Remove if once
        if (eventListener.once) {
          this.globalListeners.delete(eventListener);
        }
      } catch (error) {
        console.error(`Error in global event listener:`, error);
      }
    }
  }

  /**
   * Remove all event listeners
   *
   * @param eventType - Optional event type to clear (clears all if not specified)
   */
  removeAllListeners(eventType?: PluginEventType): void {
    if (eventType) {
      this.eventListeners.delete(eventType);
    } else {
      this.eventListeners.clear();
      this.globalListeners.clear();
    }
  }

  // ========================================================================
  // LIFECYCLE OPERATIONS
  // ========================================================================

  /**
   * Handle plugin installation
   *
   * @param pluginId - Plugin ID
   * @param manifest - Plugin manifest
   */
  async onInstall(pluginId: PluginId, manifest: PluginManifest): Promise<void> {
    // Initialize lifecycle state
    this.initializeLifecycleState(pluginId, PluginState.INSTALLED);

    // Update metadata
    const state = this.lifecycleStates.get(pluginId);
    if (state) {
      state.metadata.installedAt = Date.now();
    }

    // Emit installed event
    await this.emitEvent({
      type: 'plugin.installed' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
      data: {
        version: manifest.version,
      },
    });
  }

  /**
   * Handle plugin uninstallation
   *
   * @param pluginId - Plugin ID
   * @param context - Plugin context
   */
  async onUninstall(pluginId: PluginId, context: PluginAPIContext): Promise<void> {
    // Execute uninstall hook
    await this.executeUninstallHook(pluginId, context);

    // Emit uninstalled event
    await this.emitEvent({
      type: 'plugin.uninstalled' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle plugin activation
   *
   * @param pluginId - Plugin ID
   * @param context - Activation context
   */
  async onActivate(
    pluginId: PluginId,
    context: PluginActivationContext
  ): Promise<void> {
    // Execute activate hook
    await this.executeActivateHook(pluginId, context);

    // Emit activated event
    await this.emitEvent({
      type: 'plugin.activated' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle plugin deactivation
   *
   * @param pluginId - Plugin ID
   * @param context - Plugin context
   */
  async onDeactivate(pluginId: PluginId, context: PluginAPIContext): Promise<void> {
    // Execute deactivate hook
    await this.executeDeactivateHook(pluginId, context);

    // Emit deactivated event
    await this.emitEvent({
      type: 'plugin.deactivated' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle plugin update
   *
   * @param pluginId - Plugin ID
   * @param oldVersion - Old version
   * @param newVersion - New version
   */
  async onUpdate(
    pluginId: PluginId,
    oldVersion: string,
    newVersion: string
  ): Promise<void> {
    // Emit updated event
    await this.emitEvent({
      type: 'plugin.updated' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
      data: {
        oldVersion,
        newVersion,
      },
    });
  }

  /**
   * Handle plugin settings change
   *
   * @param pluginId - Plugin ID
   * @param newSettings - New settings
   * @param oldSettings - Old settings
   * @param context - Plugin context
   */
  async onSettingsChange(
    pluginId: PluginId,
    newSettings: Record<string, any>,
    oldSettings: Record<string, any>,
    context: PluginAPIContext
  ): Promise<void> {
    // Execute settings change hook
    await this.executeSettingsChangeHook(
      pluginId,
      newSettings,
      oldSettings,
      context
    );

    // Emit settings changed event
    await this.emitEvent({
      type: 'plugin.settings_changed' as PluginEventType,
      pluginId,
      timestamp: Date.now(),
      data: {
        oldSettings,
        newSettings,
      },
    });
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Get lifecycle statistics for a plugin
   *
   * @param pluginId - Plugin ID
   * @returns Lifecycle statistics
   */
  getLifecycleStats(pluginId: PluginId): {
    totalActivations: number;
    totalDeactivations: number;
    totalActiveTime: number;
    averageActiveTime: number;
    stateHistoryLength: number;
    registeredHooks: string[];
  } | null {
    const state = this.lifecycleStates.get(pluginId);
    if (!state) {
      return null;
    }

    const { totalActivations, totalDeactivations, totalActiveTime } =
      state.metadata;
    const averageActiveTime =
      totalActivations > 0 ? totalActiveTime / totalActivations : 0;

    return {
      totalActivations,
      totalDeactivations,
      totalActiveTime,
      averageActiveTime,
      stateHistoryLength: state.stateHistory.length,
      registeredHooks: Array.from(state.hooks.keys()),
    };
  }

  /**
   * Get all plugins with specific state
   *
   * @param state - Plugin state to filter by
   * @returns Array of plugin IDs
   */
  getPluginsByState(state: PluginState): PluginId[] {
    const plugins: PluginId[] = [];

    for (const [pluginId, lifecycleState] of this.lifecycleStates) {
      if (lifecycleState.state === state) {
        plugins.push(pluginId);
      }
    }

    return plugins;
  }

  /**
   * Validate hook signature
   *
   * @param hook - Hook function to validate
   * @param hookType - Expected hook type
   * @returns True if valid
   */
  validateHookSignature(
    hook: (...args: any[]) => any,
    hookType: keyof PluginHooks
  ): boolean {
    const argCount = hook.length;

    switch (hookType) {
      case 'onActivate':
        return argCount === 1;
      case 'onDeactivate':
      case 'onUninstall':
        return argCount === 1;
      case 'onSettingsChange':
        return argCount === 3;
      default:
        return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pluginLifecycleInstance: PluginLifecycle | null = null;

/**
 * Get plugin lifecycle instance
 *
 * @returns PluginLifecycle singleton instance
 */
export function getLifecycle(): PluginLifecycle {
  if (!pluginLifecycleInstance) {
    pluginLifecycleInstance = new PluginLifecycle();
  }
  return pluginLifecycleInstance;
}

/**
 * Initialize plugin lifecycle manager
 *
 * @returns Initialized PluginLifecycle instance
 */
export async function initializePluginLifecycle(): Promise<PluginLifecycle> {
  const lifecycle = getLifecycle();
  await lifecycle.initialize();
  return lifecycle;
}

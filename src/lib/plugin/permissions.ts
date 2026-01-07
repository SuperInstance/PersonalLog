/**
 * Plugin Permission System
 *
 * Manages plugin permissions with granular access control.
 * Validates permission requests and enforces security boundaries.
 *
 * @module lib/plugin/permissions
 */

import type {
  PluginId,
  PluginManifest,
  PermissionScope,
} from './types';

// Import Permission enum
import { Permission } from './types';

// Re-export for api.ts
export { Permission };

// ============================================================================
// PERMISSION STATE ENUM (3-STATE MODEL)
// ============================================================================

/**
 * Permission state (3-state model for granular control)
 */
export enum PermissionState {
  /** Permission is granted */
  GRANTED = 'granted',

  /** Permission is denied */
  DENIED = 'denied',

  /** Permission needs user prompt (not yet decided) */
  PROMPT = 'prompt',
}

// ============================================================================
// PERMISSION DESCRIPTIONS
// ============================================================================

/**
 * Human-readable permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  // Core permissions
  [Permission.READ_CONVERSATIONS]: 'Read your conversations',
  [Permission.WRITE_CONVERSATIONS]: 'Create and modify conversations',
  [Permission.DELETE_CONVERSATIONS]: 'Delete conversations',

  [Permission.READ_MESSAGES]: 'Read messages in conversations',
  [Permission.WRITE_MESSAGES]: 'Send and modify messages',
  [Permission.DELETE_MESSAGES]: 'Delete messages',

  [Permission.READ_KNOWLEDGE]: 'Access your knowledge base',
  [Permission.WRITE_KNOWLEDGE]: 'Add and modify knowledge base entries',
  [Permission.DELETE_KNOWLEDGE]: 'Delete knowledge base entries',

  [Permission.READ_CONTACTS]: 'Read your AI contacts',
  [Permission.WRITE_CONTACTS]: 'Add and modify AI contacts',
  [Permission.DELETE_CONTACTS]: 'Delete AI contacts',

  // Analytics permissions
  [Permission.READ_ANALYTICS]: 'Access analytics and usage data',
  [Permission.WRITE_ANALYTICS]: 'Track analytics events',

  // Settings permissions
  [Permission.READ_SETTINGS]: 'Read application settings',
  [Permission.WRITE_SETTINGS]: 'Modify application settings',

  // Network permissions
  [Permission.NETWORK_REQUEST]: 'Make network requests to external servers',

  // Storage permissions
  [Permission.READ_STORAGE]: 'Read local storage data',
  [Permission.WRITE_STORAGE]: 'Write to local storage',

  // UI permissions
  [Permission.MODIFY_UI]: 'Modify the user interface',
  [Permission.SHOW_NOTIFICATIONS]: 'Display notifications',

  // System permissions
  [Permission.READ_SYSTEM]: 'Read system information',
  [Permission.EXECUTE_CODE]: 'Execute arbitrary code',
};

/**
 * Dangerous permissions that require extra warnings
 */
export const DANGEROUS_PERMISSIONS: Set<Permission> = new Set([
  Permission.EXECUTE_CODE,
  Permission.WRITE_SETTINGS,
  Permission.DELETE_CONVERSATIONS,
  Permission.DELETE_MESSAGES,
  Permission.DELETE_KNOWLEDGE,
  Permission.NETWORK_REQUEST,
]);

// ============================================================================
// PERMISSION CATEGORIES
// ============================================================================

/**
 * Permission categories for grouping
 */
export const PERMISSION_CATEGORIES: Record<
  string,
  { permissions: Permission[]; description: string }
> = {
  conversations: {
    permissions: [
      Permission.READ_CONVERSATIONS,
      Permission.WRITE_CONVERSATIONS,
      Permission.DELETE_CONVERSATIONS,
    ],
    description: 'Access to conversations',
  },
  messages: {
    permissions: [
      Permission.READ_MESSAGES,
      Permission.WRITE_MESSAGES,
      Permission.DELETE_MESSAGES,
    ],
    description: 'Access to messages',
  },
  knowledge: {
    permissions: [
      Permission.READ_KNOWLEDGE,
      Permission.WRITE_KNOWLEDGE,
      Permission.DELETE_KNOWLEDGE,
    ],
    description: 'Access to knowledge base',
  },
  contacts: {
    permissions: [
      Permission.READ_CONTACTS,
      Permission.WRITE_CONTACTS,
      Permission.DELETE_CONTACTS,
    ],
    description: 'Access to AI contacts',
  },
  analytics: {
    permissions: [Permission.READ_ANALYTICS, Permission.WRITE_ANALYTICS],
    description: 'Access to analytics data',
  },
  settings: {
    permissions: [Permission.READ_SETTINGS, Permission.WRITE_SETTINGS],
    description: 'Access to application settings',
  },
  network: {
    permissions: [Permission.NETWORK_REQUEST],
    description: 'Network access',
  },
  storage: {
    permissions: [Permission.READ_STORAGE, Permission.WRITE_STORAGE],
    description: 'Local storage access',
  },
  ui: {
    permissions: [Permission.MODIFY_UI, Permission.SHOW_NOTIFICATIONS],
    description: 'UI modification',
  },
  system: {
    permissions: [Permission.READ_SYSTEM, Permission.EXECUTE_CODE],
    description: 'System-level access',
  },
};

// ============================================================================
// PERMISSION INTERFACES
// ============================================================================

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Permission granted */
  granted: boolean;

  /** Permission state */
  state: PermissionState;

  /** Reason if denied */
  reason?: string;
}

/**
 * Permission request queue item
 */
export interface PermissionRequest {
  /** Request ID (auto-generated) */
  id: string;

  /** Plugin ID requesting permission */
  pluginId: PluginId;

  /** Permission being requested */
  permission: Permission;

  /** Request timestamp */
  timestamp: number;

  /** Request status */
  status: PermissionState;

  /** Reason why permission is needed */
  reason?: string;

  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Permission resolution result
 */
export interface PermissionResolution {
  /** Request ID */
  requestId: string;

  /** Plugin ID */
  pluginId: PluginId;

  /** Permission */
  permission: Permission;

  /** Resolution state */
  state: PermissionState;

  /** Resolution timestamp */
  timestamp: number;

  /** Remember user's choice */
  remember: boolean;
}

/**
 * Permission summary for a plugin
 */
export interface PluginPermissionSummary {
  /** Plugin ID */
  pluginId: string;

  /** Granted permissions */
  granted: Permission[];

  /** Denied permissions */
  denied: Permission[];

  /** Pending permissions */
  pending: Permission[];

  /** Last updated timestamp */
  lastUpdated: number;
}

// ============================================================================
// PERMISSION MANAGER CLASS
// ============================================================================

export class PermissionManager {
  private grantedPermissions: Map<PluginId, Set<Permission>> = new Map();
  private requestQueue: Map<string, PermissionRequest> = new Map();
  private pendingResolvers: Map<string, (resolution: PermissionResolution) => void> = new Map();

  /**
   * Check if plugin has permission (with 3-state model)
   */
  async checkPermission(pluginId: PluginId, permission: Permission): Promise<PermissionCheckResult> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    if (!permState) {
      // No permission state yet - prompt
      return {
        granted: false,
        state: PermissionState.PROMPT,
        reason: 'Permission not yet requested',
      };
    }

    // Check granted permissions
    if (permState.granted.includes(permission)) {
      return {
        granted: true,
        state: PermissionState.GRANTED,
      };
    }

    // Check denied permissions
    if (permState.denied.includes(permission)) {
      return {
        granted: false,
        state: PermissionState.DENIED,
        reason: 'Permission was denied by user',
      };
    }

    // Check pending permissions
    if (permState.pending.includes(permission)) {
      return {
        granted: false,
        state: PermissionState.PROMPT,
        reason: 'Permission awaiting user approval',
      };
    }

    // Permission not in any state - prompt
    return {
      granted: false,
      state: PermissionState.PROMPT,
      reason: 'Permission not yet requested',
    };
  }

  /**
   * Grant permission to plugin (with persistence)
   */
  async grantPermission(pluginId: PluginId, permission: Permission): Promise<void> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    // Update in-memory cache
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Set());
    }
    this.grantedPermissions.get(pluginId)!.add(permission);

    // Persist to IndexedDB
    if (!permState) {
      await store.storePermissions({
        pluginId,
        granted: [permission],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      });
    } else {
      const granted = permState.granted.includes(permission)
        ? permState.granted
        : [...permState.granted, permission];

      const denied = permState.denied.filter((p) => p !== permission);
      const pending = permState.pending.filter((p) => p !== permission);

      await store.updatePermissions(pluginId, {
        granted,
        denied,
        pending,
      });
    }
  }

  /**
   * Grant multiple permissions to plugin
   */
  async grantPermissions(pluginId: PluginId, permissions: Permission[]): Promise<void> {
    for (const permission of permissions) {
      await this.grantPermission(pluginId, permission);
    }
  }

  /**
   * Revoke permission from plugin (with persistence)
   */
  async revokePermission(pluginId: PluginId, permission: Permission): Promise<void> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    // Update in-memory cache
    const permissions = this.grantedPermissions.get(pluginId);
    if (permissions) {
      permissions.delete(permission);
      if (permissions.size === 0) {
        this.grantedPermissions.delete(pluginId);
      }
    }

    // Persist to IndexedDB
    if (!permState) {
      return; // Nothing to revoke
    }

    const granted = permState.granted.filter((p) => p !== permission);
    const denied = permState.denied.includes(permission)
      ? permState.denied
      : [...permState.denied, permission];
    const pending = permState.pending.filter((p) => p !== permission);

    await store.updatePermissions(pluginId, {
      granted,
      denied,
      pending,
    });
  }

  /**
   * Reset permission to prompt state
   */
  async resetPermission(pluginId: PluginId, permission: Permission): Promise<void> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    if (!permState) {
      return;
    }

    const granted = permState.granted.filter((p) => p !== permission);
    const denied = permState.denied.filter((p) => p !== permission);
    const pending = permState.pending.includes(permission)
      ? permState.pending
      : [...permState.pending, permission];

    await store.updatePermissions(pluginId, {
      granted,
      denied,
      pending,
    });
  }

  /**
   * Revoke all permissions from plugin
   */
  async revokeAllPermissions(pluginId: PluginId): Promise<void> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();

    // Update in-memory cache
    this.grantedPermissions.delete(pluginId);

    // Persist to IndexedDB
    await store.deletePermissions(pluginId);
  }

  /**
   * Check if plugin has permission (synchronous version for backward compatibility)
   */
  hasPermission(pluginId: PluginId, permission: Permission): boolean {
    const permissions = this.grantedPermissions.get(pluginId);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Check if plugin has all permissions (synchronous version)
   */
  hasAllPermissions(pluginId: PluginId, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(pluginId, p));
  }

  /**
   * Check if plugin has any of the permissions (synchronous version)
   */
  hasAnyPermission(pluginId: PluginId, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(pluginId, p));
  }

  /**
   * Get all granted permissions for plugin
   */
  getGrantedPermissions(pluginId: PluginId): Permission[] {
    const permissions = this.grantedPermissions.get(pluginId);
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * Get all plugins with specific permission
   */
  getPluginsWithPermission(permission: Permission): PluginId[] {
    const plugins: PluginId[] = [];
    for (const [pluginId, permissions] of this.grantedPermissions.entries()) {
      if (permissions.has(permission)) {
        plugins.push(pluginId);
      }
    }
    return plugins;
  }

  /**
   * Get all permissions for plugin (with 3-state summary)
   */
  async getPluginPermissions(pluginId: PluginId): Promise<PluginPermissionSummary> {
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    if (!permState) {
      return {
        pluginId,
        granted: [],
        denied: [],
        pending: [],
        lastUpdated: Date.now(),
      };
    }

    return {
      pluginId,
      granted: permState.granted,
      denied: permState.denied,
      pending: permState.pending,
      lastUpdated: permState.lastUpdated,
    };
  }

  /**
   * Request permission from user (with UI prompt)
   */
  async requestPermission(
    pluginId: PluginId,
    permission: Permission,
    options?: {
      reason?: string;
      context?: Record<string, any>;
    }
  ): Promise<PermissionCheckResult> {
    // First check if already granted/denied
    const existing = await this.checkPermission(pluginId, permission);

    if (existing.state !== PermissionState.PROMPT) {
      return existing;
    }

    // Create request
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request: PermissionRequest = {
      id: requestId,
      pluginId,
      permission,
      timestamp: Date.now(),
      status: PermissionState.PROMPT,
      reason: options?.reason,
      context: options?.context,
    };

    // Add to queue
    this.requestQueue.set(requestId, request);

    // Store pending permission
    const { getPluginStore } = await import('./storage');
    const store = getPluginStore();
    const permState = await store.getPermissions(pluginId);

    if (permState) {
      if (!permState.pending.includes(permission)) {
        await store.updatePermissions(pluginId, {
          pending: [...permState.pending, permission],
        });
      }
    } else {
      await store.storePermissions({
        pluginId,
        granted: [],
        denied: [],
        pending: [permission],
        lastUpdated: Date.now(),
      });
    }

    // Wait for user resolution (this will be resolved by UI)
    return new Promise((resolve) => {
      this.pendingResolvers.set(requestId, () => {
        // After resolution, check again
        this.checkPermission(pluginId, permission).then(resolve);
      });
    });
  }

  /**
   * Resolve permission request (called by UI)
   */
  async resolvePermissionRequest(
    requestId: string,
    state: PermissionState,
    remember: boolean
  ): Promise<void> {
    const request = this.requestQueue.get(requestId);
    if (!request) {
      throw new Error('Permission request not found');
    }

    // Update request status
    request.status = state;

    // Apply resolution
    if (remember) {
      if (state === PermissionState.GRANTED) {
        await this.grantPermission(request.pluginId, request.permission);
      } else if (state === PermissionState.DENIED) {
        await this.revokePermission(request.pluginId, request.permission);
      }
    }

    // Remove from queue
    this.requestQueue.delete(requestId);

    // Resolve pending promise
    const resolver = this.pendingResolvers.get(requestId);
    if (resolver) {
      const resolution: PermissionResolution = {
        requestId,
        pluginId: request.pluginId,
        permission: request.permission,
        state,
        timestamp: Date.now(),
        remember,
      };
      resolver(resolution);
      this.pendingResolvers.delete(requestId);
    }
  }

  /**
   * Get all pending requests
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.requestQueue.values());
  }

  /**
   * Get pending requests for plugin
   */
  getPendingRequestsForPlugin(pluginId: PluginId): PermissionRequest[] {
    return Array.from(this.requestQueue.values()).filter(
      (r) => r.pluginId === pluginId
    );
  }

  /**
   * Validate manifest permissions
   */
  validateManifestPermissions(manifest: PluginManifest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if permissions are valid
    const validPermissions = Object.values(Permission);
    for (const permission of manifest.permissions) {
      if (!validPermissions.includes(permission)) {
        errors.push(`Invalid permission: ${permission}`);
      }
    }

    // Check for dangerous permission combinations
    const hasExecuteCode = manifest.permissions.includes(Permission.EXECUTE_CODE);
    const hasNetwork = manifest.permissions.includes(Permission.NETWORK_REQUEST);
    const hasWriteSettings = manifest.permissions.includes(Permission.WRITE_SETTINGS);

    if (hasExecuteCode && hasNetwork) {
      warnings.push(
        'Plugin has both EXECUTE_CODE and NETWORK_REQUEST permissions - potential security risk'
      );
    }

    if (hasExecuteCode && hasWriteSettings) {
      warnings.push(
        'Plugin has both EXECUTE_CODE and WRITE_SETTINGS permissions - potential security risk'
      );
    }

    // Check for dangerous permissions
    const dangerousPerms = manifest.permissions.filter((p) =>
      DANGEROUS_PERMISSIONS.has(p)
    );
    if (dangerousPerms.length > 0) {
      warnings.push(
        `Plugin requests dangerous permissions: ${dangerousPerms.map(p => PERMISSION_DESCRIPTIONS[p]).join(', ')}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get missing permissions
   */
  getMissingPermissions(
    pluginId: PluginId,
    required: Permission[]
  ): Permission[] {
    return required.filter((p) => !this.hasPermission(pluginId, p));
  }

  /**
   * Filter allowed resources based on permission scope
   */
  filterAllowedResources(
    pluginId: PluginId,
    permission: Permission,
    resources: string[]
  ): string[] {
    if (!this.hasPermission(pluginId, permission)) {
      return [];
    }
    return resources; // TODO: Implement resource-level filtering
  }

  /**
   * Request multiple permissions from user (batch request)
   */
  async requestPermissions(
    pluginId: PluginId,
    permissions: Permission[],
    options?: {
      reason?: string;
      context?: Record<string, any>;
    }
  ): Promise<{
    allGranted: boolean;
    results: Record<Permission, PermissionCheckResult>;
  }> {
    const results: Record<Permission, PermissionCheckResult> = {} as any;
    const needsPrompt: Permission[] = [];

    // Check which permissions need prompting
    for (const permission of permissions) {
      const check = await this.checkPermission(pluginId, permission);
      results[permission] = check;

      if (check.state === PermissionState.PROMPT) {
        needsPrompt.push(permission);
      }
    }

    // Request all pending permissions
    for (const permission of needsPrompt) {
      await this.requestPermission(pluginId, permission, options);
      results[permission] = await this.checkPermission(pluginId, permission);
    }

    const allGranted = Object.values(results).every((r) => r.granted);

    return { allGranted, results };
  }

  /**
   * Export permission state
   */
  exportState(): Record<string, Permission[]> {
    const state: Record<string, Permission[]> = {};
    for (const [pluginId, permissions] of this.grantedPermissions.entries()) {
      state[pluginId] = Array.from(permissions);
    }
    return state;
  }

  /**
   * Import permission state
   */
  importState(state: Record<string, Permission[]>): void {
    this.grantedPermissions.clear();
    for (const [pluginId, permissions] of Object.entries(state)) {
      this.grantedPermissions.set(pluginId as PluginId, new Set(permissions));
    }
  }

  /**
   * Clear all permissions
   */
  clearAll(): void {
    this.grantedPermissions.clear();
  }
}

// ============================================================================
// PERMISSION VALIDATOR
// ============================================================================

export class PermissionValidator {
  /**
   * Validate permission request
   */
  static validateRequest(
    pluginId: PluginId,
    permission: Permission,
    manager: PermissionManager,
    resource?: string
  ): { allowed: boolean; reason?: string } {
    if (!manager.hasPermission(pluginId, permission)) {
      return {
        allowed: false,
        reason: `Plugin does not have permission: ${permission}`,
      };
    }

    // TODO: Add resource-level validation
    // TODO: Add rate limiting checks
    // TODO: Add context-specific validation

    return { allowed: true };
  }

  /**
   * Validate multiple permissions
   */
  static validatePermissions(
    pluginId: PluginId,
    permissions: Permission[],
    manager: PermissionManager
  ): {
    allowed: boolean;
    allowedPermissions: Permission[];
    deniedPermissions: Permission[];
  } {
    const allowedPermissions: Permission[] = [];
    const deniedPermissions: Permission[] = [];

    for (const permission of permissions) {
      const result = this.validateRequest(pluginId, permission, manager);
      if (result.allowed) {
        allowedPermissions.push(permission);
      } else {
        deniedPermissions.push(permission);
      }
    }

    return {
      allowed: deniedPermissions.length === 0,
      allowedPermissions,
      deniedPermissions,
    };
  }

  /**
   * Check if operation requires permission
   */
  static requiresPermission(operation: string): Permission | null {
    const operationMap: Record<string, Permission> = {
      'conversations:list': Permission.READ_CONVERSATIONS,
      'conversations:get': Permission.READ_CONVERSATIONS,
      'conversations:create': Permission.WRITE_CONVERSATIONS,
      'conversations:update': Permission.WRITE_CONVERSATIONS,
      'conversations:delete': Permission.DELETE_CONVERSATIONS,
      'messages:list': Permission.READ_MESSAGES,
      'messages:get': Permission.READ_MESSAGES,
      'messages:create': Permission.WRITE_MESSAGES,
      'messages:update': Permission.WRITE_MESSAGES,
      'messages:delete': Permission.DELETE_MESSAGES,
      'knowledge:search': Permission.READ_KNOWLEDGE,
      'knowledge:get': Permission.READ_KNOWLEDGE,
      'knowledge:create': Permission.WRITE_KNOWLEDGE,
      'knowledge:update': Permission.WRITE_KNOWLEDGE,
      'knowledge:delete': Permission.DELETE_KNOWLEDGE,
      'analytics:track': Permission.WRITE_ANALYTICS,
      'analytics:get': Permission.READ_ANALYTICS,
      'settings:get': Permission.READ_SETTINGS,
      'settings:set': Permission.WRITE_SETTINGS,
      'storage:get': Permission.READ_STORAGE,
      'storage:set': Permission.WRITE_STORAGE,
      'network:request': Permission.NETWORK_REQUEST,
      'ui:modify': Permission.MODIFY_UI,
      'notifications:show': Permission.SHOW_NOTIFICATIONS,
      'system:read': Permission.READ_SYSTEM,
      'code:execute': Permission.EXECUTE_CODE,
    };

    return operationMap[operation] || null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let permissionManagerInstance: PermissionManager | null = null;

/**
 * Get permission manager instance
 */
export function getPermissionManager(): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager();
  }
  return permissionManagerInstance;
}

/**
 * Initialize permission manager
 */
export async function initializePermissionManager(): Promise<PermissionManager> {
  const manager = getPermissionManager();
  // Ensure storage is initialized
  const { getPluginStore } = await import('./storage');
  const store = getPluginStore();
  await store.initialize();
  return manager;
}

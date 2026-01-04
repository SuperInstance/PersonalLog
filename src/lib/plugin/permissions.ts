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
// PERMISSION MANAGER CLASS
// ============================================================================

export class PermissionManager {
  private grantedPermissions: Map<PluginId, Set<Permission>> = new Map();

  /**
   * Grant permission to plugin
   */
  grantPermission(pluginId: PluginId, permission: Permission): void {
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Set());
    }
    this.grantedPermissions.get(pluginId)!.add(permission);
  }

  /**
   * Grant multiple permissions to plugin
   */
  grantPermissions(pluginId: PluginId, permissions: Permission[]): void {
    for (const permission of permissions) {
      this.grantPermission(pluginId, permission);
    }
  }

  /**
   * Revoke permission from plugin
   */
  revokePermission(pluginId: PluginId, permission: Permission): void {
    const permissions = this.grantedPermissions.get(pluginId);
    if (permissions) {
      permissions.delete(permission);
      if (permissions.size === 0) {
        this.grantedPermissions.delete(pluginId);
      }
    }
  }

  /**
   * Revoke all permissions from plugin
   */
  revokeAllPermissions(pluginId: PluginId): void {
    this.grantedPermissions.delete(pluginId);
  }

  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: PluginId, permission: Permission): boolean {
    const permissions = this.grantedPermissions.get(pluginId);
    return permissions ? permissions.has(permission) : false;
  }

  /**
   * Check if plugin has all permissions
   */
  hasAllPermissions(pluginId: PluginId, permissions: Permission[]): boolean {
    return permissions.every((p) => this.hasPermission(pluginId, p));
  }

  /**
   * Check if plugin has any of the permissions
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
   * Request permissions for plugin
   */
  async requestPermissions(
    pluginId: PluginId,
    permissions: Permission[]
  ): Promise<{ granted: Permission[]; denied: Permission[] }> {
    // This would typically show a dialog to the user
    // For now, we'll auto-grant for development
    // TODO: Implement user permission request dialog

    const granted: Permission[] = [];
    const denied: Permission[] = [];

    for (const permission of permissions) {
      // Auto-grant for now (in production, require user approval)
      this.grantPermission(pluginId, permission);
      granted.push(permission);
    }

    return { granted, denied };
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
  return getPermissionManager();
}

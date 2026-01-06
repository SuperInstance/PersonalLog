/**
 * Agent Marketplace Version Control
 *
 * Manage agent versions with history, rollback, and comparison.
 */

import type { MarketplaceAgent, AgentVersion, VersionComparison, VersionChange } from './types';
import { saveMarketplaceAgent, loadMarketplaceAgent } from './storage';
import { NotFoundError, ValidationError, StorageError } from '@/lib/errors';

/**
 * Create a new version of an agent
 *
 * @param agent - Agent to version
 * @param changes - Chelog describing changes
 * @param incrementType - Version increment type (patch, minor, major)
 * @returns Promise resolving to updated agent with new version
 * @throws {ValidationError} If inputs are invalid
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const updated = await createVersion(myAgent, ['Added new feature', 'Fixed bug'], 'minor');
 * console.log(`New version: ${updated.marketplace.version}`);
 * ```
 */
export async function createVersion(
  agent: MarketplaceAgent,
  changes: string[],
  incrementType: 'patch' | 'minor' | 'major' = 'patch'
): Promise<MarketplaceAgent> {
  if (!agent.id?.trim()) {
    throw new ValidationError('Agent ID is required', {
      field: 'id',
      value: agent.id,
    });
  }

  if (!Array.isArray(changes) || changes.length === 0) {
    throw new ValidationError('Changes must be a non-empty array', {
      field: 'changes',
      value: changes,
    });
  }

  // Import semver dynamically
  const semver = await import('semver');

  // Validate current version
  if (!semver.valid(agent.marketplace.version)) {
    throw new ValidationError('Invalid agent version format', {
      field: 'version',
      value: agent.marketplace.version,
    });
  }

  // Increment version
  const newVersion = semver.inc(agent.marketplace.version, incrementType);
  if (!newVersion) {
    throw new ValidationError('Failed to increment version', {
      field: 'version',
      value: agent.marketplace.version,
    });
  }

  // Create version record
  const version: AgentVersion = {
    version: agent.marketplace.version,
    definition: { ...agent },
    changelog: changes.join('\n'),
    createdAt: Date.now(),
  };

  // Add to history
  const history = agent.marketplace.previousVersions || [];
  history.push(version);

  // Limit history to last 10 versions
  if (history.length > 10) {
    history.shift(); // Remove oldest
  }

  // Create new version
  const updated: MarketplaceAgent = {
    ...agent,
    marketplace: {
      ...agent.marketplace,
      version: newVersion,
      previousVersions: history,
      changelog: changes,
      updatedAt: Date.now(),
    },
  };

  await saveMarketplaceAgent(updated);

  return updated;
}

/**
 * Get version history for an agent
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to array of versions (including current)
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const history = await getVersionHistory('my-agent-v1');
 * console.log(`Version history: ${history.length} versions`);
 * history.forEach(v => {
 *   console.log(`${v.version}: ${v.changelog}`);
 * });
 * ```
 */
export async function getVersionHistory(agentId: string): Promise<AgentVersion[]> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  const history = agent.marketplace.previousVersions || [];

  // Add current version as the latest
  const current: AgentVersion = {
    version: agent.marketplace.version,
    definition: agent,
    changelog: agent.marketplace.changelog?.join('\n') || 'Current version',
    createdAt: agent.marketplace.updatedAt,
  };

  return [...history, current];
}

/**
 * Rollback to a previous version
 *
 * @param agentId - Agent ID
 * @param targetVersion - Version to rollback to
 * @returns Promise resolving to rolled-back agent
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If version not found
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const rolledBack = await rollbackToVersion('my-agent-v1', '1.0.0');
 * console.log(`Rolled back to version ${rolledBack.marketplace.version}`);
 * ```
 */
export async function rollbackToVersion(agentId: string, targetVersion: string): Promise<MarketplaceAgent> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (!targetVersion?.trim()) {
    throw new ValidationError('Target version cannot be empty', {
      field: 'targetVersion',
      value: targetVersion,
    });
  }

  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  if (!agent.marketplace.previousVersions || agent.marketplace.previousVersions.length === 0) {
    throw new ValidationError('No version history found for rollback', {
      context: { agentId },
    });
  }

  // Find target version
  const target = agent.marketplace.previousVersions.find((v) => v.version === targetVersion);
  if (!target) {
    throw new NotFoundError('version', targetVersion);
  }

  // Save current version to history first
  const current: AgentVersion = {
    version: agent.marketplace.version,
    definition: agent,
    changelog: `Pre-rollback snapshot (rolling back to ${targetVersion})`,
    createdAt: Date.now(),
  };

  const history = [...agent.marketplace.previousVersions, current];

  // Restore target version
  const semver = await import('semver');
  const restoredVersion = semver.inc(targetVersion, 'patch');

  if (!restoredVersion) {
    throw new ValidationError('Failed to increment restored version', {
      field: 'version',
      value: targetVersion,
    });
  }

  const restored: MarketplaceAgent = {
    ...agent, // Start with current agent
    ...target.definition, // Override with version definition
    marketplace: {
      ...agent.marketplace,
      version: restoredVersion,
      previousVersions: history.slice(-10), // Keep last 10
      changelog: [`Rollback from ${agent.marketplace.version} to ${targetVersion}`],
      updatedAt: Date.now(),
    },
  };

  await saveMarketplaceAgent(restored);

  return restored;
}

/**
 * Compare two versions
 *
 * @param agentId - Agent ID
 * @param version1 - First version
 * @param version2 - Second version
 * @returns Promise resolving to version comparison
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If versions not found
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const comparison = await compareVersions('my-agent-v1', '1.0.0', '2.0.0');
 * console.log('Changes:', comparison.changes);
 * ```
 */
export async function compareVersions(
  agentId: string,
  version1: string,
  version2: string
): Promise<VersionComparison> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const history = await getVersionHistory(agentId);

  const v1 = history.find((v) => v.version === version1);
  const v2 = history.find((v) => v.version === version2);

  if (!v1) {
    throw new NotFoundError('version', version1);
  }

  if (!v2) {
    throw new NotFoundError('version', version2);
  }

  const changes = analyzeChanges(v1.definition as MarketplaceAgent, v2.definition as MarketplaceAgent);

  return {
    v1,
    v2,
    changes,
  };
}

/**
 * Check if an upgrade is available for an agent
 *
 * Compares the current agent with its latest version in history.
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to upgrade availability info
 * @throws {ValidationError} If agent ID is empty
 * @throws {StorageError} If retrieval fails
 *
 * @example
 * ```typescript
 * const upgrade = await isUpgradeAvailable('my-agent-v1');
 * if (upgrade.available) {
 *   console.log(`Upgrade available: ${upgrade.currentVersion} -> ${upgrade.latestVersion}`);
 * }
 * ```
 */
export async function isUpgradeAvailable(agentId: string): Promise<{
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  versionsBehind: number;
}> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  const history = agent.marketplace.previousVersions || [];

  if (history.length === 0) {
    return {
      available: false,
      currentVersion: agent.marketplace.version,
      latestVersion: agent.marketplace.version,
      versionsBehind: 0,
    };
  }

  const semver = await import('semver');

  // Find latest version
  const latest = history.reduce((max, v) => (semver.gt(v.version, max.version) ? v : max), history[0]);

  const available = semver.gt(latest.version, agent.marketplace.version);

  if (available) {
    const versionsBehind = history.filter(
      (v) => semver.gt(v.version, agent.marketplace.version) && semver.lte(v.version, latest.version)
    ).length;

    return {
      available: true,
      currentVersion: agent.marketplace.version,
      latestVersion: latest.version,
      versionsBehind,
    };
  }

  return {
    available: false,
    currentVersion: agent.marketplace.version,
    latestVersion: agent.marketplace.version,
    versionsBehind: 0,
  };
}

/**
 * Upgrade agent to latest version
 *
 * @param agentId - Agent ID
 * @returns Promise resolving to upgraded agent
 * @throws {ValidationError} If agent ID is empty
 * @throws {NotFoundError} If agent not found
 * @throws {StorageError} If upgrade fails
 *
 * @example
 * ```typescript
 * const upgraded = await upgradeToLatest('my-agent-v1');
 * console.log(`Upgraded to ${upgraded.marketplace.version}`);
 * ```
 */
export async function upgradeToLatest(agentId: string): Promise<MarketplaceAgent> {
  const upgradeInfo = await isUpgradeAvailable(agentId);

  if (!upgradeInfo.available) {
    throw new ValidationError('No upgrade available', {
      context: { agentId, currentVersion: upgradeInfo.currentVersion },
    });
  }

  const history = await getVersionHistory(agentId);

  // Find latest version
  const semver = await import('semver');
  const latest = history.reduce((max, v) => (semver.gt(v.version, max.version) ? v : max), history[0]);

  // Save current version before upgrading
  const current = await loadMarketplaceAgent(agentId);
  if (!current) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  const currentSnapshot: AgentVersion = {
    version: current.marketplace.version,
    definition: current,
    changelog: 'Pre-upgrade snapshot',
    createdAt: Date.now(),
  };

  const updatedHistory = [...(current.marketplace.previousVersions || []), currentSnapshot].slice(-10);

  // Upgrade to latest
  const upgradedVersion = semver.inc(latest.version, 'patch');
  if (!upgradedVersion) {
    throw new ValidationError('Failed to increment upgraded version', {
      field: 'version',
      value: latest.version,
    });
  }

  const upgraded: MarketplaceAgent = {
    ...current,
    ...latest.definition,
    marketplace: {
      ...current.marketplace,
      version: upgradedVersion,
      previousVersions: updatedHistory,
      changelog: [`Upgraded from ${current.marketplace.version}`],
      updatedAt: Date.now(),
    },
  };

  await saveMarketplaceAgent(upgraded);

  return upgraded;
}

/**
 * Delete old versions
 *
 * Keeps only the last N versions.
 *
 * @param agentId - Agent ID
 * @param keep - Number of versions to keep (default: 5)
 * @returns Promise resolving to updated agent
 * @throws {ValidationError} If inputs are invalid
 * @throws {NotFoundError} If agent not found
 * @throws {StorageError} If save fails
 *
 * @example
 * ```typescript
 * const updated = await pruneOldVersions('my-agent-v1', 5);
 * console.log(`Kept ${updated.marketplace.previousVersions?.length || 0} versions`);
 * ```
 */
export async function pruneOldVersions(agentId: string, keep = 5): Promise<MarketplaceAgent> {
  if (!agentId?.trim()) {
    throw new ValidationError('Agent ID cannot be empty', {
      field: 'agentId',
      value: agentId,
    });
  }

  if (keep < 1) {
    throw new ValidationError('Must keep at least 1 version', {
      field: 'keep',
      value: keep,
    });
  }

  const agent = await loadMarketplaceAgent(agentId);
  if (!agent) {
    throw new NotFoundError('marketplace agent', agentId);
  }

  const history = agent.marketplace.previousVersions || [];

  if (history.length <= keep) {
    return agent; // Nothing to prune
  }

  // Keep last N versions
  const pruned = history.slice(-keep);

  const updated: MarketplaceAgent = {
    ...agent,
    marketplace: {
      ...agent.marketplace,
      previousVersions: pruned,
      updatedAt: Date.now(),
    },
  };

  await saveMarketplaceAgent(updated);

  return updated;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Analyze changes between two agent definitions
 */
function analyzeChanges(
  agent1: MarketplaceAgent,
  agent2: MarketplaceAgent
): VersionChange[] {
  const changes: VersionChange[] = [];

  // Compare basic fields
  if (agent1.name !== agent2.name) {
    changes.push({
      field: 'name',
      oldValue: agent1.name,
      newValue: agent2.name,
      type: 'modified',
    });
  }

  if (agent1.description !== agent2.description) {
    changes.push({
      field: 'description',
      oldValue: agent1.description,
      newValue: agent2.description,
      type: 'modified',
    });
  }

  if (agent1.category !== agent2.category) {
    changes.push({
      field: 'category',
      oldValue: agent1.category,
      newValue: agent2.category,
      type: 'modified',
    });
  }

  // Compare marketplace metadata
  if (agent1.marketplace.description !== agent2.marketplace.description) {
    changes.push({
      field: 'marketplace.description',
      oldValue: agent1.marketplace.description,
      newValue: agent2.marketplace.description,
      type: 'modified',
    });
  }

  // Compare tags
  const tags1 = new Set(agent1.marketplace.tags);
  const tags2 = new Set(agent2.marketplace.tags);

  tags2.forEach((tag) => {
    if (!tags1.has(tag)) {
      changes.push({
        field: 'marketplace.tags',
        oldValue: undefined,
        newValue: tag,
        type: 'added',
      });
    }
  });

  tags1.forEach((tag) => {
    if (!tags2.has(tag)) {
      changes.push({
        field: 'marketplace.tags',
        oldValue: tag,
        newValue: undefined,
        type: 'removed',
      });
    }
  });

  // Compare requirements
  if (JSON.stringify(agent1.requirements) !== JSON.stringify(agent2.requirements)) {
    changes.push({
      field: 'requirements',
      oldValue: agent1.requirements,
      newValue: agent2.requirements,
      type: 'modified',
    });
  }

  return changes;
}

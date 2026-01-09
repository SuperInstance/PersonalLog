/**
 * Multi-Agent Memory Sharing - Enable agents to share and synchronize memories
 *
 * Provides controlled memory sharing between agents with access control,
 * privacy levels, and synchronization capabilities.
 */

import { EventEmitter } from 'eventemitter3';
import { Memory, PrivacyLevel, MemoryTier } from '../types.js';
import { WorkingMemory } from '../storage/working-memory.js';
import { ShortTermMemory } from '../storage/short-term-memory.js';
import { LongTermMemory } from '../storage/long-term-memory.js';

/**
 * Configuration for multi-agent memory sharing
 */
export interface MultiAgentMemoryConfig {
  enableSynchronization: boolean;
  syncInterval: number;          // ms between syncs
  requirePermission: boolean;    // Require permission before sharing
  maxSharedMemories: number;
  defaultPrivacy: PrivacyLevel;
}

/**
 * Share request from one agent to another
 */
export interface ShareRequest {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  memoryIds: string[];
  message?: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked';
}

/**
 * Memory share record
 */
export interface MemoryShare {
  memoryId: string;
  ownerAgentId: string;
  sharedWith: string[];
  privacy: PrivacyLevel;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  };
  sharedAt: number;
}

/**
 * Multi-agent memory sharing system
 */
export class MultiAgentMemory extends EventEmitter {
  private working: WorkingMemory;
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  private config: MultiAgentMemoryConfig;
  private shareRecords: Map<string, MemoryShare>;  // memoryId -> share record
  private shareRequests: Map<string, ShareRequest>;  // requestId -> request
  private agentCapabilities: Map<string, Set<string>>;  // agentId -> capabilities
  private syncTimer?: NodeJS.Timeout;

  constructor(
    working: WorkingMemory,
    shortTerm: ShortTermMemory,
    longTerm: LongTermMemory,
    config: Partial<MultiAgentMemoryConfig> = {}
  ) {
    super();
    this.working = working;
    this.shortTerm = shortTerm;
    this.longTerm = longTerm;
    this.shareRecords = new Map();
    this.shareRequests = new Map();
    this.agentCapabilities = new Map();
    this.config = {
      enableSynchronization: config.enableSynchronization ?? true,
      syncInterval: config.syncInterval ?? 300000, // 5 minutes
      requirePermission: config.requirePermission ?? true,
      maxSharedMemories: config.maxSharedMemories ?? 10000,
      defaultPrivacy: config.defaultPrivacy ?? PrivacyLevel.PRIVATE
    };

    if (this.config.enableSynchronization) {
      this.startSynchronization();
    }
  }

  /**
   * Share a memory with another agent
   * @param memoryId - The memory to share
   * @param fromAgentId - The agent sharing the memory
   * @param toAgentId - The agent to share with
   * @param options - Share options
   */
  async shareMemory(
    memoryId: string,
    fromAgentId: string,
    toAgentId: string,
    options: {
      permissions?: Partial<MemoryShare['permissions']>;
      message?: string;
    } = {}
  ): Promise<boolean> {
    // Find the memory across all tiers
    const memory = await this.findMemory(memoryId);
    if (!memory) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    // Check ownership
    if (memory.agentId !== fromAgentId) {
      throw new Error(`Agent ${fromAgentId} does not own memory ${memoryId}`);
    }

    // Check if already shared
    const existing = this.shareRecords.get(memoryId);
    if (existing && existing.sharedWith.includes(toAgentId)) {
      return true; // Already shared
    }

    // Create or update share record
    const share: MemoryShare = existing || {
      memoryId,
      ownerAgentId: fromAgentId,
      sharedWith: [],
      privacy: options.message ? PrivacyLevel.SHARED : this.config.defaultPrivacy,
      permissions: {
        canRead: true,
        canWrite: false,
        canDelete: false
      },
      sharedAt: Date.now()
    };

    // Apply permissions
    if (options.permissions) {
      Object.assign(share.permissions, options.permissions);
    }

    // Add to shared list
    if (!share.sharedWith.includes(toAgentId)) {
      share.sharedWith.push(toAgentId);
    }

    this.shareRecords.set(memoryId, share);

    // Update memory's sharedWith list
    await this.updateMemorySharedWith(memoryId, share.sharedWith);

    // Create share request if permission required
    if (this.config.requirePermission) {
      const requestId = this.generateRequestId();
      const request: ShareRequest = {
        id: requestId,
        fromAgentId,
        toAgentId,
        memoryIds: [memoryId],
        message: options.message,
        timestamp: Date.now(),
        status: 'pending'
      };
      this.shareRequests.set(requestId, request);

      this.emit('share:request:created', { request });
    } else {
      this.emit('memory:shared', { memoryId, from: fromAgentId, to: toAgentId });
    }

    return true;
  }

  /**
   * Share multiple memories at once
   */
  async shareMemories(
    memoryIds: string[],
    fromAgentId: string,
    toAgentId: string,
    options: {
      permissions?: Partial<MemoryShare['permissions']>;
      message?: string;
    } = {}
  ): Promise<number> {
    let shared = 0;

    for (const memoryId of memoryIds) {
      try {
        await this.shareMemory(memoryId, fromAgentId, toAgentId, options);
        shared++;
      } catch (error) {
        console.error(`Failed to share memory ${memoryId}:`, error);
      }
    }

    return shared;
  }

  /**
   * Accept a share request
   */
  async acceptShareRequest(requestId: string): Promise<boolean> {
    const request = this.shareRequests.get(requestId);
    if (!request || request.toAgentId === 'auto') return false;

    request.status = 'accepted';

    // Grant access to all memories in request
    for (const memoryId of request.memoryIds) {
      const share = this.shareRecords.get(memoryId);
      if (share) {
        // Ensure agent is in shared list
        if (!share.sharedWith.includes(request.toAgentId)) {
          share.sharedWith.push(request.toAgentId);
        }
        await this.updateMemorySharedWith(memoryId, share.sharedWith);
      }
    }

    this.emit('share:request:accepted', { request });
    return true;
  }

  /**
   * Reject a share request
   */
  rejectShareRequest(requestId: string): boolean {
    const request = this.shareRequests.get(requestId);
    if (!request) return false;

    request.status = 'rejected';
    this.emit('share:request:rejected', { request });
    return true;
  }

  /**
   * Revoke access to a shared memory
   */
  async revokeAccess(memoryId: string, agentId: string, requestingAgentId: string): Promise<boolean> {
    const share = this.shareRecords.get(memoryId);
    if (!share || share.ownerAgentId !== requestingAgentId) {
      return false;
    }

    // Remove from shared list
    const index = share.sharedWith.indexOf(agentId);
    if (index >= 0) {
      share.sharedWith.splice(index, 1);
      await this.updateMemorySharedWith(memoryId, share.sharedWith);

      this.emit('access:revoked', { memoryId, agentId });
      return true;
    }

    return false;
  }

  /**
   * Get memories shared with an agent
   */
  async getSharedMemories(agentId: string): Promise<Memory[]> {
    const shared: Memory[] = [];

    // Check all share records
    for (const [memoryId, share] of this.shareRecords.entries()) {
      if (share.sharedWith.includes(agentId) && share.permissions.canRead) {
        const memory = await this.findMemory(memoryId);
        if (memory) {
          shared.push(memory);
        }
      }
    }

    return shared;
  }

  /**
   * Get memories shared by an agent
   */
  async getSharedByAgent(agentId: string): Promise<Memory[]> {
    const shared: Memory[] = [];

    for (const [memoryId, share] of this.shareRecords.entries()) {
      if (share.ownerAgentId === agentId) {
        const memory = await this.findMemory(memoryId);
        if (memory) {
          shared.push(memory);
        }
      }
    }

    return shared;
  }

  /**
   * Check if an agent can access a memory
   */
  async canAccess(memoryId: string, agentId: string): Promise<{
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }> {
    const memory = await this.findMemory(memoryId);

    if (!memory) {
      return { canRead: false, canWrite: false, canDelete: false };
    }

    // Owner has full access
    if (memory.agentId === agentId) {
      return { canRead: true, canWrite: true, canDelete: true };
    }

    // Check share record
    const share = this.shareRecords.get(memoryId);
    if (!share || !share.sharedWith.includes(agentId)) {
      return { canRead: false, canWrite: false, canDelete: false };
    }

    // Check privacy level
    if (memory.privacy === PrivacyLevel.PRIVATE) {
      return { canRead: false, canWrite: false, canDelete: false };
    }

    if (memory.privacy === PrivacyLevel.PUBLIC) {
      return { canRead: true, canWrite: false, canDelete: false };
    }

    // Shared - check permissions
    return share.permissions;
  }

  /**
   * Update a shared memory
   */
  async updateSharedMemory(
    memoryId: string,
    agentId: string,
    updates: Partial<Memory>
  ): Promise<boolean> {
    const access = await this.canAccess(memoryId, agentId);

    if (!access.canWrite) {
      throw new Error(`Agent ${agentId} does not have write access to memory ${memoryId}`);
    }

    // Find and update in appropriate tier
    const memory = await this.findMemory(memoryId);
    if (!memory) return false;

    switch (memory.tier) {
      case MemoryTier.WORKING:
        const workingMem = this.working.getMemory(memoryId);
        if (workingMem) {
          Object.assign(workingMem, updates);
          return true;
        }
        break;

      case MemoryTier.SHORT_TERM:
        return await this.shortTerm.update(memoryId, updates);

      case MemoryTier.LONG_TERM:
        return await this.longTerm.update(memoryId, updates);
    }

    return false;
  }

  /**
   * Get pending share requests for an agent
   */
  getPendingRequests(agentId: string): ShareRequest[] {
    return Array.from(this.shareRequests.values())
      .filter(r => r.toAgentId === agentId && r.status === 'pending');
  }

  /**
   * Get all share requests for an agent
   */
  getAllRequests(agentId: string): ShareRequest[] {
    return Array.from(this.shareRequests.values())
      .filter(r => r.fromAgentId === agentId || r.toAgentId === agentId);
  }

  /**
   * Register agent capabilities
   */
  registerAgentCapabilities(agentId: string, capabilities: string[]): void {
    this.agentCapabilities.set(agentId, new Set(capabilities));
    this.emit('agent:registered', { agentId, capabilities });
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentId: string): string[] {
    const caps = this.agentCapabilities.get(agentId);
    return caps ? Array.from(caps) : [];
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): string[] {
    const agents: string[] = [];

    for (const [agentId, caps] of this.agentCapabilities.entries()) {
      if (caps.has(capability)) {
        agents.push(agentId);
      }
    }

    return agents;
  }

  /**
   * Get sharing statistics
   */
  getStats(): {
    totalShared: number;
    byOwner: Record<string, number>;
    pendingRequests: number;
    agentsRegistered: number;
  } {
    const byOwner: Record<string, number> = {};

    for (const share of this.shareRecords.values()) {
      byOwner[share.ownerAgentId] = (byOwner[share.ownerAgentId] || 0) + 1;
    }

    const pendingRequests = Array.from(this.shareRequests.values())
      .filter(r => r.status === 'pending').length;

    return {
      totalShared: this.shareRecords.size,
      byOwner,
      pendingRequests,
      agentsRegistered: this.agentCapabilities.size
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.shareRecords.clear();
    this.shareRequests.clear();
    this.agentCapabilities.clear();
    this.removeAllListeners();
  }

  /**
   * Find a memory across all tiers
   */
  private async findMemory(memoryId: string): Promise<Memory | undefined> {
    // Check working memory
    if (this.working.has(memoryId)) {
      return this.working.getMemory(memoryId);
    }

    // Check short-term
    const shortTermMem = await this.shortTerm.get(memoryId);
    if (shortTermMem) return shortTermMem;

    // Check long-term
    return await this.longTerm.get(memoryId);
  }

  /**
   * Update memory's sharedWith list
   */
  private async updateMemorySharedWith(memoryId: string, sharedWith: string[]): Promise<void> {
    // Update in appropriate tier
    const memory = await this.findMemory(memoryId);
    if (!memory) return;

    const updates = { sharedWith };

    switch (memory.tier) {
      case MemoryTier.WORKING:
        const workingMem = this.working.getMemory(memoryId);
        if (workingMem) {
          workingMem.sharedWith = sharedWith;
        }
        break;

      case MemoryTier.SHORT_TERM:
        await this.shortTerm.update(memoryId, updates);
        break;

      case MemoryTier.LONG_TERM:
        await this.longTerm.update(memoryId, updates);
        break;
    }
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start background synchronization
   */
  private startSynchronization(): void {
    this.syncTimer = setInterval(async () => {
      await this.synchronize();
    }, this.config.syncInterval);
  }

  /**
   * Synchronize shared memories
   */
  private async synchronize(): Promise<void> {
    // In a distributed system, this would sync across nodes
    // For now, emit event for monitoring
    this.emit('sync:completed', {
      timestamp: Date.now(),
      sharedMemories: this.shareRecords.size
    });
  }
}

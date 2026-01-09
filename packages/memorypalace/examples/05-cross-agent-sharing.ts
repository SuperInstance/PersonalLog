/**
 * Example 5: Cross-Agent Memory Sharing
 *
 * Demonstrates how multiple agents can share memories:
 * - Sharing memories between agents
 * - Access control and permissions
 * - Shared memory retrieval
 *
 * @module examples/cross-agent-sharing
 */

import { MemoryPalace, PrivacyLevel } from '../src/index.js';

async function crossAgentSharingDemo() {
  console.log('=== MemoryPalace: Cross-Agent Memory Sharing ===\n');

  const memory = new MemoryPalace({
    sharing: {
      enabled: true,
      defaultPrivacy: PrivacyLevel.PRIVATE,
      allowSharingRequests: true,
      requirePermission: false,  // Auto-accept for demo
      maxSharedMemories: 100
    }
  });

  // Listen to sharing events
  memory.on('memory:shared', (data) => {
    console.log(`[Event] Memory shared: ${data.memoryId} from ${data.from} to ${data.to}`);
  });

  console.log('1. Creating memories for different agents:\n');

  // Agent 1: Research Agent stores its findings
  const researchMemoryId = await memory.longTerm.store(
    {
      topic: 'WebGPU performance optimization',
      findings: 'Pipeline parallelism can achieve 60 FPS token generation',
      confidence: 0.9
    },
    {
      agentId: 'research-agent',
      tags: ['webgpu', 'performance', 'optimization'],
      importance: 0.85
    }
  );
  console.log(`  Research agent stored: ${researchMemoryId}`);

  // Agent 2: Writer Agent stores its work
  const writerMemoryId = await memory.shortTerm.store(
    {
      draft: 'Article about WebGPU optimization techniques',
      status: 'in-progress'
    },
    {
      agentId: 'writer-agent',
      tags: ['writing', 'article', 'webgpu'],
      importance: 0.6
    }
  );
  console.log(`  Writer agent stored: ${writerMemoryId}`);

  // Agent 3: Analyst Agent stores analysis
  const analystMemoryId = await memory.longTerm.store(
    {
      metric: 'GPU utilization',
      value: '85% average with proper batching',
      recommendation: 'Increase batch size for better throughput'
    },
    {
      agentId: 'analyst-agent',
      tags: ['metrics', 'performance', 'optimization'],
      importance: 0.75
    }
  );
  console.log(`  Analyst agent stored: ${analystMemoryId}\n`);

  console.log('2. Sharing memories between agents:\n');

  // Research agent shares findings with writer
  console.log('  Research agent sharing with writer agent...');
  await memory.share(
    researchMemoryId,
    'research-agent',
    'writer-agent',
    {
      permissions: { canRead: true, canWrite: false, canDelete: false },
      message: 'Use this for your article'
    }
  );

  // Analyst shares metrics with writer
  console.log('  Analyst agent sharing with writer agent...');
  await memory.share(
    analystMemoryId,
    'analyst-agent',
    'writer-agent',
    {
      permissions: { canRead: true, canWrite: false, canDelete: false }
    }
  );

  // Research shares with analyst too
  console.log('  Research agent sharing with analyst agent...\n');
  await memory.share(
    researchMemoryId,
    'research-agent',
    'analyst-agent',
    {
      permissions: { canRead: true, canWrite: true }
    }
  );

  console.log('3. Retrieving shared memories:\n');

  // Writer agent retrieves memories shared with it
  const writerSharedMemories = await memory.getShared('writer-agent');
  console.log(`  Writer agent has access to ${writerSharedMemories.length} shared memories:`);
  for (const mem of writerSharedMemories) {
    console.log(`    - From ${mem.agentId}: ${JSON.stringify(mem.content).substring(0, 60)}...`);
  }

  // Research agent retrieves what it shared
  console.log('\n  Memories shared by research agent:');
  const researchShared = await memory.sharing.getSharedByAgent('research-agent');
  for (const mem of researchShared) {
    const share = memory.sharing.shareRecords.get(mem.id);
    console.log(`    - ${mem.id}: shared with ${share?.sharedWith.join(', ')}`);
  }

  console.log('\n4. Access control demonstration:\n');

  // Check if writer can read research memory
  const canWriterRead = await memory.sharing.canAccess(researchMemoryId, 'writer-agent');
  console.log(`  Writer can read research memory: ${canWriterRead.canRead}`);
  console.log(`  Writer can write research memory: ${canWriterRead.canWrite}`);
  console.log(`  Writer can delete research memory: ${canWriterRead.canDelete}`);

  // Check if analyst can write (we gave write permission)
  const canAnalystWrite = await memory.sharing.canAccess(researchMemoryId, 'analyst-agent');
  console.log(`  Analyst can write research memory: ${canAnalystWrite.canWrite}`);

  // Check if writer (owner) can modify their own memory
  const canWriterModifyOwn = await memory.sharing.canAccess(writerMemoryId, 'writer-agent');
  console.log(`  Writer can modify own memory: ${canWriterModifyOwn.canWrite} (owner)\n`);

  console.log('5. Registering agent capabilities:\n');

  // Register what each agent can do
  memory.sharing.registerAgentCapabilities('research-agent', [
    'web-search',
    'paper-analysis',
    'fact-checking'
  ]);

  memory.sharing.registerAgentCapabilities('writer-agent', [
    'content-generation',
    'editing',
    'summarization'
  ]);

  memory.sharing.registerAgentCapabilities('analyst-agent', [
    'data-analysis',
    'metrics',
    'visualization'
  ]);

  console.log('  Registered capabilities for all agents\n');

  // Find agents by capability
  console.log('6. Finding agents by capability:\n');

  const writers = memory.sharing.findAgentsByCapability('content-generation');
  console.log(`  Agents with content-generation capability: ${writers.join(', ')}`);

  const analysts = memory.sharing.findAgentsByCapability('data-analysis');
  console.log(`  Agents with data-analysis capability: ${analysts.join(', ')}\n`);

  console.log('7. Sharing statistics:\n');

  const shareStats = memory.sharing.getStats();
  console.log(`  Total shared memories: ${shareStats.totalShared}`);
  console.log(`  Pending share requests: ${shareStats.pendingRequests}`);
  console.log(`  Registered agents: ${shareStats.agentsRegistered}`);

  console.log('\n  By owner:');
  for (const [agentId, count] of Object.entries(shareStats.byOwner)) {
    console.log(`    ${agentId}: ${count} memories shared`);
  }

  await memory.destroy();
  console.log('\n✓ Cross-agent sharing demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  crossAgentSharingDemo().catch(console.error);
}

export { crossAgentSharingDemo };

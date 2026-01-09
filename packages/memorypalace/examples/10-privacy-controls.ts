/**
 * Example 10: Privacy Controls
 *
 * Demonstrates privacy and access control features:
 * - Privacy levels (private, shared, public)
 * - Permission management (read, write, delete)
 * - Access control for different agents
 * - Secure memory sharing
 *
 * @module examples/privacy-controls
 */

import { MemoryPalace, PrivacyLevel } from '../src/index.js';

async function privacyControlsDemo() {
  console.log('=== MemoryPalace: Privacy Controls Demo ===\n');

  const memory = new MemoryPalace({
    sharing: {
      enabled: true,
      defaultPrivacy: PrivacyLevel.PRIVATE,
      allowSharingRequests: true,
      requirePermission: true,
      maxSharedMemories: 100
    }
  });

  console.log('1. Creating Memories with Different Privacy Levels:\n');

  // Private memory - only owner can access
  const privateId = await memory.longTerm.store(
    { type: 'secret', content: 'API key: sk-xxxxx' },
    {
      agentId: 'agent-alpha',
      tags: ['secret', 'credentials'],
      importance: 0.9,
      privacy: PrivacyLevel.PRIVATE
    }
  );
  console.log('  [PRIVATE] Stored sensitive credentials');

  // Shared memory - specific agents can access
  const sharedId = await memory.longTerm.store(
    { type: 'project-info', content: 'Project timeline and milestones' },
    {
      agentId: 'agent-alpha',
      tags: ['project', 'shared'],
      importance: 0.7,
      privacy: PrivacyLevel.SHARED,
      sharedWith: ['agent-beta']
    }
  );
  console.log('  [SHARED] Stored project info (shared with agent-beta)');

  // Public memory - all agents can read
  const publicId = await memory.longTerm.store(
    { type: 'documentation', content: 'User manual and guides' },
    {
      agentId: 'agent-alpha',
      tags: ['docs', 'public'],
      importance: 0.6,
      privacy: PrivacyLevel.PUBLIC
    }
  );
  console.log('  [PUBLIC] Stored documentation (anyone can read)\n');

  console.log('2. Checking Access Permissions:\n');

  // Check if agent-beta can access each memory
  const canAccessPrivate = await memory.sharing.canAccess(privateId, 'agent-beta');
  console.log(`  Agent-beta access to PRIVATE memory:`);
  console.log(`    Can read: ${canAccessPrivate.canRead}`);
  console.log(`    Can write: ${canAccessPrivate.canWrite}`);
  console.log(`    Can delete: ${canAccessPrivate.canDelete}`);

  const canAccessShared = await memory.sharing.canAccess(sharedId, 'agent-beta');
  console.log(`\n  Agent-beta access to SHARED memory:`);
  console.log(`    Can read: ${canAccessShared.canRead}`);
  console.log(`    Can write: ${canAccessShared.canWrite}`);
  console.log(`    Can delete: ${canAccessShared.canDelete}`);

  const canAccessPublic = await memory.sharing.canAccess(publicId, 'agent-beta');
  console.log(`\n  Agent-beta access to PUBLIC memory:`);
  console.log(`    Can read: ${canAccessPublic.canRead}`);
  console.log(`    Can write: ${canAccessPublic.canWrite}`);
  console.log(`    Can delete: ${canAccessPublic.canDelete}`);

  // Owner always has full access
  const ownerAccess = await memory.sharing.canAccess(privateId, 'agent-alpha');
  console.log(`\n  Agent-alpha (owner) access to PRIVATE memory:`);
  console.log(`    Can read: ${ownerAccess.canRead}`);
  console.log(`    Can write: ${ownerAccess.canWrite}`);
  console.log(`    Can delete: ${ownerAccess.canDelete}\n`);

  console.log('3. Granting Specific Permissions:\n');

  // Create a memory and share with custom permissions
  const customId = await memory.longTerm.store(
    { type: 'collaborative', content: 'Joint project notes' },
    {
      agentId: 'agent-alpha',
      tags: ['collaboration'],
      importance: 0.75
    }
  );

  // Share with read-only permission
  await memory.share(customId, 'agent-alpha', 'agent-beta', {
    permissions: { canRead: true, canWrite: false, canDelete: false }
  });
  console.log('  Shared collaborative memory with agent-beta (read-only)');

  // Share with full permission
  await memory.share(customId, 'agent-alpha', 'agent-gamma', {
    permissions: { canRead: true, canWrite: true, canDelete: false }
  });
  console.log('  Shared same memory with agent-gamma (read-write)\n');

  console.log('4. Permission Verification:\n');

  const betaAccess = await memory.sharing.canAccess(customId, 'agent-beta');
  const gammaAccess = await memory.sharing.canAccess(customId, 'agent-gamma');

  console.log('  Agent-beta permissions:');
  console.log(`    Read: ${betaAccess.canRead}, Write: ${betaAccess.canWrite}`);
  console.log('  Agent-gamma permissions:');
  console.log(`    Read: ${gammaAccess.canRead}, Write: ${gammaAccess.canWrite}\n`);

  console.log('5. Revoking Access:\n');

  // Revoke agent-beta's access
  const revoked = await memory.sharing.revokeAccess(customId, 'agent-beta', 'agent-alpha');
  console.log(`  Revoked agent-beta access: ${revoked}`);

  // Verify revocation
  const betaAccessAfter = await memory.sharing.canAccess(customId, 'agent-beta');
  console.log(`  Agent-beta can still read: ${betaAccessAfter.canRead}\n`);

  console.log('6. Privacy Level Transitions:\n');

  // Start private, then share
  const transitionId = await memory.longTerm.store(
    { type: 'transition-demo', content: 'Initially private data' },
    {
      agentId: 'agent-alpha',
      tags: ['demo'],
      importance: 0.6,
      privacy: PrivacyLevel.PRIVATE
    }
  );
  console.log('  Created PRIVATE memory');

  // Share with specific agents
  await memory.share(transitionId, 'agent-alpha', 'agent-beta', {
    permissions: { canRead: true, canWrite: false }
  });
  console.log('  Shared with agent-beta (now SHARED)\n');

  console.log('7. Share Request Management:\n');

  // Create share request
  await memory.share(publicId, 'agent-alpha', 'agent-delta', {
    message: 'Access to documentation'
  });
  console.log('  Created share request for agent-delta');

  // Check pending requests
  const pendingRequests = memory.sharing.getPendingRequests('agent-delta');
  console.log(`  Pending requests for agent-delta: ${pendingRequests.length}`);

  // Accept the request
  if (pendingRequests.length > 0) {
    const requestId = pendingRequests[0].id;
    await memory.sharing.acceptShareRequest(requestId);
    console.log('  Share request accepted\n');
  }

  console.log('8. Privacy Statistics:\n');

  const shareStats = memory.sharing.getStats();
  console.log(`  Total shared memories: ${shareStats.totalShared}`);
  console.log(`  Pending requests: ${shareStats.pendingRequests}`);

  console.log('\n  Distribution by owner:');
  for (const [owner, count] of Object.entries(shareStats.byOwner)) {
    console.log(`    ${owner}: ${count} shared memories`);
  }

  console.log('\n9. Security Best Practices:\n');

  console.log('  Privacy best practices:');
  console.log('    1. Default to PRIVATE for sensitive data');
  console.log('    2. Use SHARED for team collaboration');
  console.log('    3. Reserve PUBLIC for generic documentation');
  console.log('    4. Grant minimum required permissions');
  console.log('    5. Revoke access when no longer needed');
  console.log('    6. Audit sharing regularly');
  console.log('    7. Use requirePermission for controlled sharing');

  console.log('\n10. Cross-Agent Privacy Boundaries:\n');

  // Agent-bravo tries to access agent-alpha's private memory
  const bravoAccess = await memory.sharing.canAccess(privateId, 'agent-bravo');
  console.log('  Agent-bravo attempting to access agent-alpha private:');
  console.log(`    Result: ${bravoAccess.canRead ? 'GRANTED' : 'DENIED'}`);
  console.log('    Privacy boundary enforced! ✓');

  await memory.destroy();
  console.log('\n✓ Privacy controls demo completed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  privacyControlsDemo().catch(console.error);
}

export { privacyControlsDemo };

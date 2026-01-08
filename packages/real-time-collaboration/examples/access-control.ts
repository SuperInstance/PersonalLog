/**
 * Example 4: Access Control
 *
 * Demonstrates permissions and access control
 */

import {
  createAccessPolicy,
  getAccessPolicy,
  updateAccessPolicy,
  grantUserPermission,
  revokeUserPermission,
  getUserPermission,
  checkPermission,
  listUserGrants,
  batchCheckPermissions,
  exportAccessPolicy,
  importAccessPolicy,
  getAuditLogs,
  getAuditStatistics
} from '@superinstance/real-time-collaboration'

async function accessControlExample() {
  const resourceId = 'doc-789'
  const resourceType = 'knowledge' as const
  const ownerId = 'user-owner'

  // 1. Create access policy
  const policy = await createAccessPolicy(resourceId, resourceType, ownerId, {
    defaultPermission: 'viewer',
    allowPublicSharing: false,
    requireApprovalForEdit: true,
    allowedRoles: ['owner', 'editor', 'commenter', 'viewer'],
  })

  console.log('Created policy:', policy.id)

  // 2. Grant editor permission to a user
  const editorGrant = await grantUserPermission(
    resourceId,
    'user-editor-1',
    'editor',
    ownerId
  )

  console.log('Granted editor permission to:', editorGrant.userId)

  // 3. Grant commenter permission (with expiration)
  const commenterGrant = await grantUserPermission(
    resourceId,
    'user-commenter-1',
    'commenter',
    ownerId,
    {
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  )

  console.log('Granted commenter permission (expires in 30 days)')

  // 4. Get user's permission level
  const editorPermission = await getUserPermission(resourceId, 'user-editor-1')
  console.log('Editor permission level:', editorPermission) // 'editor'

  const viewerPermission = await getUserPermission(resourceId, 'user-viewer-1')
  console.log('Viewer permission level:', viewerPermission) // 'viewer' (default)

  // 5. Check if user can perform specific actions
  const canEdit = await checkPermission(resourceId, 'user-editor-1', 'edit')
  console.log('Editor can edit:', canEdit) // true

  const canDelete = await checkPermission(resourceId, 'user-editor-1', 'delete')
  console.log('Editor can delete:', canDelete) // false

  const canComment = await checkPermission(resourceId, 'user-commenter-1', 'comment')
  console.log('Commenter can comment:', canComment) // true

  // 6. Batch check permissions for multiple resources
  const permissions = await batchCheckPermissions(
    ['doc-789', 'doc-456', 'doc-123'],
    'user-editor-1',
    'edit'
  )

  console.log('Batch permissions check:', Object.fromEntries(permissions))

  // 7. List all user grants
  const grants = await listUserGrants(resourceId)
  console.log('Total user grants:', grants.length)
  grants.forEach(grant => {
    console.log(`- ${grant.userId}: ${grant.permission}`)
  })

  // 8. Update access policy settings
  await updateAccessPolicy(resourceId, {
    defaultPermission: 'commenter',
    requireApprovalForEdit: false,
  })

  console.log('Policy settings updated')

  // 9. Revoke permission
  await revokeUserPermission(resourceId, 'user-commenter-1', ownerId)
  console.log('Revoked commenter permission')

  // 10. Export policy (for backup)
  const policyJson = await exportAccessPolicy(resourceId)
  console.log('Exported policy:', policyJson.substring(0, 100) + '...')

  // 11. Import policy (restore from backup)
  // await importAccessPolicy(policyJson)
  // console.log('Policy restored from backup')

  // 12. Get audit logs
  const auditLogs = await getAuditLogs(resourceId, {
    limit: 10,
    actions: ['permission-granted', 'permission-revoked'],
  })

  console.log('Recent audit logs:', auditLogs.length)
  auditLogs.forEach(log => {
    console.log(`- ${log.action} by ${log.userId} at ${new Date(log.timestamp).toISOString()}`)
  })

  // 13. Get audit statistics
  const stats = await getAuditStatistics(resourceId)
  console.log('Audit statistics:', stats)
}

// Run the example
accessControlExample().catch(console.error)

/**
 * Example 1: Basic Usage
 *
 * Demonstrates basic sharing functionality
 */

import {
  createShareLink,
  generateShareUrl,
  accessShare,
  listShareLinks,
  deleteShareLink
} from '@superinstance/real-time-collaboration'

async function basicSharingExample() {
  const resourceId = 'doc-123'
  const resourceType = 'knowledge' as const

  // 1. Create a public share link
  const publicShare = await createShareLink(resourceId, resourceType, 'public', {
    permissions: {
      canView: true,
      canEdit: false,
      canComment: true,
      canShare: false,
      canDownload: true,
      canDelete: false,
    },
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  })

  console.log('Created public share:', publicShare.shareId)

  // 2. Create a password-protected share link
  const protectedShare = await createShareLink(
    resourceId,
    resourceType,
    'password-protected',
    {
      password: 'secret-password-123',
      permissions: {
        canView: true,
        canEdit: true,
        canComment: true,
        canShare: false,
        canDownload: true,
        canDelete: false,
      },
    }
  )

  console.log('Created protected share:', protectedShare.shareId)

  // 3. Generate share URL
  const shareUrl = generateShareUrl(
    protectedShare.shareId,
    'https://your-app.com'
  )
  console.log('Share URL:', shareUrl)

  // 4. Access the share (with password)
  const accessResult = await accessShare(protectedShare.shareId, 'secret-password-123')
  if (accessResult.hasAccess) {
    console.log('Access granted:', accessResult.share)
  } else {
    console.log('Access denied:', accessResult.reason)
  }

  // 5. List all shares for the resource
  const shares = await listShareLinks(resourceId)
  console.log('Total shares:', shares.length)

  // 6. Clean up (delete share link)
  await deleteShareLink(publicShare.id)
  console.log('Share link deleted')
}

// Run the example
basicSharingExample().catch(console.error)

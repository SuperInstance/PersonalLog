# @superinstance/real-time-collaboration

Complete real-time collaboration system for modern web applications. Features secure sharing, threaded comments, presence tracking, real-time cursors, and granular access control.

## Features

- **Real-Time Collaboration**: WebSocket-based real-time updates with automatic reconnection
- **Secure Sharing**: Create share links with password protection and expiration
- **Comments System**: Threaded comments with reactions, mentions, and resolution
- **Presence Tracking**: See who's online, their cursors, and what they're viewing
- **Access Control**: Granular permissions with owner, editor, commenter, and viewer roles
- **Audit Logging**: Complete audit trail of all collaboration activities
- **Offline-First**: IndexedDB storage for local data persistence
- **TypeScript**: Fully typed for excellent developer experience

## Installation

```bash
npm install @superinstance/real-time-collaboration
```

## Quick Start

### 1. Basic Collaboration Setup

```typescript
import { initializeCollaboration } from '@superinstance/real-time-collaboration'

// Initialize the collaboration system
const collaboration = await initializeCollaboration({
  userId: 'user-123',
  userName: 'Alice Johnson',
  websocketUrl: 'wss://your-server.com/collaboration',
  userColor: '#3b82f6',
  idleTimeout: 300000, // 5 minutes
})

// Get the client and presence manager
const client = collaboration.getClient()
const presence = collaboration.getPresence()
```

### 2. Create a Share Link

```typescript
import { createShareLink, generateShareUrl } from '@superinstance/real-time-collaboration'

// Create a password-protected share link
const share = await createShareLink(
  'resource-123',
  'conversation',
  'password-protected',
  {
    password: 'secret-password',
    permissions: {
      canView: true,
      canEdit: true,
      canComment: true,
      canShare: false,
      canDownload: true,
    },
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  }
)

// Generate share URL
const url = generateShareUrl(share.shareId, 'https://your-app.com')
console.log(url) // https://your-app.com/share/share_1234567890_abc123
```

### 3. Add Comments

```typescript
import {
  addComment,
  getComments,
  addReaction,
  resolveComment
} from '@superinstance/real-time-collaboration'

// Add a comment
const comment = await addComment(
  'resource-123',
  'conversation',
  'This looks great! Any thoughts on the design?',
  {
    id: 'user-123',
    name: 'Alice Johnson',
    isCurrentUser: true,
  },
  {
    highlights: [
      {
        start: 10,
        end: 25,
        text: 'looks great',
      }
    ]
  }
)

// Get all comments for a resource
const comments = await getComments('resource-123', {
  includeResolved: false,
})

// Add a reaction
await addReaction(comment.id, '👍', 'user-456')

// Resolve the comment
await resolveComment(comment.id, true, 'user-123')
```

### 4. Track User Presence

```typescript
import { initializePresenceManager } from '@superinstance/real-time-collaboration'

// Initialize presence tracking
const presence = await initializePresenceManager(
  'user-123',
  'Alice Johnson',
  client,
  {
    userColor: '#3b82f6',
    idleTimeout: 300000,
  }
)

// Update cursor position
await presence.updateCursor({
  resourceId: 'resource-123',
  position: 150,
  x: 250,
  y: 400,
})

// Set typing status
await presence.setTyping('resource-123', true)

// Get active users on this resource
const activeUsers = presence.getPresencesForResource('resource-123')

// Subscribe to presence changes
presence.onPresenceChange((presences) => {
  console.log('Active users:', presences)
})
```

### 5. Access Control

```typescript
import {
  createAccessPolicy,
  grantUserPermission,
  checkPermission,
  getUserPermission
} from '@superinstance/real-time-collaboration'

// Create access policy
await createAccessPolicy('resource-123', 'conversation', 'user-owner', {
  defaultPermission: 'viewer',
  allowPublicSharing: false,
  requireApprovalForEdit: true,
})

// Grant specific permissions
await grantUserPermission('resource-123', 'user-456', 'editor', 'user-owner')

// Check if user can perform action
const canEdit = await checkPermission('resource-123', 'user-456', 'edit')

// Get user's permission level
const permission = await getUserPermission('resource-123', 'user-456')
console.log(permission) // 'editor'
```

## Architecture

### Core Components

```
@superinstance/real-time-collaboration/
├── Sharing System       # Share links, access control, expiration
├── Comments System      # Threaded comments, reactions, mentions
├── Presence System      # User presence, cursors, typing indicators
├── Permissions System   # Access policies, user grants, audit logging
└── WebSocket Client     # Real-time communication, reconnection
```

### Data Flow

```
User Action → WebSocket → Server → Broadcast → Other Clients
                         ↓
                    IndexedDB (local cache)
```

## API Reference

### Sharing System

#### `createShareLink(resourceId, resourceType, visibility, options?)`

Create a new share link for a resource.

- **resourceId**: ID of the resource to share
- **resourceType**: Type of resource (`'conversation' | 'knowledge' | 'message'`)
- **visibility**: Visibility level (`'public' | 'password-protected' | 'restricted' | 'private'`)
- **options**: Optional settings
  - `password`: Password for protected shares
  - `permissions`: Permission object
  - `expiresAt`: Expiration timestamp

**Returns**: `Promise<ShareLink>`

#### `accessShare(shareId, password?)`

Access a shared resource.

- **shareId**: Share token
- **password**: Optional password for protected shares

**Returns**: `Promise<{ share: ShareLink; hasAccess: boolean; reason?: string }>`

### Comments System

#### `addComment(resourceId, resourceType, content, author, options?)`

Add a comment to a resource.

- **resourceId**: ID of the resource
- **resourceType**: Type of resource
- **content**: Comment text content
- **author**: Author information object
- **options**: Optional settings
  - `parentId`: Parent comment ID for replies
  - `highlights`: Text highlights array
  - `attachments`: Attachment array

**Returns**: `Promise<Comment>`

#### `getComments(resourceId, options?)`

Get all comments for a resource.

- **resourceId**: ID of the resource
- **options**: Optional filters
  - `includeResolved`: Include resolved comments
  - `parentId`: Filter by parent ID

**Returns**: `Promise<Comment[]>`

### Presence System

#### `initializePresenceManager(userId, userName, client, options?)`

Initialize presence tracking for a user.

- **userId**: User's unique ID
- **userName**: User's display name
- **client**: Collaboration client instance
- **options**: Optional settings
  - `userColor`: User's cursor color
  - `idleTimeout`: Idle timeout in milliseconds

**Returns**: `Promise<PresenceManager>`

#### `updateCursor(cursor)`

Update user's cursor position.

- **cursor**: Cursor position object
  - `resourceId`: Resource ID
  - `position`: Character position
  - `x`: Visual X coordinate
  - `y`: Visual Y coordinate

**Returns**: `Promise<void>`

### Permissions System

#### `createAccessPolicy(resourceId, resourceType, owner, permissions?)`

Create access policy for a resource.

- **resourceId**: ID of the resource
- **resourceType`: Type of resource
- **owner**: Owner user ID
- **permissions**: Optional permission settings

**Returns**: `Promise<AccessPolicy>`

#### `checkPermission(resourceId, userId, action)`

Check if user can perform an action.

- **resourceId**: ID of the resource
- **userId**: User's ID
- **action**: Action to check (`'view' | 'edit' | 'comment' | 'share' | 'delete' | 'grant-permissions'`)

**Returns**: `Promise<boolean>`

## Examples

### Example 1: Complete Collaborative Document

```typescript
import {
  initializeCollaboration,
  createShareLink,
  addComment,
  createAccessPolicy,
  grantUserPermission
} from '@superinstance/real-time-collaboration'

async function setupCollaborativeDocument() {
  // 1. Initialize collaboration
  const collab = await initializeCollaboration({
    userId: 'owner-123',
    userName: 'Document Owner',
  })

  // 2. Set up access control
  await createAccessPolicy('doc-123', 'knowledge', 'owner-123', {
    defaultPermission: 'viewer',
    allowPublicSharing: false,
  })

  // 3. Grant editor access to a collaborator
  await grantUserPermission('doc-123', 'collaborator-456', 'editor', 'owner-123')

  // 4. Create share link for public viewing
  const share = await createShareLink('doc-123', 'knowledge', 'public')

  // 5. Add initial comment
  await addComment('doc-123', 'knowledge', 'Starting collaboration!', {
    id: 'owner-123',
    name: 'Document Owner',
    isCurrentUser: true,
  })

  return { collab, share }
}
```

### Example 2: Real-Time Presence Indicators

```typescript
import { initializePresenceManager } from '@superinstance/real-time-collaboration'

async function setupPresenceIndicators(client: CollaborationClient) {
  const presence = await initializePresenceManager('user-123', 'Alice', client)

  // Subscribe to presence changes
  const unsubscribe = presence.onPresenceChange((presences) => {
    presences.forEach(p => {
      console.log(`${p.userName} is ${p.status}`)

      // Render cursor
      if (p.cursor) {
        renderCursor(p.userId, p.cursor, p.color)
      }

      // Show typing indicator
      if (p.status === 'typing') {
        showTypingIndicator(p.userName)
      }
    })
  })

  // Update cursor on user input
  document.addEventListener('input', async (e) => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      await presence.updateCursor({
        resourceId: 'doc-123',
        position: range.startOffset,
        x: rect.left,
        y: rect.top,
      })
    }
  })

  // Cleanup on unmount
  return () => {
    unsubscribe()
    presence.cleanup()
  }
}
```

### Example 3: Comment Thread with Reactions

```typescript
import {
  addComment,
  getCommentThread,
  addReaction,
  resolveComment,
  searchComments
} from '@superinstance/real-time-collaboration'

async function commentWorkflow() {
  // Create parent comment
  const parent = await addComment(
    'doc-123',
    'knowledge',
    'What do you think about this section? @bob',
    {
      id: 'user-123',
      name: 'Alice',
      isCurrentUser: true,
    }
  )

  // Bob replies
  const reply = await addComment(
    'doc-123',
    'knowledge',
    'I think it needs more detail',
    {
      id: 'user-456',
      name: 'Bob',
      isCurrentUser: false,
    },
    { parentId: parent.id }
  )

  // Alice reacts to Bob's reply
  await addReaction(reply.id, '👍', 'user-123')

  // Bob also reacts
  await addReaction(reply.id, '❤️', 'user-456')

  // Get full thread
  const thread = await getCommentThread(parent.id)
  console.log('Thread:', thread)

  // Search for comments mentioning Bob
  const bobMentions = await searchComments('doc-123', '@bob')
  console.log('Bob mentions:', bobMentions)

  // Resolve the thread
  await resolveComment(parent.id, true, 'user-123')
}
```

## Type Safety

All types are exported for full TypeScript support:

```typescript
import type {
  ShareLink,
  Comment,
  UserPresence,
  AccessPolicy,
  CollaborationSession,
  CollaborationOperation
} from '@superinstance/real-time-collaboration'
```

## Browser Support

- Chrome/Edge: >= 90
- Firefox: >= 88
- Safari: >= 14

## Storage

Uses IndexedDB for local persistence:

- **Database**: `RealTimeCollaboration`
- **Stores**:
  - `shares` - Share links
  - `comments` - Comments
  - `access-policies` - Access control policies
  - `audit-logs` - Audit trail

## Security

- Passwords hashed using PBKDF2 (100,000 iterations)
- Share tokens are cryptographically generated
- All permission checks are server-enforced
- Complete audit trail for compliance

## Performance

- Efficient IndexedDB queries with proper indexing
- WebSocket message batching
- Automatic cleanup of expired data
- Presence updates throttled to 30-second intervals

## License

MIT © [SuperInstance](https://github.com/SuperInstance)

## Repository

[https://github.com/SuperInstance/Real-Time-Collaboration](https://github.com/SuperInstance/Real-Time-Collaboration)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

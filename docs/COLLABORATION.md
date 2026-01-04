# Collaboration System

Complete real-time collaboration system for PersonalLog, including sharing, comments, presence tracking, and access control.

## Features

### Sharing
- **Share Links**: Create shareable links with customizable permissions
- **Access Control**: Public, private, password-protected, or restricted access
- **Expiration**: Set automatic expiration dates for shares
- **Access Requests**: Allow users to request access to restricted resources
- **Share Management**: Revoke, update, or delete share links
- **Statistics**: Track share usage and access counts

### Comments & Annotations
- **Threaded Comments**: Add comments with nested replies
- **Reactions**: React to comments with emojis
- **Mentions**: @mention other users in comments
- **Resolution**: Mark comments as resolved/unresolved
- **Highlighting**: Highlight and annotate specific text
- **Attachments**: Attach files to comments
- **Search**: Search and filter comments

### Real-time Collaboration
- **Presence Indicators**: See who's currently viewing
- **Cursors**: See other users' cursor positions in real-time
- **Typing Indicators**: Know when others are typing
- **Live Updates**: Real-time updates via WebSocket
- **Offline Support**: Queue changes when offline
- **Reconnection**: Automatic reconnection with conflict resolution

### Permissions & Access Control
- **User Permissions**: Granular permissions (owner, editor, commenter, viewer)
- **Role-Based Access**: Custom roles with specific permissions
- **Access Policies**: Define default permissions per resource
- **Audit Logging**: Track all collaboration actions
- **Permission Expiration**: Time-limited access grants

## Installation

The collaboration system is included in PersonalLog. No additional installation required.

## Quick Start

### 1. Initialize Collaboration System

```typescript
import { initializeCollaboration } from '@/lib/collaboration'

const collaboration = await initializeCollaboration({
  userId: 'user-123',
  userName: 'John Doe',
  websocketUrl: 'wss://your-server.com',
  userColor: '#3b82f6',
  idleTimeout: 300000, // 5 minutes
})
```

### 2. Create a Share Link

```typescript
import { createShareLink, generateShareUrl } from '@/lib/collaboration'

const share = await createShareLink(
  'conversation-123',
  'conversation',
  'private',
  {
    permissions: {
      canView: true,
      canEdit: false,
      canComment: true,
    },
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  }
)

const shareUrl = generateShareUrl(share.shareId)
console.log('Share URL:', shareUrl)
```

### 3. Add Comments

```typescript
import { addComment } from '@/lib/collaboration'

const comment = await addComment(
  'conversation-123',
  'conversation',
  'This is a great discussion!',
  {
    id: 'user-123',
    name: 'John Doe',
    isCurrentUser: true,
  }
)
```

### 4. Join a Collaboration Session

```typescript
const client = collaboration.getClient()
client.joinSession('conversation-123', 'conversation')

// Listen for other users
client.onUserJoin((userId, presence) => {
  console.log(`${presence.userName} joined`)
})

// Listen for cursor updates
client.onCursorUpdate((userId, cursor) => {
  console.log(`User ${userId} cursor at ${cursor.position}`)
})
```

## API Reference

### Sharing

#### `createShareLink(resourceId, resourceType, visibility, options)`
Create a new share link.

- **resourceId**: ID of the resource to share
- **resourceType**: `'conversation' | 'knowledge' | 'message'`
- **visibility**: `'public' | 'private' | 'password-protected' | 'restricted'`
- **options**:
  - `password?: string`: Password for password-protected shares
  - `permissions?: Partial<SharedPermissions>`
  - `expiresAt?: number`: Expiration timestamp

**Returns**: `Promise<ShareLink>`

#### `accessShare(shareId, password?)`
Access a shared resource.

- **shareId**: Share token
- **password**: Optional password for password-protected shares

**Returns**: `Promise<{ share: ShareLink; hasAccess: boolean; reason?: string }>`

### Comments

#### `addComment(resourceId, resourceType, content, author, options)`
Add a comment to a resource.

- **content**: Comment text
- **author**: Comment author information
- **options**:
  - `parentId?: string`: Parent comment ID for replies
  - `highlights?: TextHighlight[]`: Highlighted text ranges
  - `attachments?: CommentAttachment[]`: File attachments

**Returns**: `Promise<Comment>`

#### `getComments(resourceId, options)`
Get comments for a resource.

- **options**:
  - `includeResolved?: boolean`: Include resolved comments (default: false)
  - `parentId?: string`: Filter by parent ID

**Returns**: `Promise<Comment[]>`

#### `resolveComment(commentId, resolved, resolvedBy?)`
Resolve or unresolve a comment.

**Returns**: `Promise<Comment>`

### Real-time

#### `CollaborationClient`
Main client for real-time collaboration.

**Methods**:
- `connect()`: Connect to collaboration server
- `disconnect()`: Disconnect from server
- `joinSession(resourceId, resourceType)`: Join a collaboration session
- `leaveSession(resourceId)`: Leave a session
- `updatePresence(presence)`: Update current user's presence
- `sendCursor(cursor)`: Send cursor position
- `sendTypingIndicator(resourceId, isTyping)`: Send typing status
- `onPresenceUpdate(callback)`: Subscribe to presence updates
- `onCursorUpdate(callback)`: Subscribe to cursor updates
- `onTypingIndicator(callback)`: Subscribe to typing indicators
- `onUserJoin(callback)`: Subscribe to user join events
- `onUserLeave(callback)`: Subscribe to user leave events

#### `PresenceManager`
Manages user presence and cursors.

**Methods**:
- `initialize()`: Initialize presence tracking
- `updatePresence(updates)`: Update current user's presence
- `updateCursor(cursor)`: Update cursor position
- `setTyping(resourceId, isTyping)`: Set typing status
- `getActivePresences()`: Get all active users
- `getPresencesForResource(resourceId)`: Get users viewing a resource
- `getCursorsForResource(resourceId)`: Get cursor positions for a resource
- `getTypingUsers(resourceId)`: Get users currently typing
- `onPresenceChange(callback)`: Subscribe to presence changes

### Permissions

#### `createAccessPolicy(resourceId, resourceType, owner, permissions)`
Create access policy for a resource.

**Returns**: `Promise<AccessPolicy>`

#### `grantUserPermission(resourceId, userId, permission, grantedBy, options?)`
Grant permission to a user.

- **permission**: `'owner' | 'editor' | 'commenter' | 'viewer'`
- **options**:
  - `expiresAt?: number`: Permission expiration timestamp

**Returns**: `Promise<UserGrant>`

#### `checkPermission(resourceId, userId, action)`
Check if user can perform an action.

- **action**: `'view' | 'edit' | 'comment' | 'share' | 'delete' | 'grant-permissions'`

**Returns**: `Promise<boolean>`

## React Components

### `<ShareDialog>`
Modal dialog for creating and managing share links.

```tsx
import { ShareDialog } from '@/components/collaboration/ShareDialog'

<ShareDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  resourceId="conversation-123"
  resourceType="conversation"
  resourceTitle="My Conversation"
/>
```

### `<CommentsPanel>`
Panel for displaying and managing comments.

```tsx
import { CommentsPanel } from '@/components/collaboration/CommentsPanel'

<CommentsPanel
  resourceId="conversation-123"
  resourceType="conversation"
  currentUser={{
    id: 'user-123',
    name: 'John Doe',
    isCurrentUser: true,
  }}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
/>
```

### `<PresenceIndicator>`
Shows active users viewing a resource.

```tsx
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'

<PresenceIndicator
  resourceId="conversation-123"
  client={collaborationClient}
  currentUserId="user-123"
/>
```

### `<CollaborationToolbar>`
Toolbar with share and comments buttons.

```tsx
import { CollaborationToolbar } from '@/components/collaboration/CollaborationToolbar'

<CollaborationToolbar
  resourceId="conversation-123"
  resourceType="conversation"
  resourceTitle="My Conversation"
  currentUser={currentUser}
  collaborationClient={client}
/>
```

## Data Storage

The collaboration system uses IndexedDB for local storage:

- **PersonalLogCollaboration** database
  - `shares`: Share links
  - `access-requests`: Access requests
  - `comments`: Comments
  - `access-policies`: Access policies
  - `audit-logs`: Audit trail

## Security

- **End-to-end encryption**: Password-protected shares use hashed passwords
- **Access control**: Granular permissions per user
- **Audit logging**: All collaboration actions are logged
- **Token-based sharing**: Share tokens are unique and non-guessable

## Best Practices

### 1. Permission Management
- Use the principle of least privilege
- Regularly review and revoke unused permissions
- Set expiration dates for temporary access

### 2. Share Links
- Use password protection for sensitive content
- Set appropriate expiration dates
- Regularly audit active shares

### 3. Comments
- Encourage constructive discussions
- Use @mentions sparingly and appropriately
- Resolve comments when addressed

### 4. Real-time Collaboration
- Handle connection failures gracefully
- Implement offline support
- Show clear presence indicators

## Troubleshooting

### WebSocket Connection Issues
- Check that the WebSocket server is running
- Verify the websocketUrl configuration
- Check firewall/proxy settings

### Comments Not Appearing
- Ensure the resourceId matches exactly
- Check IndexedDB permissions
- Verify the user has permission to comment

### Presence Not Working
- Confirm collaboration system is initialized
- Check that user has joined the session
- Verify WebSocket connection is active

## Future Enhancements

- [ ] Video/audio chat integration
- [ ] Screen sharing
- [ ] Version history with diff view
- [ ] Advanced conflict resolution (CRDTs)
- [ ] File collaboration
- [ ] Mobile app support
- [ ] Integration with external collaboration tools (Slack, Teams)

## License

MIT License - see LICENSE file for details

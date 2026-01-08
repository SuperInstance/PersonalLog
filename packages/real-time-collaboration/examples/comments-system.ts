/**
 * Example 2: Comments System
 *
 * Demonstrates threaded comments with reactions
 */

import {
  addComment,
  getComments,
  getCommentThread,
  updateComment,
  resolveComment,
  addReaction,
  removeReaction,
  searchComments,
  getCommentStatistics,
  getUnresolvedComments
} from '@superinstance/real-time-collaboration'

async function commentsExample() {
  const resourceId = 'doc-456'
  const resourceType = 'conversation' as const

  const alice = {
    id: 'user-123',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatar: '#3b82f6',
    isCurrentUser: true,
  }

  const bob = {
    id: 'user-456',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatar: '#ef4444',
    isCurrentUser: false,
  }

  // 1. Add a top-level comment with @mention
  const comment1 = await addComment(
    resourceId,
    resourceType,
    'What do you think about this design? @bob',
    alice,
    {
      highlights: [
        {
          start: 10,
          end: 25,
          text: 'design',
        }
      ]
    }
  )

  console.log('Created comment:', comment1.id)
  console.log('Mentions:', comment1.metadata.mentions) // ['bob']

  // 2. Bob replies to the comment
  const reply1 = await addComment(
    resourceId,
    resourceType,
    'I think it looks great! Maybe we could add more contrast?',
    bob,
    { parentId: comment1.id }
  )

  console.log('Created reply:', reply1.id)

  // 3. Alice reacts to Bob's reply
  await addReaction(reply1.id, '👍', alice.id)
  console.log('Added reaction to reply')

  // 4. Bob also reacts with heart
  await addReaction(reply1.id, '❤️', bob.id)
  console.log('Added another reaction')

  // 5. Get all comments for the resource
  const allComments = await getComments(resourceId, { includeResolved: true })
  console.log('Total comments:', allComments.length)

  // 6. Get the full thread (parent + replies)
  const thread = await getCommentThread(comment1.id)
  console.log('Thread length:', thread.length)

  // 7. Search for comments containing specific text
  const searchResults = await searchComments(resourceId, 'design')
  console.log('Search results:', searchResults.length)

  // 8. Get unresolved comments
  const unresolved = await getUnresolvedComments(resourceId)
  console.log('Unresolved comments:', unresolved.length)

  // 9. Get statistics
  const stats = await getCommentStatistics(resourceId)
  console.log('Comment statistics:', stats)

  // 10. Resolve the thread
  await resolveComment(comment1.id, true, alice.id)
  console.log('Comment resolved')

  // 11. Update a comment
  const updated = await updateComment(reply1.id, {
    content: 'I think it looks great! Maybe we could add more contrast? Updated with more details.',
  })
  console.log('Comment updated, edit count:', updated.metadata.edits)

  // 12. Remove a reaction
  await removeReaction(reply1.id, '❤️', bob.id)
  console.log('Reaction removed')
}

// Run the example
commentsExample().catch(console.error)

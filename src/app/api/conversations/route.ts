/**
 * Conversations API Route
 *
 * CRUD operations for conversations and messages.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listConversations,
  createConversation,
  deleteConversation,
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
} from '@/lib/storage/conversation-store'
import {
  applyCacheHeaders,
  CacheConfigs,
  CacheTags,
  generateETag,
  checkConditionalRequest,
  createNotModifiedResponse,
} from '@/lib/cache/cache-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/conversations - List all conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as any

    const conversations = await listConversations({ includeArchived: false })

    // Generate ETag for conditional requests
    const etag = generateETag(conversations)

    // Check if client has cached version
    const conditional = checkConditionalRequest(request)
    if (conditional.etag === etag) {
      return createNotModifiedResponse()
    }

    // Apply cache headers: cache for 5 minutes with stale-while-revalidate
    const response = NextResponse.json(
      { conversations },
      {
        headers: {
          ETag: etag,
        },
      }
    )

    return applyCacheHeaders(response, {
      ...CacheConfigs.sometimesChanging,
      tag: CacheTags.CONVERSATIONS,
    })
  } catch (error) {
    console.error('Conversations GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, type = 'personal' } = body

    const conversation = await createConversation(title, type)

    // Don't cache POST responses
    const response = NextResponse.json({ conversation }, { status: 201 })
    return applyCacheHeaders(response, CacheConfigs.personalized)
  } catch (error) {
    console.error('Conversations POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations - Delete a conversation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    await deleteConversation(id)

    // Don't cache DELETE responses
    const response = NextResponse.json({ success: true })
    return applyCacheHeaders(response, CacheConfigs.dynamic)
  } catch (error) {
    console.error('Conversations DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

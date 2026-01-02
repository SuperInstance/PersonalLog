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

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/conversations - List all conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as any

    const conversations = await listConversations(type)
    return NextResponse.json({ conversations })
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
    return NextResponse.json({ conversation }, { status: 201 })
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
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Conversations DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

/**
 * Messages API Route
 *
 * CRUD operations for messages within a conversation.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getMessages,
  addMessage,
  updateMessage,
  deleteMessage,
} from '@/lib/storage/conversation-store'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const messages = await getMessages(id)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Messages GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/[id]/messages - Add a new message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, author, content } = body

    const message = await addMessage(id, type, author, content)

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Messages POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add message' },
      { status: 500 }
    )
  }
}

// PATCH /api/conversations/[id]/messages - Update a message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { messageId, updates } = body

    const message = await updateMessage(messageId, updates)
    return NextResponse.json({ message })
  } catch (error) {
    console.error('Messages PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update message' },
      { status: 500 }
    )
  }
}

// DELETE /api/conversations/[id]/messages - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
    }

    await deleteMessage(messageId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Messages DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 500 }
    )
  }
}

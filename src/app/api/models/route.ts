/**
 * Models API Route
 *
 * CRUD operations for AI models and contacts.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  listModels,
  addModel,
  deleteModel,
  getModel,
  updateModel,
} from '@/lib/wizard/model-store'
import {
  listContacts,
  createContact,
  getContact,
  updateContact,
  deleteContact,
  forkContact,
} from '@/lib/wizard/model-store'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/models - List all models and contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'models' or 'contacts'
    const provider = searchParams.get('provider')
    const baseModelId = searchParams.get('baseModelId')

    if (type === 'contacts') {
      const contacts = await listContacts(baseModelId || undefined)
      return NextResponse.json({ contacts })
    }

    const models = await listModels(provider as any || undefined)
    return NextResponse.json({ models })
  } catch (error) {
    console.error('Models GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// POST /api/models - Create a new model or contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (type === 'contact') {
      const contact = await createContact(data)
      return NextResponse.json({ contact }, { status: 201 })
    }

    const model = await addModel(data)
    return NextResponse.json({ model }, { status: 201 })
  } catch (error) {
    console.error('Models POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    )
  }
}

// PATCH /api/models - Update a model or contact
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, id, ...updates } = body

    if (type === 'contact') {
      const contact = await updateContact(id, updates)
      return NextResponse.json({ contact })
    }

    const model = await updateModel(id, updates)
    return NextResponse.json({ model })
  } catch (error) {
    console.error('Models PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 500 }
    )
  }
}

// DELETE /api/models - Delete a model or contact
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const type = searchParams.get('type')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    if (type === 'contact') {
      await deleteContact(id)
    } else {
      await deleteModel(id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Models DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    )
  }
}

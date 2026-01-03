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

// GET /api/models - List all models and contacts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'models' or 'contacts'
    const provider = searchParams.get('provider')
    const baseModelId = searchParams.get('baseModelId')

    let data: any

    if (type === 'contacts') {
      const contacts = await listContacts(baseModelId || undefined)
      data = { contacts }
    } else {
      const models = await listModels(provider as any || undefined)
      data = { models }
    }

    // Generate ETag for conditional requests
    const etag = generateETag(data)

    // Check if client has cached version
    const conditional = checkConditionalRequest(request)
    if (conditional.etag === etag) {
      return createNotModifiedResponse()
    }

    // Models rarely change - cache aggressively
    const response = NextResponse.json(
      data,
      {
        headers: {
          ETag: etag,
        },
      }
    )

    const tag = type === 'contacts' ? CacheTags.CONTACTS : CacheTags.MODELS
    return applyCacheHeaders(response, {
      ...CacheConfigs.rarelyChanging,
      tag,
    })
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

    let result
    if (type === 'contact') {
      const contact = await createContact(data)
      result = { contact }
    } else {
      const model = await addModel(data)
      result = { model }
    }

    const response = NextResponse.json(result, { status: 201 })
    return applyCacheHeaders(response, CacheConfigs.personalized)
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

    let result
    if (type === 'contact') {
      const contact = await updateContact(id, updates)
      result = { contact }
    } else {
      const model = await updateModel(id, updates)
      result = { model }
    }

    const response = NextResponse.json(result)
    return applyCacheHeaders(response, CacheConfigs.personalized)
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

    const response = NextResponse.json({ success: true })
    return applyCacheHeaders(response, CacheConfigs.dynamic)
  } catch (error) {
    console.error('Models DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete' },
      { status: 500 }
    )
  }
}

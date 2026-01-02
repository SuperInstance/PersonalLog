/**
 * Knowledge API Route
 *
 * Operations for the knowledge base: search, sync, checkpoints.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getVectorStore, type KnowledgeSearchResult } from '@/lib/knowledge/vector-store'
import { getSyncWorker } from '@/lib/knowledge/sync-worker'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/knowledge - Search or list knowledge entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '10')
    const threshold = parseFloat(searchParams.get('threshold') || '0.7')

    const vectorStore = getVectorStore()
    await vectorStore.init()

    if (action === 'search' && query) {
      const results = await vectorStore.hybridSearch(query, {
        limit,
        threshold,
      })
      return NextResponse.json({
        results,
        count: results.length,
      })
    }

    if (action === 'entries') {
      const type = searchParams.get('type') as any
      const entries = await vectorStore.getEntries({ type })
      return NextResponse.json({ entries })
    }

    if (action === 'checkpoints') {
      const checkpoints = await vectorStore.getCheckpoints()
      return NextResponse.json({ checkpoints })
    }

    if (action === 'status') {
      const syncWorker = getSyncWorker()
      const status = syncWorker.getStatus()
      return NextResponse.json({ status })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Knowledge GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Knowledge operation failed' },
      { status: 500 }
    )
  }
}

// POST /api/knowledge - Create, update, or sync knowledge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const vectorStore = getVectorStore()
    await vectorStore.init()

    if (action === 'sync') {
      const syncWorker = getSyncWorker()
      const result = await syncWorker.sync()
      return NextResponse.json({ result })
    }

    if (action === 'add-entry') {
      const { entry } = body
      const result = await vectorStore.addEntry(entry)
      return NextResponse.json({ entry: result })
    }

    if (action === 'update-entry') {
      const { id, updates } = body
      const entry = await vectorStore.updateEntry(id, updates)
      return NextResponse.json({ entry })
    }

    if (action === 'create-checkpoint') {
      const { name, description, tags } = body
      const checkpoint = await vectorStore.createCheckpoint(name, {
        description,
        tags,
      })
      return NextResponse.json({ checkpoint })
    }

    if (action === 'rollback') {
      const { checkpointId } = body
      const result = await vectorStore.rollbackToCheckpoint(checkpointId)
      return NextResponse.json({ result })
    }

    if (action === 'export') {
      const { checkpointId, format = 'jsonl' } = body
      const exportData = await vectorStore.exportForLoRA(checkpointId, format)
      return NextResponse.json({ export: exportData })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Knowledge POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Knowledge operation failed' },
      { status: 500 }
    )
  }
}

// DELETE /api/knowledge - Delete knowledge entries or checkpoints
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const vectorStore = getVectorStore()
    await vectorStore.init()

    if (action === 'entry') {
      await vectorStore.deleteEntry(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Knowledge DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete operation failed' },
      { status: 500 }
    )
  }
}

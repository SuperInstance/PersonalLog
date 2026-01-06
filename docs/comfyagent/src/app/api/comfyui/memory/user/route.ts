import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncProject } from '@/lib/rag-service';

export async function GET(request: NextRequest) {
  try {
    const memories = await db.userMemory.findMany({
      orderBy: [
        { confidence: 'desc' },
        { useCount: 'desc' }
      ]
    });

    return NextResponse.json({ memories });
  } catch (error) {
    console.error('User Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { key, category, value, confidence, source } = await request.json();

    if (!key || !category || !value) {
      return NextResponse.json(
        { error: 'Key, category, and value are required' },
        { status: 400 }
      );
    }

    // Check if memory already exists
    const existing = await db.userMemory.findFirst({
      where: { key }
    });

    if (existing) {
      const updated = await db.userMemory.update({
        where: { id: existing.id },
        data: {
          category,
          value,
          confidence: confidence || 1.0,
          source: source || 'user_explicit',
          lastUsed: new Date()
        }
      });

      return NextResponse.json({ memory: updated });
    } else {
      const created = await db.userMemory.create({
        data: {
          key,
          category,
          value,
          confidence: confidence || 1.0,
          source: source || 'user_explicit',
          useCount: 0
        }
      });

      return NextResponse.json({ memory: created, created: true });
    }
  } catch (error) {
    console.error('User Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to create memory' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, key, category, value, confidence } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    const updated = await db.userMemory.update({
      where: { id },
      data: {
        ...(key && { key }),
        ...(category && { category }),
        ...(value && { value }),
        ...(confidence && { confidence }),
        lastUsed: new Date()
      }
    });

    return NextResponse.json({ memory: updated });
  } catch (error) {
    console.error('User Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Memory ID is required' },
        { status: 400 }
      );
    }

    await db.userMemory.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User Memory API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await db.note.findUnique({
      where: { id: params.id }
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const updated = await db.note.update({
      where: { id: params.id },
      data: { isPinned: !note.isPinned }
    });

    return NextResponse.json({ note: updated });
  } catch (error) {
    console.error('Pin note error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle pin' },
      { status: 500 }
    );
  }
}

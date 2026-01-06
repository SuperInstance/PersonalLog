import { NextRequest, NextResponse } from 'next/server';
import { mergeNotes } from '@/lib/notes-service';

export async function POST(request: NextRequest) {
  try {
    const { noteIds, title } = await request.json();

    if (!noteIds || noteIds.length === 0) {
      return NextResponse.json(
        { error: 'Note IDs are required' },
        { status: 400 }
      );
    }

    const mergedNote = await mergeNotes(noteIds, title || 'Merged Notes');

    return NextResponse.json({ note: mergedNote });
  } catch (error) {
    console.error('Merge API error:', error);
    return NextResponse.json(
      { error: 'Failed to merge notes' },
      { status: 500 }
    );
  }
}

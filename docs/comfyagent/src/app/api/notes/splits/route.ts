import { NextRequest, NextResponse } from 'next/server';
import { suggestSplits, splitNote } from '@/lib/notes-service';

export async function POST(request: NextRequest) {
  try {
    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    const suggestions = await suggestSplits(noteId);

    return NextResponse.json({
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Split Suggestions API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate split suggestions' },
      { status: 500 }
    );
  }
}

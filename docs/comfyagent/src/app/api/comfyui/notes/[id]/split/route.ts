import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { splitAt } = body;

    const originalNote = await db.note.findUnique({
      where: { id: params.id }
    });

    if (!originalNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const content = originalNote.content;
    const splitPoint = Math.min(splitAt || Math.floor(content.length / 2), content.length - 10);

    const originalContent = content.substring(0, splitPoint);
    const splitContent = content.substring(splitPoint);

    // Split into two notes
    const updatedOriginal = await db.note.update({
      where: { id: params.id },
      data: {
        content: originalContent,
        wordCount: originalContent.split(/\s+/).length
      }
    });

    const newNote = await db.note.create({
      data: {
        title: `${originalNote.title} (Part 2)`,
        content: splitContent,
        description: originalNote.description,
        folder: originalNote.folder,
        projectId: originalNote.projectId,
        tags: originalNote.tags,
        order: (originalNote.order || 0) + 1,
        wordCount: splitContent.split(/\s+/).length
      }
    });

    // Create references between notes
    await db.noteFile.create({
      data: {
        noteId: params.id,
        name: `${originalNote.title} (Part 1)`,
        type: 'markdown',
        filePath: `note_${params.id}_part1.md`,
        sourceType: 'manual'
      }
    });

    await db.noteFile.create({
      data: {
        noteId: newNote.id,
        name: `${originalNote.title} (Part 2)`,
        type: 'markdown',
        filePath: `note_${newNote.id}.md`,
        sourceType: 'manual'
      }
    });

    return NextResponse.json({
      original: updatedOriginal,
      new: newNote,
      splitPoint,
      wordCounts: {
        original: originalContent.split(/\s+/).length,
        new: splitContent.split(/\s+/).length
      }
    });
  } catch (error) {
    console.error('Split note error:', error);
    return NextResponse.json(
      { error: 'Failed to split note' },
      { status: 500 }
    );
  }
}

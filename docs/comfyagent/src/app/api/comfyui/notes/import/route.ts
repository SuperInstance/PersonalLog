import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateEmbedding } from '@/lib/rag-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, sourceUrl, title } = body;

    if (!content && !sourceUrl) {
      return NextResponse.json(
        { error: 'Content or source URL is required' },
        { status: 400 }
      );
    }

    // Generate embedding for RAG
    const embedding = await generateEmbedding(content);

    const wordCount = content.split(/\s+/).length;

    let noteId: string;
    let audioDuration: number | undefined;
    let transcriptionText: string | undefined;

    // Create note from content
    if (type === 'paste' || type === 'import') {
      const note = await db.note.create({
        data: {
          title: title || 'Imported Note',
          content,
          description: `Imported from ${type === 'paste' ? 'clipboard' : 'URL'}`,
          tags: JSON.stringify(['imported']),
          folder: 'imported',
          wordCount,
          order: 0
        }
      });
      noteId = note.id;
    }
    // Handle audio file with ASR
    else if (type === 'audio') {
      const note = await db.note.create({
        data: {
          title: title || 'Transcription Note',
          content: '',
          description: 'Audio transcription',
          tags: JSON.stringify(['transcript', 'asr']),
          folder: 'transcripts',
          wordCount
        }
      });
      noteId = note.id;

      // Create file record for audio
      const audioFile = await db.noteFile.create({
        data: {
          noteId,
          name: title || 'Audio File',
          type: 'audio',
          filePath: sourceUrl || '',
          sourceType: 'asr_transcript',
          sourceUrl
        }
      });

      // In a real implementation, this would:
      // 1. Call ASR service to transcribe audio
      // 2. Update note with transcription
      // 3. Store audio file properly

      // For now, simulate ASR
      transcriptionText = content;
      audioDuration = 60; // 1 minute simulated
    }

    return NextResponse.json({
      noteId,
      success: true
    }, { status: 201 });
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json(
      { error: 'Failed to import content' },
      { status: 500 }
    );
  }
}

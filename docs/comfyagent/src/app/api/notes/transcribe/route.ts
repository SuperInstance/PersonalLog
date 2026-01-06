import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Transcribe audio to text using ASR (Speech-to-Text)
 */
export async function POST(request: NextRequest) {
  try {
    const { noteId, audioData, mimeType } = await request.json();

    if (!noteId || !audioData) {
      return NextResponse.json(
        { error: 'Note ID and audio data are required' },
        { status: 400 }
      );
    }

    // Decode base64 audio data
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Use ASR skill for transcription
    const zai = await ZAI.create();

    const transcriptionResult = await zai.asr.transcribe({
      audio: audioBuffer.toString('base64'),
      mimeType: mimeType || 'audio/wav'
    });

    const transcriptionText = transcriptionResult.text || '';

    // Store transcription in note file
    await db.noteFile.create({
      data: {
        noteId,
        name: `Transcription_${Date.now()}`,
        type: 'audio',
        sourceType: 'asr_transcript',
        fileSize: audioBuffer.length,
        mimeType,
        audioDuration: transcriptionResult.duration,
        transcriptionText
      }
    });

    // Update note's content to include transcription
    const note = await db.note.findUnique({
      where: { id: noteId }
    });

    if (note) {
      await db.note.update({
        where: { id: noteId },
        data: {
          content: `${note.content}\n\n## Transcription\n\n${transcriptionText}`,
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      transcription: {
        text: transcriptionText,
        duration: transcriptionResult.duration,
        fileId: transcriptionResult.fileId
      }
    });

  } catch (error) {
    console.error('STT API error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

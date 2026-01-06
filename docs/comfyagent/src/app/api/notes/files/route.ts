import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addFileToNote, getNoteById } from '@/lib/notes-service';
import {
  logger,
  logApiRequest,
  logApiResponse,
  logApiError
} from '@/lib/logger';
import { validateFileUpload } from '@/lib/validation';
import { uploadRateLimiter, createValidationErrorResponse, createInternalErrorResponse, createNotFoundResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const noteId = searchParams.get('noteId');

    logApiRequest('/api/notes/files', 'GET', { noteId });

    if (!noteId) {
      return createValidationErrorResponse('Note ID is required');
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      include: {
        files: true
      }
    });

    if (!note) {
      return createNotFoundResponse('Note not found');
    }

    logApiResponse('/api/notes/files', 'GET', 200, Date.now() - startTime);

    return NextResponse.json({ files: note.files || [] });
  } catch (error) {
    logApiError('/api/notes/files', 'GET', error);
    return createInternalErrorResponse('Failed to fetch note files');
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const clientId = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const rateCheck = await uploadRateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      return createRateLimitResponse(rateCheck.resetTime, clientId);
    }

    const { noteId, name, type, fileData, fileSize, mimeType, sourceType, sourceUrl, transcriptionText } = await request.json();

    logApiRequest('/api/notes/files', 'POST', { noteId, name, type, clientId });

    // Validate file data
    const fileValidation = validateFileUpload({
      file: new File([fileData || ''], name, { type: mimeType }),
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'audio/wav', 'audio/mpeg', 'video/mp4', 'video/webm']
    });

    if (!fileValidation.isValid) {
      logger.warn(`File validation failed: ${fileValidation.error}`, { noteId, name });
      return createValidationErrorResponse(fileValidation.error || 'Invalid file');
    }

    if (!noteId || !name) {
      return createValidationErrorResponse('Note ID, name, and type are required');
    }

    // Handle transcription text for audio files
    let audioDuration: number | undefined;
    if (type === 'audio' && transcriptionText) {
      // Estimate duration (rough calculation: ~150 words per minute)
      const wordCount = transcriptionText.split(/\s+/).length;
      audioDuration = (wordCount / 150) * 60; // Duration in seconds
    }

    const file = await db.noteFile.create({
      data: {
        noteId,
        name,
        type,
        filePath: undefined, // For now, not storing file path
        fileSize: fileValidation.value?.size,
        mimeType,
        sourceType: sourceType || 'manual',
        sourceUrl,
        audioDuration,
        transcriptionText
      }
    });

    await db.note.update({
      where: { id: noteId },
      data: { updatedAt: new Date() }
    });

    logger.info(`File uploaded to note: ${noteId}`, {
      fileId: file.id,
      name,
      type,
      sourceType
    });

    logApiResponse('/api/notes/files', 'POST', 201, Date.now() - startTime);

    return NextResponse.json({
      file,
      message: 'File attached successfully'
    }, {
      status: 201,
      headers: {
        'X-Resource-ID': file.id
      }
    });
  } catch (error) {
    logApiError('/api/notes/files', 'POST', error);
    return createInternalErrorResponse('Failed to add file to note');
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    logApiRequest('/api/notes/files', 'DELETE', { id });

    if (!id) {
      return createValidationErrorResponse('File ID is required');
    }

    await db.noteFile.delete({
      where: { id }
    });

    logger.info(`File deleted: ${id}`);

    logApiResponse('/api/notes/files', 'DELETE', 200, Date.now() - startTime);

    return NextResponse.json({ success: true });
  } catch (error) {
    logApiError('/api/notes/files', 'DELETE', error);
    return createInternalErrorResponse('Failed to delete file');
  }
}

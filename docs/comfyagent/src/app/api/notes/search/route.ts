import { NextRequest, NextResponse } from 'next/server';
import { searchNotes, getAllFolders, getAllTags } from '@/lib/notes-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const projectId = searchParams.get('projectId');
    const folder = searchParams.get('folder');
    const tags = searchParams.get('tags');
    const limit = searchParams.get('limit');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const notes = await searchNotes(query, {
      projectId: projectId || undefined,
      folder: folder || undefined,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? parseInt(limit) : 20
    });

    return NextResponse.json({
      notes,
      total: notes.length,
      query,
      filters: { projectId, folder, tags, limit }
    });
  } catch (error) {
    console.error('Notes Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search notes' },
      { status: 500 }
    );
  }
}

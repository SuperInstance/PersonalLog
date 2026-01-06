import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');
    const includePinned = searchParams.get('pinned') === 'true';

    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (folder && folder !== 'all' && folder !== 'pinned') {
      where.folder = folder;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } }
      ];
    }

    if (includePinned) {
      where.isPinned = true;
    }

    const notes = await db.note.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' }
      ],
      include: {
        noteFiles: true,
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ notes, total: notes.length });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, description, tags, folder, projectId, isPinned } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const wordCount = content.split(/\s+/).length;

    const note = await db.note.create({
      data: {
        title,
        content,
        description: description || null,
        tags: tags ? JSON.stringify(tags) : null,
        folder: folder || 'general',
        projectId: projectId || null,
        isPinned: isPinned || false,
        wordCount,
        order: 0
      }
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project assets
    const assets = await db.generatedAsset.findMany({
      where: { projectId }
    });

    // Get workflows
    const workflows = await db.workflow.findMany({
      where: { projectId }
    });

    // Organize into folders (simplified structure)
    const folders = [
      {
        id: 'generated-images',
        name: 'Generated Images',
        assets: assets.filter(a => a.name.match(/\.(png|jpg|jpeg|webp)$/i)).map(a => ({
          id: a.id,
          name: a.name,
          type: 'image',
          path: a.filePath,
          size: a.parameters ? JSON.stringify(a.parameters).length + ' bytes' : undefined,
          createdAt: a.createdAt.toISOString()
        }))
      },
      {
        id: 'prompts',
        name: 'Prompts',
        assets: assets.map(a => ({
          id: a.id,
          name: a.name.replace(/\.(png|jpg|jpeg|webp)$/i, ''),
          type: 'prompt',
          path: a.filePath,
          createdAt: a.createdAt.toISOString(),
          prompt: a.parameters ? JSON.parse(a.parameters).prompt : undefined
        }))
      },
      {
        id: 'workflows',
        name: 'Workflows',
        assets: workflows.map(w => ({
          id: w.id,
          name: w.name,
          type: 'workflow',
          path: `/workflow/${w.id}`,
          createdAt: w.createdAt.toISOString()
        }))
      }
    ];

    return NextResponse.json({ folders });

  } catch (error) {
    console.error('Assets API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

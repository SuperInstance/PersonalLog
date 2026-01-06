import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callProjectPersonality, getInfluencingProjects } from '@/lib/cross-project-service';
import { retrieveContext } from '@/lib/rag-service';

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

    const influencingProjects = await getInfluencingProjects(projectId);
    return NextResponse.json({ references: influencingProjects });
  } catch (error) {
    console.error('Cross-Project API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch references' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sourceProjectId, targetProjectId, query } = await request.json();

    if (!sourceProjectId || !query) {
      return NextResponse.json(
        { error: 'Source project ID and query are required' },
        { status: 400 }
      );
    }

    // Call project personality as influence agent
    const influence = await callProjectPersonality(
      sourceProjectId,
      query,
      { targetProjectId }
    );

    return NextResponse.json({ influence });
  } catch (error) {
    console.error('Cross-Project API error:', error);
    return NextResponse.json(
      { error: 'Failed to get influence' },
      { status: 500 }
    );
  }
}

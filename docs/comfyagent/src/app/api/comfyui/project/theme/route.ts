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

    const project = await db.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const theme = {
      theme: project.theme,
      primaryColor: project.primaryColor,
      secondaryColor: project.secondaryColor,
      accentColor: project.accentColor,
      colorPalette: project.colorPalette,
      artStyle: project.artStyle,
      mood: project.mood,
      composition: project.composition,
      lighting: project.lighting,
      projectType: project.projectType,
      targetAudience: project.targetAudience,
      medium: project.medium
    };

    return NextResponse.json({ theme });
  } catch (error) {
    console.error('Theme API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, theme } = await request.json();

    if (!projectId || !theme) {
      return NextResponse.json(
        { error: 'Project ID and theme data are required' },
        { status: 400 }
      );
    }

    // Generate personality summary from theme data
    const personalitySummary = generatePersonalitySummary(theme);

    const updated = await db.project.update({
      where: { id: projectId },
      data: {
        ...theme,
        colorPalette: theme.colorPalette ? JSON.stringify(theme.colorPalette) : null,
        personalitySummary
      }
    });

    return NextResponse.json({
      success: true,
      project: updated
    });
  } catch (error) {
    console.error('Theme API error:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

function generatePersonalitySummary(theme: any): string {
  const traits = [];

  if (theme.theme) traits.push(theme.theme);
  if (theme.artStyle) traits.push(theme.artStyle);
  if (theme.mood) traits.push(theme.mood);
  if (theme.composition) traits.push(theme.composition);

  if (traits.length === 0) return '';
  return `A ${traits.join(' ')} style ${theme.projectType ? theme.projectType.replace('_', ' ') : ''} project`;
}

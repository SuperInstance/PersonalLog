import { NextRequest, NextResponse } from 'next/server';
import { WORKFLOW_TEMPLATES, getTemplateById, getTemplatesByCategory, searchTemplates } from '@/lib/workflow-templates';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as any;
    const style = searchParams.get('style') as any;
    const difficulty = searchParams.get('difficulty') as any;
    const search = searchParams.get('search');
    const templateId = searchParams.get('id');

    // Get specific template by ID
    if (templateId) {
      const template = getTemplateById(templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ template });
    }

    // Filter templates
    let templates = WORKFLOW_TEMPLATES;

    if (category) {
      templates = getTemplatesByCategory(category);
    }

    if (style) {
      templates = templates.filter(t => t.style === style);
    }

    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }

    if (search) {
      templates = searchTemplates(search);
    }

    return NextResponse.json({
      templates,
      total: templates.length,
      filters: {
        category,
        style,
        difficulty,
        search
      }
    });

  } catch (error) {
    console.error('Workflow Templates API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

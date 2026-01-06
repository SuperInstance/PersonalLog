import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await db.userMemory.update({
      where: { id },
      data: {
        confidence: 0.5,
        source: 'observation'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Memory reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset memory' },
      { status: 500 }
    );
  }
}

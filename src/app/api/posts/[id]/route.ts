import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const { id } = params;

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const analysis = db.prepare('SELECT * FROM analysis_results WHERE post_id = ?').get(id);
    const reviews = db.prepare('SELECT * FROM review_actions WHERE post_id = ? ORDER BY created_at DESC').all(id);

    return NextResponse.json({
      post,
      analysis,
      reviews,
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

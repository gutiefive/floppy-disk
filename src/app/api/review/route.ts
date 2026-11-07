import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import type { ReviewActionType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { postId, actionType, notes } = await request.json();

    if (!postId || !actionType) {
      return NextResponse.json({ error: 'Missing postId or actionType' }, { status: 400 });
    }

    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO review_actions (id, post_id, action_type, notes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const reviewId = uuidv4();
    stmt.run(reviewId, postId, actionType as ReviewActionType, notes || null, Date.now());

    return NextResponse.json({ success: true, reviewId });
  } catch (error) {
    console.error('Review action error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to save review' 
    }, { status: 500 });
  }
}

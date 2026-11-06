import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Post } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const searchParams = request.nextUrl.searchParams;
    
    const platform = searchParams.get('platform');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT p.*, 
             a.priority as analysis_priority,
             a.priority_score,
             a.confidence,
             a.suggested_action,
             r.action_type as review_status
      FROM posts p
      LEFT JOIN analysis_results a ON p.id = a.post_id
      LEFT JOIN review_actions r ON p.id = r.post_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (platform) {
      query += ' AND p.platform = ?';
      params.push(platform);
    }

    if (priority) {
      query += ' AND a.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY COALESCE(a.priority_score, 0) DESC, p.timestamp DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = db.prepare(query).all(...params) as any[];

    const countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      LEFT JOIN analysis_results a ON p.id = a.post_id
      WHERE 1=1
      ${platform ? 'AND p.platform = ?' : ''}
      ${priority ? 'AND a.priority = ?' : ''}
    `;
    
    const countParams: any[] = [];
    if (platform) countParams.push(platform);
    if (priority) countParams.push(priority);
    
    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return NextResponse.json({
      posts,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

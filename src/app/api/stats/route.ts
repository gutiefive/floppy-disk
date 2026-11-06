import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };
    
    const analyzedPosts = db.prepare('SELECT COUNT(*) as count FROM analysis_results').get() as { count: number };
    
    const priorityCounts = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM analysis_results 
      GROUP BY priority
    `).all() as Array<{ priority: string; count: number }>;

    const platformCounts = db.prepare(`
      SELECT platform, COUNT(*) as count 
      FROM posts 
      GROUP BY platform
    `).all() as Array<{ platform: string; count: number }>;

    const reviewCounts = db.prepare(`
      SELECT action_type, COUNT(*) as count 
      FROM review_actions 
      GROUP BY action_type
    `).all() as Array<{ action_type: string; count: number }>;

    const dateRange = db.prepare(`
      SELECT 
        MIN(timestamp) as min_date,
        MAX(timestamp) as max_date
      FROM posts
      WHERE timestamp IS NOT NULL
    `).get() as { min_date: number | null; max_date: number | null };

    const missingDates = db.prepare(`
      SELECT COUNT(*) as count 
      FROM posts 
      WHERE timestamp IS NULL
    `).get() as { count: number };

    return NextResponse.json({
      totalPosts: totalPosts.count,
      analyzedPosts: analyzedPosts.count,
      unanalyzedPosts: totalPosts.count - analyzedPosts.count,
      priorityCounts: priorityCounts.reduce((acc, { priority, count }) => {
        acc[priority] = count;
        return acc;
      }, {} as Record<string, number>),
      platformCounts: platformCounts.reduce((acc, { platform, count }) => {
        acc[platform] = count;
        return acc;
      }, {} as Record<string, number>),
      reviewCounts: reviewCounts.reduce((acc, { action_type, count }) => {
        acc[action_type] = count;
        return acc;
      }, {} as Record<string, number>),
      dateRange: {
        earliest: dateRange.min_date,
        latest: dateRange.max_date,
      },
      missingDates: missingDates.count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}

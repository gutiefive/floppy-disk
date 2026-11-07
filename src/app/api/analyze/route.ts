import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { OllamaProvider } from '@/analysis/ollama-provider';
import type { Post } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { postIds, batchSize = 10 } = await request.json();

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json({ error: 'Invalid postIds' }, { status: 400 });
    }

    const db = getDb();
    const provider = new OllamaProvider();

    const health = await provider.checkHealth();
    if (!health.available) {
      return NextResponse.json(
        { error: 'Ollama is not available or model is not loaded' },
        { status: 503 }
      );
    }

    const posts = db
      .prepare(`SELECT * FROM posts WHERE id IN (${postIds.map(() => '?').join(',')})`)
      .all(...postIds) as Post[];

    let analyzed = 0;
    let failed = 0;

    for (const post of posts) {
      try {
        const existing = db
          .prepare('SELECT id FROM analysis_results WHERE post_id = ?')
          .get(post.id);
        
        if (existing) {
          continue;
        }

        const result = await provider.analyzePost(post);
        
        const stmt = db.prepare(`
          INSERT INTO analysis_results (
            id, post_id, provider, model_name, model_version,
            analyzed_at, priority, priority_score,
            professional_assessment, faith_context_assessment,
            supporting_excerpts, concerns, severity, confidence,
            context_notes, uncertainty, policy_version,
            suggested_action, media_reviewed, raw_output
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          uuidv4(),
          post.id,
          'ollama',
          health.model,
          null,
          Date.now(),
          result.priority,
          result.priority_score || null,
          JSON.stringify(result.professional_assessment),
          JSON.stringify(result.faith_context_assessment),
          JSON.stringify(result.supporting_excerpts),
          result.specific_concern,
          result.severity,
          result.confidence,
          result.context_notes,
          result.uncertainty,
          null,
          result.suggested_action,
          result.media_reviewed ? 1 : 0,
          null
        );

        analyzed++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to analyze post ${post.id}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      analyzed,
      failed,
      total: posts.length,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}

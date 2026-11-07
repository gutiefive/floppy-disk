import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { FacebookConnector } from '@/connectors/facebook';
import { TwitterConnector } from '@/connectors/twitter';
import type { Import } from '@/types';

export async function GET() {
  try {
    const db = getDb();
    const imports = db.prepare('SELECT * FROM imports ORDER BY started_at DESC').all() as Import[];
    return NextResponse.json(imports);
  } catch (error) {
    console.error('Error fetching imports:', error);
    return NextResponse.json({ error: 'Failed to fetch imports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as string;

    if (!file || !platform) {
      return NextResponse.json({ error: 'Missing file or platform' }, { status: 400 });
    }

    const importId = uuidv4();
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO imports (id, platform, source_type, filename, started_at, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(importId, platform, 'file_upload', file.name, Date.now(), 'processing');

    const buffer = Buffer.from(await file.arrayBuffer());
    
    let processed = 0;
    let failed = 0;

    if (platform === 'facebook') {
      const connector = new FacebookConnector(importId);
      const result = await connector.processFile(buffer, file.name);
      processed = result.processed;
      failed = result.failed;
    } else if (platform === 'twitter') {
      const connector = new TwitterConnector(importId);
      const result = await connector.processFile(buffer, file.name);
      processed = result.processed;
      failed = result.failed;
    } else {
      throw new Error(`Platform ${platform} not yet implemented`);
    }

    const updateStmt = db.prepare(`
      UPDATE imports 
      SET completed_at = ?, status = ?, total_records = ?, processed_records = ?, failed_records = ?
      WHERE id = ?
    `);
    
    updateStmt.run(Date.now(), 'completed', processed + failed, processed, failed, importId);

    return NextResponse.json({ 
      success: true, 
      importId,
      processed,
      failed 
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Import failed' 
    }, { status: 500 });
  }
}

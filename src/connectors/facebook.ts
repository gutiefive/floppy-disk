import JSZip from 'jszip';
import { Parser } from 'htmlparser2';
import { v4 as uuidv4 } from 'uuid';
import type { Post, RecordType } from '@/types';
import { getDb } from '@/lib/db';

interface FacebookPost {
  timestamp?: number;
  data?: Array<{
    post?: string;
    update_timestamp?: number;
  }>;
  title?: string;
  attachments?: Array<{
    data?: Array<{
      external_context?: { url?: string };
      media?: { uri?: string; description?: string; title?: string };
    }>;
  }>;
}

interface FacebookComment {
  timestamp?: number;
  comment?: {
    comment?: string;
    timestamp?: number;
    author?: string;
  };
  data?: Array<{
    comment?: {
      comment?: string;
      timestamp?: number;
      author?: string;
    };
  }>;
  title?: string;
}

export class FacebookConnector {
  private importId: string;
  private db: ReturnType<typeof getDb>;

  constructor(importId: string) {
    this.importId = importId;
    this.db = getDb();
  }

  async processFile(buffer: Buffer, filename: string): Promise<{ processed: number; failed: number }> {
    const ext = filename.toLowerCase().split('.').pop();
    
    if (ext === 'zip') {
      return await this.processZip(buffer);
    } else if (ext === 'json') {
      return await this.processJSON(buffer);
    } else if (ext === 'html' || ext === 'htm') {
      return await this.processHTML(buffer);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async processZip(buffer: Buffer): Promise<{ processed: number; failed: number }> {
    const zip = await JSZip.loadAsync(buffer);
    let processed = 0;
    let failed = 0;

    const files = Object.keys(zip.files).filter(name => 
      !zip.files[name].dir && 
      (name.endsWith('.json') || name.endsWith('.html') || name.endsWith('.htm'))
    );

    for (const filename of files) {
      try {
        const file = zip.files[filename];
        const content = await file.async('nodebuffer');
        const result = filename.endsWith('.json') 
          ? await this.processJSON(content)
          : await this.processHTML(content);
        processed += result.processed;
        failed += result.failed;
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  private async processJSON(buffer: Buffer): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      const text = buffer.toString('utf-8');
      const data = JSON.parse(text);

      if (Array.isArray(data)) {
        for (const item of data) {
          try {
            await this.processJSONItem(item);
            processed++;
          } catch (error) {
            console.error('Error processing item:', error);
            failed++;
          }
        }
      } else if (typeof data === 'object') {
        if (data.posts || data.status_updates) {
          const items = data.posts || data.status_updates;
          for (const item of items) {
            try {
              await this.processJSONItem(item);
              processed++;
            } catch (error) {
              failed++;
            }
          }
        } else if (data.comments) {
          for (const item of data.comments) {
            try {
              await this.processCommentItem(item);
              processed++;
            } catch (error) {
              failed++;
            }
          }
        } else {
          try {
            await this.processJSONItem(data);
            processed++;
          } catch (error) {
            failed++;
          }
        }
      }
    } catch (error) {
      console.error('JSON parse error:', error);
      throw new Error('Invalid JSON format');
    }

    return { processed, failed };
  }

  private async processJSONItem(item: FacebookPost) {
    const postId = uuidv4();
    const now = Date.now();

    let text = '';
    let timestamp: number | null = null;
    const warnings: string[] = [];

    if (item.data && Array.isArray(item.data) && item.data[0]) {
      text = this.decodeUnicode(item.data[0].post || '');
      timestamp = item.data[0].update_timestamp || item.timestamp || null;
    } else if (item.title) {
      text = this.decodeUnicode(item.title);
      timestamp = item.timestamp || null;
    }

    if (!timestamp) {
      warnings.push('Missing timestamp');
    }

    if (!text && !item.attachments) {
      warnings.push('No text content or attachments');
    }

    const hasMedia = !!(item.attachments && item.attachments.length > 0);
    const mediaMetadata = hasMedia ? JSON.stringify(item.attachments) : null;

    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, import_id, platform, platform_id, record_type,
        author_name, text, timestamp, timezone, permalink, permalink_status,
        visibility, parent_id, shared_content, owner_commentary,
        has_media, media_metadata, conversation_context, import_warnings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      postId,
      this.importId,
      'facebook',
      null,
      'post' as RecordType,
      null,
      text || null,
      timestamp,
      null,
      null,
      'unknown',
      null,
      null,
      null,
      null,
      hasMedia ? 1 : 0,
      mediaMetadata,
      null,
      warnings.length > 0 ? JSON.stringify(warnings) : null,
      now
    );
  }

  private async processCommentItem(item: FacebookComment) {
    const commentId = uuidv4();
    const now = Date.now();

    let text = '';
    let timestamp: number | null = null;
    let author: string | null = null;
    const warnings: string[] = [];

    if (item.comment) {
      text = this.decodeUnicode(item.comment.comment || '');
      timestamp = item.comment.timestamp || item.timestamp || null;
      author = item.comment.author || null;
    } else if (item.data && Array.isArray(item.data) && item.data[0]?.comment) {
      text = this.decodeUnicode(item.data[0].comment.comment || '');
      timestamp = item.data[0].comment.timestamp || item.timestamp || null;
      author = item.data[0].comment.author || null;
    } else if (item.title) {
      text = this.decodeUnicode(item.title);
      timestamp = item.timestamp || null;
    }

    if (!timestamp) {
      warnings.push('Missing timestamp');
    }

    if (!text) {
      warnings.push('No text content');
    }

    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, import_id, platform, platform_id, record_type,
        author_name, text, timestamp, timezone, permalink, permalink_status,
        visibility, parent_id, shared_content, owner_commentary,
        has_media, media_metadata, conversation_context, import_warnings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      commentId,
      this.importId,
      'facebook',
      null,
      'comment' as RecordType,
      author,
      text || null,
      timestamp,
      null,
      null,
      'unknown',
      null,
      null,
      null,
      null,
      0,
      null,
      null,
      warnings.length > 0 ? JSON.stringify(warnings) : null,
      now
    );
  }

  private async processHTML(buffer: Buffer): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      const html = buffer.toString('utf-8');
      const posts = this.extractPostsFromHTML(html);

      for (const post of posts) {
        try {
          const postId = uuidv4();
          const now = Date.now();
          const warnings: string[] = ['Extracted from HTML export'];

          const stmt = this.db.prepare(`
            INSERT INTO posts (
              id, import_id, platform, platform_id, record_type,
              author_name, text, timestamp, timezone, permalink, permalink_status,
              visibility, parent_id, shared_content, owner_commentary,
              has_media, media_metadata, conversation_context, import_warnings, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          stmt.run(
            postId,
            this.importId,
            'facebook',
            null,
            'post' as RecordType,
            null,
            post.text || null,
            post.timestamp || null,
            null,
            null,
            'unknown',
            null,
            null,
            null,
            null,
            0,
            null,
            null,
            JSON.stringify(warnings),
            now
          );
          processed++;
        } catch (error) {
          failed++;
        }
      }
    } catch (error) {
      console.error('HTML parse error:', error);
      throw new Error('Invalid HTML format');
    }

    return { processed, failed };
  }

  private extractPostsFromHTML(html: string): Array<{ text: string; timestamp: number | null }> {
    const posts: Array<{ text: string; timestamp: number | null }> = [];
    let currentText = '';
    let inPostContent = false;

    const parser = new Parser({
      onopentag(name, attributes) {
        if (name === 'div' && attributes.class?.includes('post')) {
          inPostContent = true;
        }
      },
      ontext(text) {
        if (inPostContent && text.trim()) {
          currentText += text.trim() + ' ';
        }
      },
      onclosetag(name) {
        if (name === 'div' && inPostContent && currentText) {
          posts.push({
            text: currentText.trim(),
            timestamp: null,
          });
          currentText = '';
          inPostContent = false;
        }
      },
    });

    parser.write(html);
    parser.end();

    return posts;
  }

  private decodeUnicode(text: string): string {
    try {
      return text.replace(/\\u[\dA-F]{4}/gi, (match) => {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      });
    } catch {
      return text;
    }
  }

  async checkDuplicate(platformId: string | null, text: string, timestamp: number | null): Promise<boolean> {
    if (platformId) {
      const stmt = this.db.prepare('SELECT id FROM posts WHERE platform = ? AND platform_id = ? LIMIT 1');
      const result = stmt.get('facebook', platformId);
      if (result) return true;
    }

    if (text && timestamp) {
      const stmt = this.db.prepare(
        'SELECT id FROM posts WHERE platform = ? AND text = ? AND timestamp = ? LIMIT 1'
      );
      const result = stmt.get('facebook', text, timestamp);
      if (result) return true;
    }

    return false;
  }
}

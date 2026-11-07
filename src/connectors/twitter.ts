import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { Post, RecordType } from '@/types';
import { getDb } from '@/lib/db';

interface TwitterTweet {
  tweet: {
    id_str: string;
    full_text?: string;
    text?: string;
    created_at: string;
    retweet_count?: number;
    favorite_count?: number;
    in_reply_to_status_id_str?: string;
    in_reply_to_user_id_str?: string;
    in_reply_to_screen_name?: string;
    retweeted_status?: any;
    entities?: {
      hashtags?: Array<{ text: string }>;
      urls?: Array<{ url: string; expanded_url: string }>;
      user_mentions?: Array<{ screen_name: string }>;
    };
  };
}

interface TwitterArchiveItem {
  tweet: TwitterTweet['tweet'];
}

export class TwitterConnector {
  private importId: string;
  private db: ReturnType<typeof getDb>;
  private username: string | null = null;

  constructor(importId: string) {
    this.importId = importId;
    this.db = getDb();
  }

  async processFile(buffer: Buffer, filename: string): Promise<{ processed: number; failed: number }> {
    const ext = filename.toLowerCase().split('.').pop();
    
    if (ext === 'zip') {
      return await this.processZip(buffer);
    } else if (ext === 'js' || ext === 'json') {
      return await this.processJSONorJS(buffer);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  private async processZip(buffer: Buffer): Promise<{ processed: number; failed: number }> {
    const zip = await JSZip.loadAsync(buffer);
    let processed = 0;
    let failed = 0;

    // First, try to extract username from account.js or manifest.json
    await this.extractUsername(zip);

    // Look for tweets files - common patterns:
    // - data/tweets.js
    // - data/tweet.js  
    // - data/tweets-part1.js, tweets-part2.js, etc.
    // - tweets.js at root
    const tweetFiles = Object.keys(zip.files).filter(name => 
      !zip.files[name].dir && 
      (name.match(/tweets?\.js$/i) || name.match(/tweets?-part\d+\.js$/i) || name.match(/data\/tweets?.*\.js$/i))
    );

    if (tweetFiles.length === 0) {
      throw new Error('No tweet files found in archive. Expected files like data/tweets.js');
    }

    for (const filename of tweetFiles) {
      try {
        const file = zip.files[filename];
        const content = await file.async('nodebuffer');
        const result = await this.processJSONorJS(content);
        processed += result.processed;
        failed += result.failed;
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        failed++;
      }
    }

    return { processed, failed };
  }

  private async extractUsername(zip: JSZip): Promise<void> {
    // Try to get username from account.js
    try {
      const accountFile = zip.files['data/account.js'] || zip.files['account.js'];
      if (accountFile) {
        const content = await accountFile.async('text');
        const jsonStr = this.extractJSON(content);
        const data = JSON.parse(jsonStr);
        
        if (data && data[0]?.account?.username) {
          this.username = data[0].account.username;
        } else if (data && data.account?.username) {
          this.username = data.account.username;
        }
      }
    } catch (error) {
      // Username extraction is optional, continue without it
      console.warn('Could not extract username from archive');
    }
  }

  private async processJSONorJS(buffer: Buffer): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      const text = buffer.toString('utf-8');
      const jsonStr = this.extractJSON(text);
      const data = JSON.parse(jsonStr);

      // Handle different archive formats
      let tweets: TwitterArchiveItem[] = [];

      if (Array.isArray(data)) {
        tweets = data;
      } else if (data.tweets && Array.isArray(data.tweets)) {
        tweets = data.tweets;
      } else if (typeof data === 'object') {
        // Single tweet object
        tweets = [data];
      }

      for (const item of tweets) {
        try {
          await this.processTweet(item);
          processed++;
        } catch (error) {
          console.error('Error processing tweet:', error);
          failed++;
        }
      }
    } catch (error) {
      console.error('JSON/JS parse error:', error);
      throw new Error('Invalid Twitter archive format');
    }

    return { processed, failed };
  }

  private extractJSON(content: string): string {
    // Twitter archives often have JS assignments like:
    // window.YTD.tweets.part0 = [ ... ]
    // window.YTD.tweet.part0 = [ ... ]
    // We need to extract just the JSON array part

    let jsonStr = content.trim();

    // Remove BOM if present
    if (jsonStr.charCodeAt(0) === 0xFEFF) {
      jsonStr = jsonStr.slice(1);
    }

    // Check for window.YTD pattern
    const ytdMatch = jsonStr.match(/window\.YTD\.[^=]+=\s*(\[[\s\S]*\])/);
    if (ytdMatch) {
      return ytdMatch[1];
    }

    // Check for var assignment pattern
    const varMatch = jsonStr.match(/var\s+\w+\s*=\s*(\[[\s\S]*\])/);
    if (varMatch) {
      return varMatch[1];
    }

    // If it's already JSON, return as-is
    return jsonStr;
  }

  private async processTweet(item: TwitterArchiveItem | TwitterTweet) {
    const tweet = 'tweet' in item ? item.tweet : item;
    
    if (!tweet || !tweet.id_str) {
      throw new Error('Invalid tweet structure');
    }

    const postId = uuidv4();
    const now = Date.now();
    const warnings: string[] = [];

    // Extract text
    let text = tweet.full_text || tweet.text || '';
    
    if (!text) {
      warnings.push('No text content');
    }

    // Parse timestamp
    let timestamp: number | null = null;
    try {
      if (tweet.created_at) {
        // Twitter format: "Wed Oct 10 20:19:24 +0000 2018"
        timestamp = new Date(tweet.created_at).getTime();
        if (isNaN(timestamp)) {
          timestamp = null;
          warnings.push('Invalid timestamp format');
        }
      } else {
        warnings.push('Missing timestamp');
      }
    } catch (error) {
      warnings.push('Failed to parse timestamp');
    }

    // Determine record type
    let recordType: RecordType = 'post';
    let parentId: string | null = null;
    
    if (tweet.in_reply_to_status_id_str) {
      recordType = 'reply';
      parentId = tweet.in_reply_to_status_id_str;
    } else if (tweet.retweeted_status) {
      recordType = 'share';
    }

    // Construct permalink only if we have an ID
    let permalink: string | null = null;
    if (tweet.id_str) {
      if (this.username) {
        permalink = `https://twitter.com/${this.username}/status/${tweet.id_str}`;
      } else {
        // Generic format without username
        permalink = `https://twitter.com/i/web/status/${tweet.id_str}`;
      }
    }

    // Extract conversation context
    let conversationContext: string | null = null;
    if (tweet.in_reply_to_screen_name) {
      conversationContext = `Reply to @${tweet.in_reply_to_screen_name}`;
    }

    // Handle retweets - separate RT content from user commentary
    let sharedContent: string | null = null;
    let ownerCommentary: string | null = null;
    
    if (tweet.retweeted_status) {
      sharedContent = JSON.stringify({
        text: tweet.retweeted_status.full_text || tweet.retweeted_status.text,
        user: tweet.retweeted_status.user?.screen_name,
        id: tweet.retweeted_status.id_str,
      });
      
      // Check if there's additional commentary (quote tweet)
      if (text && !text.startsWith('RT @')) {
        ownerCommentary = text;
      }
    }

    // Check for duplicates
    const isDuplicate = await this.checkDuplicate(tweet.id_str, text, timestamp);
    if (isDuplicate) {
      return; // Skip duplicate
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
      postId,
      this.importId,
      'twitter',
      tweet.id_str,
      recordType,
      this.username || null,
      text || null,
      timestamp,
      null,
      permalink,
      permalink ? 'recognized' : 'unavailable',
      'public', // Twitter archives are generally public tweets
      parentId,
      sharedContent,
      ownerCommentary,
      0, // Media handling not implemented yet
      null,
      conversationContext,
      warnings.length > 0 ? JSON.stringify(warnings) : null,
      now
    );
  }

  async checkDuplicate(platformId: string, text: string, timestamp: number | null): Promise<boolean> {
    if (platformId) {
      const stmt = this.db.prepare('SELECT id FROM posts WHERE platform = ? AND platform_id = ? LIMIT 1');
      const result = stmt.get('twitter', platformId);
      if (result) return true;
    }

    if (text && timestamp) {
      const stmt = this.db.prepare(
        'SELECT id FROM posts WHERE platform = ? AND text = ? AND timestamp = ? LIMIT 1'
      );
      const result = stmt.get('twitter', text, timestamp);
      if (result) return true;
    }

    return false;
  }
}

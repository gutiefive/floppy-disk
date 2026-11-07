# X/Twitter Archive Import Guide

## Overview

floppy-disk supports importing your X/Twitter archive to review your tweet history before employer background checks. All processing happens locally on your machine.

## Requesting Your X/Twitter Archive

### Steps to Download

1. Log in to X/Twitter (x.com or twitter.com)
2. Go to **Settings and privacy**
3. Click **Your account**
4. Click **Download an archive of your data**
5. Enter your password to confirm
6. Click **Request archive**

### What to Expect

- You'll receive an email when your archive is ready (usually 24 hours)
- The download link in the email is valid for a few days
- The archive is a ZIP file (typically 10MB - 1GB depending on your history)
- The archive contains your tweets, profile info, and other account data

For official help: https://help.x.com/en/managing-your-account/how-to-download-your-x-archive

## Archive Format

### Standard Archive Structure

X/Twitter archives typically contain:

```
twitter-archive.zip
├── data/
│   ├── account.js          # Your account info (username extracted from here)
│   ├── tweets.js           # Your tweets (main file)
│   ├── tweet.js            # Alternate name in some archives
│   ├── tweets-part1.js     # For large archives, tweets split into parts
│   ├── tweets-part2.js
│   └── ...
├── assets/
└── Your archive.html       # Web viewer (not used by importer)
```

### Tweet File Format

Tweet files are JavaScript files, not pure JSON. Example:

```javascript
window.YTD.tweets.part0 = [
  {
    "tweet": {
      "id_str": "1234567890123456789",
      "full_text": "Your tweet text here",
      "created_at": "Wed Jan 15 14:30:00 +0000 2020",
      "retweet_count": 5,
      "favorite_count": 23
    }
  }
]
```

## What Gets Imported

### ✅ Imported Content

- **Original Tweets**: Your own tweets
- **Replies**: Your replies to others (marked with reply context)
- **Retweets**: Retweets with your commentary (quote tweets)
- **Text Content**: Full tweet text
- **Timestamps**: When each tweet was posted
- **Tweet IDs**: For permalink construction

### ❌ Not Imported

- **Likes/Favorites**: Not included (no tweet text to analyze)
- **Direct Messages**: Skipped (private communications)
- **Account Settings**: Not relevant to content review
- **Follower Lists**: Not content to review
- **Ad Impressions**: Not your content

## Supported File Formats

### ZIP Archives (Recommended)

Upload the entire ZIP file downloaded from X:
- Automatically extracts and finds tweet files
- Handles multi-part archives
- Extracts username for permalinks

### Individual JS Files

Upload individual `tweets.js` or `tweet.js` files:
- Parses `window.YTD.*` JavaScript format
- Works with single-part exports
- Permalinks use generic format if username unavailable

### JSON Files

Upload extracted JSON if you've converted the JS files:
- Must be valid JSON array
- Should contain tweet objects with expected structure

## Import Process

1. **Select Platform**: Choose "X/Twitter" in the import interface
2. **Choose File**: Select your ZIP archive or tweets.js file
3. **Upload**: Click Upload to begin import
4. **Processing**: The importer will:
   - Extract ZIP if needed
   - Find all tweets files
   - Parse JavaScript or JSON format
   - Extract username (if available)
   - Import each tweet as a post
   - Construct permalinks using tweet IDs
   - Detect duplicates to avoid re-importing

5. **Confirmation**: You'll see a summary:
   - Number of tweets processed
   - Number of failures (if any)
   - Import ID for tracking

## Permalink Construction

Permalinks are only created when a tweet ID exists in the archive:

- **With username**: `https://twitter.com/username/status/1234567890123456789`
- **Without username**: `https://twitter.com/i/web/status/1234567890123456789`

Both formats link to the same tweet. The username is extracted from `account.js` in the archive if available.

## Tweet Types

### Regular Tweets
- Imported as "post" record type
- Full text preserved
- Timestamp from archive

### Replies
- Imported as "reply" record type
- Includes context: "Reply to @username"
- Original tweet ID referenced if available

### Retweets
- Imported as "share" record type
- Original tweet content stored separately
- Your commentary preserved (for quote tweets)

## Privacy & Security

### Local Processing Only
- Archives processed on your machine
- No data sent to X/Twitter or external services
- No API keys or passwords required
- No cookies or session tokens collected

### No Auto-Modification
- Import is read-only
- Never deletes or modifies tweets on X/Twitter
- Never posts or replies automatically
- Analysis provides suggestions only

### Data Storage
- Imported tweets stored in local SQLite database
- Database file: `data/floppy-disk.db`
- Not committed to git
- Can be deleted anytime

## Common Issues

### "No tweet files found"
**Solution**: Ensure your ZIP contains `data/tweets.js` or similar. Some archives use different names or structures.

### "Invalid Twitter archive format"
**Solution**: The file may be corrupted or from an unsupported export format. Try re-downloading from X/Twitter.

### Duplicate imports
**Solution**: The system automatically detects and skips duplicates based on tweet ID. It's safe to re-import.

### Missing timestamps
**Solution**: Some very old archives may have incomplete data. Posts without timestamps will show "Unknown date."

### Generic permalinks
**Solution**: If username wasn't extracted, permalinks use the generic format. They still work, just without your username visible.

## Testing Import

A sample fixture is included for testing:

```bash
# Test with sample JSON
curl -X POST http://localhost:3000/api/imports \
  -F "platform=twitter" \
  -F "file=@test-fixtures/twitter-archive-sample.json"

# Test with sample JS
curl -X POST http://localhost:3000/api/imports \
  -F "platform=twitter" \
  -F "file=@test-fixtures/twitter-archive-sample.js"
```

Sample fixtures contain 8 fictional tweets from 2015-2020.

## After Import

Once imported:
1. **View Stats**: Dashboard shows Twitter post count
2. **Filter by Platform**: Select Twitter to see only tweets
3. **Run Analysis**: Use local AI to analyze tweet content
4. **Review Results**: See flagged items sorted by priority
5. **Add Notes**: Track your review decisions

## Limitations

- **Media**: Image/video content not analyzed (text only)
- **Deleted tweets**: Only tweets in your archive are imported
- **Protected tweets**: All imported tweets processed the same way
- **Old archives**: Very old formats may have different structures
- **Large archives**: Multi-part archives are supported but may take time

## Support

If import fails:
1. Check the archive is a valid X/Twitter export
2. Ensure the ZIP or JS file isn't corrupted
3. Try extracting the ZIP manually and uploading individual files
4. Check console logs for specific error messages
5. See USAGE.md for general troubleshooting

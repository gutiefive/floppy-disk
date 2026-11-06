# Socialscrubb Usage Guide

## Overview

Socialscrubb helps you review your own social media history before employers conduct background checks. It identifies posts that may warrant review, but never predicts hiring outcomes or claims posts are "disqualifying."

## Getting Started

### 1. Export Your Facebook Data

1. Go to Facebook Settings → Your Facebook Information
2. Download Your Information → Request Download
3. Choose format: JSON (recommended) or HTML
4. Include: Posts, Comments, Photos
5. Download when ready (may take hours to prepare)

### 2. Import Your Data

1. Open Socialscrubb at `http://localhost:3000`
2. Under "Import Facebook Archive", click "Choose File"
3. Select your Facebook export file (.json, .zip, or .html)
4. Click "Upload"
5. Wait for import to complete (progress shown in notification)

### 3. Analyze Your Posts

1. Once import completes, the dashboard shows unanalyzed posts
2. Under "Analysis Pending", click "Start Analysis"
3. Analysis processes posts in batches using local AI
4. This may take several minutes depending on volume
5. Analysis runs entirely on your local machine

### 4. Review Results

The dashboard shows:
- **Total Posts**: All imported content
- **Analyzed Posts**: Posts that have been reviewed by AI
- **High Priority**: Posts flagged for immediate review
- **Medium Priority**: Posts worth checking

### 5. Filter and Sort

Use filters to view:
- All posts
- High priority items
- Medium priority items  
- Low priority items

Posts are sorted by priority score (highest first).

## Understanding Analysis Results

### Priority Levels

- **High**: Contains content that warrants careful review
- **Medium**: May contain minor concerns worth checking
- **Low**: Minor stylistic or tone considerations
- **None**: No professional concerns identified

### What Gets Flagged

**General Professional Concerns:**
- Threats or violent statements
- Harassment or bullying behavior
- Discriminatory or demeaning content
- Explicit sexual content
- Excessive vulgarity or hostility
- Public employer disparagement
- Confidential information disclosure
- Workplace safety concerns

**Faith-Based Context (for religious organizations):**
- Abuse toward religious communities
- Celebration of harmful conduct
- Potential policy conflicts (when policies provided)

### What Does NOT Get Flagged

- Respectful religious disagreement
- Political viewpoints
- Protected personal characteristics
- Ordinary respectful expression
- Quoted content being condemned
- Sarcasm and humor (when clear)
- Historical content with context

## Review Actions

For each flagged post, you can:

1. **Mark Reviewed**: Note that you've seen it
2. **Dismiss**: False positive, not actually concerning
3. **Mark for Deletion**: Reminder to delete from Facebook
4. **Visibility Changed**: Note you've restricted who can see it
5. **Add Notes**: Personal notes about the post

**IMPORTANT**: This app NEVER automatically modifies your Facebook content. All deletions or visibility changes must be done manually on Facebook itself.

## Interpreting Results

### Supporting Excerpts

The AI shows exact quotes that triggered the flag. Verify these are accurate—if the AI quotes something not in your post, it's a hallucination error.

### Confidence Score

- 0.9-1.0: Very confident
- 0.7-0.9: Fairly confident
- 0.5-0.7: Moderate confidence
- Below 0.5: Low confidence (likely false positive)

### Context Notes

The AI attempts to note:
- Whether content is quoted vs. original
- Sarcasm or humor
- Missing context
- Historical timeframe

### Uncertainty

If the AI notes uncertainty, manually review the post carefully. The AI may be missing context you have.

## Best Practices

### 1. Review High Priority First

Start with the highest-priority posts. These are most likely to warrant attention.

### 2. Check for False Positives

- Verify supporting excerpts match the actual post
- Consider context the AI may have missed
- Check if you were quoting someone else
- Note sarcasm or jokes that weren't detected

### 3. Consider Post Age

Older posts may reflect different life stages. Context matters.

### 4. Check Original Links

When available, open the original Facebook post to see:
- Full conversation thread
- Who can see it (privacy settings)
- Comments and reactions
- Shared content vs. your commentary

### 5. Document Your Decisions

Use the notes feature to record:
- Why you dismissed a flag
- What action you took on Facebook
- Additional context for your records

## Exporting Results

(Feature planned for M6)

You'll be able to export:
- CSV of flagged items
- JSON data export  
- Review checklist with source links
- PDF summary report

## Data Management

### Re-importing

You can import additional exports without duplicating existing posts. The system checks for duplicates based on:
- Platform post ID (if available)
- Content + timestamp match

### Analyzing Again

To re-analyze posts (e.g., after model improvements):
- Delete existing analysis results from database
- Run analysis again
- Previous review actions are preserved

### Deleting Data

To remove all local data:
```bash
rm -rf data/ uploads/
```

This deletes your local audit database but does NOT affect your actual Facebook content.

## Privacy

- All analysis happens on your local machine
- No data is sent to external services
- Database stored locally in `./data/`
- Uploaded files stored in `./uploads/`
- The application runs on localhost only
- No tracking or telemetry

## Limitations

### What This Tool Does NOT Do

- **Does NOT** predict hiring decisions
- **Does NOT** know employer screening criteria
- **Does NOT** automatically delete or edit Facebook content
- **Does NOT** represent legal advice
- **Does NOT** guarantee complete post discovery
- **Does NOT** analyze private messages or photos in detail

### Missing Context

The AI cannot know:
- Your actual intent or tone
- Inside jokes with friends
- Real-world context around events
- Your personal values and beliefs

Always apply your own judgment.

## Getting Help

For technical issues:
1. Check logs in terminal windows
2. Verify Ollama is running: `curl http://localhost:11434/api/tags`
3. Check application health: `curl http://localhost:3000/api/health`
4. See SETUP.md for troubleshooting

## Job Application Context

This tool was built for someone interviewing for a Facility Operations House Manager position at a faith-based organization. The analysis considers both general professional reputation and faith-context concerns.

However:
- It does NOT know Prestonwood's specific policies
- It does NOT predict whether you'll be hired
- It does NOT claim any content is "disqualifying"
- You can supply actual employee policies for more grounded analysis

The goal is to help YOU review your own content thoughtfully, not to replace your judgment.

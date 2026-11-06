# floppy-disk Architecture

## Overview

floppy-disk is a privacy-first social media reputation review application built as a self-hosted Next.js application with local SQLite storage and Ollama AI analysis.

## Architecture Principles

1. **Privacy-First**: All data processing happens locally
2. **Local AI**: Use Ollama instead of cloud APIs by default
3. **Type Safety**: TypeScript with Zod validation throughout
4. **Persistent Storage**: SQLite for reliable local data
5. **Modularity**: Clear separation of concerns
6. **No Lock-In**: Standard formats and open protocols

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **React 18**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Radix UI**: Headless UI primitives

### Backend
- **Next.js API Routes**: REST API endpoints
- **better-sqlite3**: Synchronous SQLite bindings
- **Zod**: Runtime type validation

### AI/ML
- **Ollama**: Local LLM runtime
- **Mistral 7B Instruct**: Analysis model

### File Processing
- **JSZip**: ZIP archive extraction
- **htmlparser2**: HTML parsing
- **csv-parse/stringify**: CSV handling

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                     │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Dashboard  │  │ Import   │  │ Post Review      │    │
│  │ (React)    │  │ UI       │  │ Interface        │    │
│  └────────────┘  └──────────┘  └──────────────────┘    │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (localhost:3000)
┌─────────────────────────┴───────────────────────────────┐
│              Next.js Application Server                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │                 API Routes                        │   │
│  │  /api/imports  /api/posts  /api/analyze          │   │
│  │  /api/review   /api/stats  /api/health           │   │
│  └────┬─────────────────┬──────────────────┬────────┘   │
│       │                 │                  │             │
│  ┌────┴────┐      ┌────┴─────┐      ┌────┴──────┐      │
│  │Connector│      │ Analysis │      │  Review   │      │
│  │ Layer   │      │ Provider │      │  Actions  │      │
│  └────┬────┘      └────┬─────┘      └────┬──────┘      │
│       │                │                  │             │
│  ┌────┴────────────────┴──────────────────┴──────┐      │
│  │           Database Layer (SQLite)             │      │
│  │  Posts │ Analysis │ Reviews │ Imports         │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP (127.0.0.1:11434)
┌─────────────────────────┴───────────────────────────────┐
│                    Ollama Server                         │
│  ┌────────────────────────────────────────────────┐     │
│  │        Mistral 7B Instruct Model               │     │
│  │     (4.4GB, runs locally on CPU/GPU)           │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

### Import Flow

```
User uploads file
      ↓
API: POST /api/imports
      ↓
Create import record (status: processing)
      ↓
Connector parses file:
  - ZIP → extract files
  - JSON → parse structure
  - HTML → extract posts
      ↓
For each item:
  - Check duplicates
  - Decode Unicode
  - Extract metadata
  - Create post record
      ↓
Update import (status: completed)
      ↓
Return stats to client
```

### Analysis Flow

```
User triggers analysis
      ↓
API: POST /api/analyze {postIds}
      ↓
Check Ollama health
      ↓
For each post:
  - Fetch post data
  - Build analysis prompt
  - Call Ollama API
  - Parse JSON response
  - Validate with Zod
  - Check excerpt accuracy
  - Store analysis result
      ↓
Return analysis stats
```

### Review Flow

```
User reviews post
      ↓
API: POST /api/review
      ↓
Create review action record
      ↓
Store notes and timestamp
      ↓
Return success
```

## Database Schema

### Posts Table

```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_id TEXT,
  record_type TEXT NOT NULL,
  author_name TEXT,
  text TEXT,
  timestamp INTEGER,
  timezone TEXT,
  permalink TEXT,
  permalink_status TEXT,
  visibility TEXT,
  parent_id TEXT,
  shared_content TEXT,
  owner_commentary TEXT,
  has_media INTEGER DEFAULT 0,
  media_metadata TEXT,
  conversation_context TEXT,
  import_warnings TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (import_id) REFERENCES imports(id)
);
```

### Analysis Results Table

```sql
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_version TEXT,
  analyzed_at INTEGER NOT NULL,
  priority TEXT NOT NULL,
  priority_score INTEGER,
  professional_assessment TEXT,
  faith_context_assessment TEXT,
  supporting_excerpts TEXT,
  concerns TEXT,
  severity TEXT,
  confidence REAL,
  context_notes TEXT,
  uncertainty TEXT,
  policy_version TEXT,
  suggested_action TEXT,
  media_reviewed INTEGER DEFAULT 0,
  raw_output TEXT,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
```

### Review Actions Table

```sql
CREATE TABLE review_actions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
```

### Imports Table

```sql
CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  source_type TEXT NOT NULL,
  filename TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  status TEXT NOT NULL,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  error_message TEXT,
  metadata TEXT
);
```

## Module Structure

### Connectors

```
src/connectors/
  facebook.ts       - Facebook import logic
  [twitter.ts]      - Planned
  [instagram.ts]    - Planned
  [reddit.ts]       - Planned
```

Each connector:
- Implements platform-specific parsing
- Handles multiple export formats
- Performs deduplication
- Returns normalized Post objects

### Analysis Providers

```
src/analysis/
  ollama-provider.ts      - Ollama integration
  [openai-provider.ts]    - Planned (opt-in)
  [anthropic-provider.ts] - Planned (opt-in)
```

Each provider:
- Implements AnalysisProvider interface
- Takes Post, returns AnalysisOutput
- Validates structured output
- Checks evidence accuracy

### Type Definitions

```
src/types/
  index.ts          - All Zod schemas and TypeScript types
```

Key types:
- Platform, RecordType, Priority, Severity
- Import, Post, AnalysisResult, ReviewAction
- AnalysisOutput (validated LLM output)

### Database

```
src/lib/
  db.ts             - SQLite connection and schema initialization
  utils.ts          - Utility functions
```

## API Endpoints

### POST /api/imports
Upload and process social media export file

**Input**: FormData with `file` and `platform`  
**Output**: `{success, importId, processed, failed}`

### GET /api/posts
List posts with filtering and pagination

**Query**: `platform`, `priority`, `limit`, `offset`  
**Output**: `{posts[], total, limit, offset}`

### GET /api/posts/[id]
Get detailed post with analysis and review history

**Output**: `{post, analysis, reviews[]}`

### POST /api/analyze
Analyze posts with local AI

**Input**: `{postIds[], batchSize}`  
**Output**: `{success, analyzed, failed, total}`

### POST /api/review
Save review action and notes

**Input**: `{postId, actionType, notes}`  
**Output**: `{success, reviewId}`

### GET /api/stats
Get dashboard statistics

**Output**: Statistics object with counts and date ranges

### GET /api/health
Check system health

**Output**: `{database, ollama, model}`

## Security Considerations

### Data Privacy
- All data stored locally
- No telemetry or tracking
- Database not committed to git
- Uploads directory excluded

### Network Security
- Services bind to localhost only
- No public internet exposure by default
- CORS not enabled
- No authentication (single-user local)

### Input Validation
- Zod schemas for all API inputs
- File upload size limits
- SQL injection prevention via prepared statements
- XSS prevention via React escaping

### AI Safety
- LLM output validated with Zod
- Evidence excerpts checked against source
- Malformed output handled gracefully
- No execution of imported HTML/scripts

## Performance Characteristics

### Database
- SQLite: ~100k read ops/sec
- Indexes on frequently queried columns
- WAL mode for better concurrency
- Suitable for personal-scale data (thousands of posts)

### AI Inference
- Mistral 7B on CPU: ~60 seconds per post
- Memory usage: ~4-6GB during inference
- Batch processing to manage resources
- Can be improved with GPU acceleration

### Import Processing
- JSON parsing: O(n) where n = file size
- ZIP extraction: depends on compression
- Duplicate checking: O(1) with indexes
- Handles archives up to several GB

## Deployment Model

### Local Development
```bash
ollama serve          # Terminal 1
npm run dev           # Terminal 2
```

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
```
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=mistral:7b-instruct
DATABASE_PATH=./data/floppy-disk.db
ENABLE_CLOUD_AI=false
```

## Extensibility Points

### Adding New Platforms
1. Create connector in `src/connectors/`
2. Implement file parsing logic
3. Return normalized Post objects
4. Add to API route switch

### Adding AI Providers
1. Create provider in `src/analysis/`
2. Implement provider interface
3. Add configuration
4. Require explicit user opt-in

### Custom Analysis
1. Modify AnalysisOutputSchema
2. Update analysis prompt
3. Adjust UI to display new fields
4. Migrate existing analysis if needed

## Testing Strategy

### Unit Tests (Vitest)
- Connector parsing logic
- Zod schema validation
- Database operations
- Utility functions

### Integration Tests
- API endpoint functionality
- Database migrations
- Import pipeline end-to-end
- Analysis pipeline with mock provider

### E2E Tests (Playwright)
- Import workflow
- Analysis workflow
- Review workflow
- UI interactions

### Manual Tests
- Real Ollama integration
- Large file imports
- Error handling
- Performance under load

## Known Limitations

1. **Single User**: No multi-user support or authentication
2. **Local Only**: Designed for localhost, not multi-tenant
3. **CPU-Bound AI**: Inference slow without GPU
4. **No Streaming**: Analysis responses not streamed to UI
5. **Limited Connectors**: Only Facebook implemented so far
6. **No Media Analysis**: Text-only at present

## Future Architecture Considerations

### Scaling
- Worker pool for concurrent analysis
- Background job queue
- Incremental import processing
- Streaming responses

### Features
- WebSocket for real-time progress
- Pluggable storage backends
- Optional cloud provider integration
- Multi-language support

### Performance
- GPU acceleration for Ollama
- Smaller/faster models option
- Caching of analysis results
- Query optimization

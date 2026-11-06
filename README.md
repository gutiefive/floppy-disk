# Socialscrubb

Privacy-first social media reputation review application built to help individuals review their own social media history before employment background checks.

## Overview

Socialscrubb analyzes your social media posts using local AI (Ollama) to identify content that may warrant review before a job interview. All analysis happens on your local machine with no data sent to external services.

**Important**: This tool helps YOU review your content. It never predicts hiring outcomes, claims posts are "disqualifying," or makes decisions for you.

## Features

- ✅ **Facebook Import**: JSON, HTML, and ZIP exports
- ✅ **Local AI Analysis**: Using Ollama with Mistral 7B
- ✅ **Privacy-First**: All data stays on your machine
- ✅ **Professional Assessment**: Identifies potential reputation concerns
- ✅ **Faith-Context Awareness**: Additional review for religious organizations
- ✅ **Review Workflow**: Track reviewed items and add notes
- ✅ **Persistent Storage**: SQLite database for audit trail
- 🚧 **Additional Platforms**: Twitter, Instagram, Reddit (planned)
- 🚧 **Export Reports**: CSV, JSON, PDF (planned)

## Quick Start

### Prerequisites

- Ubuntu 24.04 LTS (or similar Linux)
- Node.js 22+
- 8GB+ RAM
- 250GB+ disk space

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 3. Pull AI model (4.4GB download)
ollama pull mistral:7b-instruct

# 4. Configure environment
cp .env.example .env
```

### Running

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start application
npm run dev
```

Open `http://localhost:3000` in your browser.

## Usage

1. **Export** your Facebook data (Settings → Your Information → Download)
2. **Import** the export file (JSON, HTML, or ZIP)
3. **Analyze** posts using local AI
4. **Review** flagged items and add notes
5. **Export** results for your records

See [docs/USAGE.md](docs/USAGE.md) for detailed instructions.

## Architecture

- **Frontend**: Next.js 14 with React and Tailwind CSS
- **Database**: SQLite with better-sqlite3
- **AI Provider**: Ollama with Mistral 7B Instruct
- **Validation**: Zod schemas for type safety
- **UI Components**: shadcn/ui with Radix primitives

## Project Purpose

This tool was built for someone interviewing for a Facility Operations House Manager position at Prestonwood Baptist Church in Plano, Texas. It helps review social media history for both general professional reputation and faith-based organizational context.

However, the tool:
- Does NOT know specific employer policies
- Does NOT predict hiring decisions
- Does NOT claim content is "disqualifying"
- Is NOT legal advice

## Documentation

- [Setup Guide](docs/SETUP.md) - Installation and configuration
- [Usage Guide](docs/USAGE.md) - How to use the application
- [Architecture](docs/ARCHITECTURE.md) - Technical details (planned)

## Privacy & Security

- All analysis runs locally on your machine
- No data sent to external services by default
- Database stored locally
- Application binds to localhost only
- No tracking or telemetry

⚠️ **Do not expose this application to the public internet**

## Testing

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Build production
npm run build
```

## Data Management

- Database: `./data/socialscrubb.db`
- Uploads: `./uploads/`
- Ollama models: `~/.ollama/models/`

To delete all local audit data:
```bash
rm -rf data/ uploads/
```

This does NOT affect your actual social media content.

## License

MIT

## Disclaimer

This software is provided as-is for personal use. It does not provide legal advice, guarantee completeness of analysis, or predict employment outcomes. Always apply your own judgment when reviewing content.

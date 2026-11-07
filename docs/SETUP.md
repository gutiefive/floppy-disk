# floppy-disk Setup Guide

## System Requirements

- Ubuntu 24.04 LTS (or similar Linux distribution)
- 4+ CPU cores
- 8GB+ RAM (16GB recommended)
- 250GB+ disk space
- Node.js 22+
- Internet connection for initial setup

## Installation

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install zstd (required for Ollama)
sudo apt-get update && sudo apt-get install -y zstd
```

### 2. Install Ollama

```bash
# Download and install Ollama
curl -fsSL https://ollama.com/install.sh | sh
```

### 3. Download AI Model

```bash
# Pull Mistral 7B Instruct (4.4GB download)
ollama pull mistral:7b-instruct
```

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env if needed (defaults should work)
```

## Running the Application

### Start Ollama Server

```bash
# In terminal 1
ollama serve
```

### Start Next.js Application

```bash
# In terminal 2
npm run dev
```

The application will be available at `http://localhost:3000`

## Verifying Installation

1. Open `http://localhost:3000` in your browser
2. Check the "System Status" section:
   - Database should show "Online"
   - Ollama should show "Online"
   - Model should show "mistral:7b-instruct"

## Stopping the Application

1. Press Ctrl+C in the Next.js terminal
2. Press Ctrl+C in the Ollama terminal

## Restarting After System Reboot

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start application
cd /path/to/floppy-disk
npm run dev
```

## Health Check

Test system health:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "database": true,
  "ollama": true,
  "model": "mistral:7b-instruct"
}
```

## Data Storage

- Database: `./data/floppy-disk.db` (legacy `./data/socialscrubb.db` also supported)
- Uploads: `./uploads/`
- Ollama models: `~/.ollama/models/`

## Troubleshooting

### Ollama Not Starting

- Check if port 11434 is already in use
- Verify zstd is installed
- Check logs: `journalctl -u ollama`

### Model Download Fails

- Check internet connection
- Verify sufficient disk space (need ~5GB free)
- Try pulling again: `ollama pull mistral:7b-instruct`

### Application Won't Start

- Check Node.js version: `node --version` (should be 22+)
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if port 3000 is available

### Database Errors

- Ensure ./data directory exists and is writable
- Check disk space
- Database will be created automatically on first run

## Network Access

By default, both services bind to localhost only:
- Ollama: `http://127.0.0.1:11434`
- Next.js: `http://localhost:3000`

This ensures your private data stays local. Do not expose these ports to the internet.

## Privacy Notes

- All analysis happens locally using Ollama
- No data is sent to external services by default
- Database contains imported social media content
- Never commit the .env file or database to Git
- Use local loopback addresses only

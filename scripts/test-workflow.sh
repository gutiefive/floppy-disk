#!/bin/bash

set -e

echo "=== floppy-disk Complete Workflow Test ==="
echo ""

BASE_URL="http://localhost:3000"

echo "1. Testing health endpoint..."
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH" | jq .
echo ""

if echo "$HEALTH" | jq -e '.ollama == true' > /dev/null; then
    echo "✓ Ollama is online"
else
    echo "✗ Ollama is offline"
    exit 1
fi

echo ""
echo "2. Checking initial stats..."
curl -s "$BASE_URL/api/stats" | jq .
echo ""

echo "3. Importing Facebook test data..."
IMPORT_RESULT=$(curl -s -X POST "$BASE_URL/api/imports" \
  -F "platform=facebook" \
  -F "file=@test-fixtures/facebook-export-sample.json")
echo "$IMPORT_RESULT" | jq .

IMPORT_ID=$(echo "$IMPORT_RESULT" | jq -r '.importId')
PROCESSED=$(echo "$IMPORT_RESULT" | jq -r '.processed')
echo "✓ Imported $PROCESSED posts (Import ID: $IMPORT_ID)"
echo ""

echo "4. Checking updated stats..."
curl -s "$BASE_URL/api/stats" | jq .
echo ""

echo "5. Getting first 3 post IDs..."
POST_IDS=$(curl -s "$BASE_URL/api/posts?limit=3" | jq -r '.posts[].id')
echo "$POST_IDS"
echo ""

echo "6. Running analysis on 3 posts (this may take a few minutes)..."
POST_ARRAY=$(echo "$POST_IDS" | jq -R -s -c 'split("\n") | map(select(length > 0))')
echo "Analyzing posts: $POST_ARRAY"

ANALYSIS_RESULT=$(curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d "{\"postIds\":$POST_ARRAY}")
echo "$ANALYSIS_RESULT" | jq .
echo ""

ANALYZED=$(echo "$ANALYSIS_RESULT" | jq -r '.analyzed')
echo "✓ Analyzed $ANALYZED posts"
echo ""

echo "7. Checking final stats..."
curl -s "$BASE_URL/api/stats" | jq .
echo ""

echo "8. Getting posts with analysis..."
curl -s "$BASE_URL/api/posts?limit=5" | jq '.posts[] | {text: .text[:50], priority: .analysis_priority, score: .priority_score}'
echo ""

echo "=== Workflow Test Complete ==="

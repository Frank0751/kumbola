#!/bin/bash
# Extract public-by-design env values from the live KumBola Netlify bundle.
# NEXT_PUBLIC_SUPABASE_URL + publishable/anon keys compile into client JS by design.
set -e
SITE="https://kumbola.netlify.app"
HTML=$(curl -s -m 20 "$SITE/")
echo "$HTML" > /tmp/live-home.html

# Collect script chunk URLs from the HTML
CHUNKS=$(echo "$HTML" | grep -oE '/_next/static/(chunks|builds)/[A-Za-z0-9/_.-]+\.(js|mjs)' | sort -u)
# Also walk _next/static for JS if the HTML embeds a build manifest
if [ -z "$CHUNKS" ]; then
  CHUNKS=$(echo "$HTML" | grep -oE '/_next/static/[A-Za-z0-9/_.-]+\.js' | sort -u)
fi
echo "Found $(echo "$CHUNKS" | grep -c . ) chunk urls"

mkdir -p /tmp/live-chunks
rm -f /tmp/live-chunks/*.js
i=0
for c in $CHUNKS; do
  i=$((i+1))
  curl -s -m 20 "$SITE$c" -o "/tmp/live-chunks/chunk-$i.js"
done
echo "Downloaded $i chunks"
echo "=== URL refs ==="
grep -hoE 'https://[a-z0-9]{20}\.supabase\.co' /tmp/live-chunks/*.js /tmp/live-home.html 2>/dev/null | sort -u | head -5
echo "=== publishable key ==="
grep -hoE 'sb_publishable_[A-Za-z0-9_-]{20,60}' /tmp/live-chunks/*.js 2>/dev/null | sort -u | head -3
echo "=== anon JWT candidates ==="
grep -hoE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' /tmp/live-chunks/*.js 2>/dev/null | sort -u | head -5

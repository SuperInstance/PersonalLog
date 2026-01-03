#!/bin/bash
# Generate PWA icons from SVG source
# This script is now a wrapper around the Node.js version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🎨 Generating PWA icons..."
echo ""

# Run the Node.js script
node "$SCRIPT_DIR/generate-icons.js"

echo ""
echo "✅ Done! Don't forget to commit the generated icons."

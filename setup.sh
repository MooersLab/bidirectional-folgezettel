#!/bin/bash
# =============================================================================
# Bidirectional Folgezettel Plugin - Setup Script
# =============================================================================
# Run this after downloading the files from Claude.
#
# Usage: ./setup.sh
# =============================================================================
set -e

echo "Setting up Bidirectional Folgezettel Plugin..."

# Create directory structure
echo "Creating directory structure..."
mkdir -p src
mkdir -p tests/__mocks__

# Check if main.ts exists in current directory and move to src/
if [ -f "main.ts" ] && [ ! -f "src/main.ts" ]; then
    echo "Moving main.ts to src/"
    cp main.ts src/main.ts
fi

# Check if test file exists
if [ ! -f "tests/bidirectional-folgezettel.test.ts" ]; then
    echo "ERROR: tests/bidirectional-folgezettel.test.ts not found"
    echo "Please ensure all test files are in place"
    exit 1
fi

# Check if mock file exists
if [ ! -f "tests/__mocks__/obsidian.ts" ]; then
    echo "ERROR: tests/__mocks__/obsidian.ts not found"
    echo "Please ensure all mock files are in place"
    exit 1
fi

# Verify src/main.ts exists
if [ ! -f "src/main.ts" ]; then
    echo "ERROR: src/main.ts not found"
    echo "Please copy main.ts to src/main.ts"
    exit 1
fi

echo ""
echo "Directory structure verified:"
echo "  src/main.ts"
echo "  tests/bidirectional-folgezettel.test.ts"
echo "  tests/__mocks__/obsidian.ts"
echo ""
echo "Setup complete! You can now run:"
echo "  npm install"
echo "  npm test"
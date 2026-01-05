#!/bin/bash

set -e

cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
else
    echo "Dependencies already installed."
fi

# Run tests
echo "Running tests..."
pnpm test

# Package the extension
echo "Packaging extension..."
pnpm compile && pnpm package

# Install to Windsurf
echo "Installing extension to Windsurf..."
/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf --install-extension speckit-0.1.0.vsix --force

echo "Done! Please restart Windsurf to activate the extension."

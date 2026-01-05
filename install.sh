#!/bin/bash

set -e

# Default mode: remote install (clone from GitHub)
# Use --local flag to install from current directory (for development)
LOCAL_MODE=false
REPO_URL="https://github.com/theplant/speckit-extension.git"
INSTALL_DIR="${HOME}/.speckit-extension"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --local)
            LOCAL_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--local]"
            echo "  --local  Install from current directory instead of cloning from GitHub"
            exit 1
            ;;
    esac
done

if [ "$LOCAL_MODE" = true ]; then
    # Local mode: use current directory
    cd "$(dirname "$0")"
    echo "Installing from local directory: $(pwd)"
else
    # Remote mode: clone or update from GitHub
    echo "Installing SpecKit extension from GitHub..."
    
    if [ -d "$INSTALL_DIR" ]; then
        echo "Updating existing installation..."
        cd "$INSTALL_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        echo "Cloning repository..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
fi

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed. Please install it first:"
    echo "  npm install -g pnpm"
    exit 1
fi

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

# Detect IDE and install
VSIX_FILE="speckit-0.1.0.vsix"

if [ -d "/Applications/Windsurf.app" ]; then
    echo "Installing extension to Windsurf..."
    /Applications/Windsurf.app/Contents/Resources/app/bin/windsurf --install-extension "$VSIX_FILE" --force
elif [ -d "/Applications/Cursor.app" ]; then
    echo "Installing extension to Cursor..."
    /Applications/Cursor.app/Contents/Resources/app/bin/cursor --install-extension "$VSIX_FILE" --force
elif command -v code &> /dev/null; then
    echo "Installing extension to VS Code..."
    code --install-extension "$VSIX_FILE" --force
else
    echo "Warning: Could not detect Windsurf, Cursor, or VS Code."
    echo "Please manually install: $INSTALL_DIR/$VSIX_FILE"
fi

echo ""
echo "Done! Please restart your IDE to activate the SpecKit extension."

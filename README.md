# SpecKit Extension

A VS Code/Windsurf/Cursor extension for spec-driven development. SpecKit helps you navigate, manage, and test your feature specifications directly from your IDE.

## Features

- **Spec Tree View**: Browse feature specs, user stories, and acceptance scenarios in the sidebar
- **Split View**: View specs and linked tests side-by-side
- **Test Integration**: Run tests directly from the spec tree with automatic maturity tracking
- **Maturity Tracking**: Track test coverage and maturity levels for each acceptance scenario
- **AI-Assisted Development**: Copy context for AI assistants to help write tests and implementations

## Installation

### One-Line Install (Recommended)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/theplant/speckit-extension/HEAD/install.sh)"
```

This will:
1. Clone the repository to `~/.speckit-extension`
2. Install dependencies
3. Run tests to verify the build
4. Package and install the extension to your IDE (Windsurf, Cursor, or VS Code)

### Prerequisites

- **Node.js** (v18 or later)
- **pnpm** - Install with `npm install -g pnpm`
- **Git**
- One of: **Windsurf**, **Cursor**, or **VS Code**

### Development Installation

If you've already cloned the repository and want to install from your local copy:

```bash
./install.sh --local
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/theplant/speckit-extension.git
cd speckit-extension

# Install dependencies
pnpm install

# Run tests
pnpm test

# Package the extension
pnpm compile && pnpm package

# Install to your IDE (example for Windsurf)
/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf --install-extension speckit-0.1.0.vsix --force
```

## Usage

### Project Structure

SpecKit expects your project to have a `specs` directory with feature specifications:

```
your-project/
├── specs/
│   └── 001-feature-name/
│       ├── spec.md          # Feature specification
│       └── maturity.json    # Test maturity tracking (auto-generated)
└── test/
    └── suite/
        └── us1-feature.test.ts  # Tests linked to user stories
```

### Spec Format

Your `spec.md` files should follow this format:

```markdown
# Feature Specification: Feature Name

## User Scenarios & Testing

### User Story 1 - Story Title (Priority: P1)

As a user, I want to do something.

**Acceptance Scenarios**:

1. **Given** some context, **When** an action occurs, **Then** expected result
2. **Given** another context, **When** another action, **Then** another result
```

### Commands

- **Copy for Test**: Right-click on a scenario to copy context for AI-assisted test writing
- **Run Test**: Right-click on a test, scenario, or user story to run associated tests
- **Click to Navigate**: Click on items in the tree to open the corresponding file location

### Maturity Tracking

SpecKit tracks test maturity in `maturity.json`:

- **none**: No tests or tests not passing
- **partial**: Some tests passing
- **complete**: All tests passing

When you run tests via SpecKit, the maturity is automatically updated based on test results.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Watch mode for development
pnpm watch

# Package extension
pnpm package
```

## License

MIT

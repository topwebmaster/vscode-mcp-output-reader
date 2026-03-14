# Contributing to MCP Output Reader

First off, **thank you** for taking the time to contribute! 🎉

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md) code of conduct. By participating, you agree to uphold these standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Good First Issues](#good-first-issues)

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. Create a **feature branch** from `main`
4. Make your changes, write tests if applicable
5. Submit a **Pull Request**

## Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- VS Code >= 1.90

### Install & build

```bash
git clone https://github.com/YOUR_USERNAME/vscode-mcp-output-reader.git
cd vscode-mcp-output-reader
npm install
npm run compile
```

### Run in development mode

```bash
npm run watch   # TypeScript watch mode
```

Then press **F5** in VS Code to open an Extension Development Host with the extension loaded.

### Run tests

```bash
npm test
```

## Project Structure

```
vscode-mcp-output-reader/
├── src/
│   ├── extension.ts        # Entry point: activates both transports
│   ├── channelRegistry.ts  # Intercepts createOutputChannel, stores buffers
│   ├── mcpServer.ts        # HTTP JSON-RPC 2.0 server + MCP tool definitions
│   └── stdioServer.ts      # Unix socket / Windows named pipe server
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── PULL_REQUEST_TEMPLATE.md
├── package.json
├── tsconfig.json
└── README.md
```

## How to Contribute

### Reporting Bugs

Before creating a bug report, check the [existing issues](https://github.com/topwebmaster/vscode-mcp-output-reader/issues).

When filing a bug, please include:
- VS Code version
- Extension version
- OS and Node.js version
- Steps to reproduce
- Expected vs actual behaviour
- Relevant output from the Developer Tools console

Use the **Bug Report** issue template.

### Suggesting Features

Feature requests are welcome! Use the **Feature Request** template and describe:
- The problem you’re trying to solve
- Your proposed solution
- Alternatives you’ve considered

### Contributing Code

Areas where contributions are especially welcome:

| Area | Description |
|------|-------------|
| 🧪 Tests | Unit and integration tests (currently missing!) |
| 🔌 WebSocket transport | Add WebSocket as a third transport option |
| 📊 Structured logs | Parse JSON logs, stack traces, timestamps |
| 🤖 AI client guides | Guides for connecting specific AI tools |
| 📄 Documentation | Improve docs, add examples, fix typos |
| 🔧 Bug fixes | See [open issues](https://github.com/topwebmaster/vscode-mcp-output-reader/issues) |

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change without fix or feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling |
| `perf` | Performance improvement |

**Examples:**
```
feat(transport): add WebSocket transport support
fix(registry): handle channel disposal correctly
docs: add Claude Desktop connection guide
```

## Pull Request Process

1. Update `CHANGELOG.md` with your changes under `[Unreleased]`
2. Update `README.md` if your change adds/modifies user-facing behaviour
3. Ensure TypeScript compiles without errors: `npm run compile`
4. Make sure your PR description clearly explains **what** and **why**
5. Link any related issues with `Closes #123`
6. A maintainer will review within a few days

### PR Checklist

- [ ] `npm run compile` passes
- [ ] No `console.log` left in production code
- [ ] CHANGELOG.md updated
- [ ] README.md updated (if applicable)

## Good First Issues

Looking for somewhere to start? Check issues labelled [`good first issue`](https://github.com/topwebmaster/vscode-mcp-output-reader/labels/good%20first%20issue).

Some concrete ideas:
- Add `npm test` script with a basic test runner
- Add `--channel` CLI argument documentation
- Write a guide for connecting to Zed editor
- Add ESLint configuration to the project

## Questions?

Open a [Discussion](https://github.com/topwebmaster/vscode-mcp-output-reader/discussions) or file an issue with the `question` label.

Thank you for making this project better! 🚀

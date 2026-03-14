<div align="center">

# 🔍 MCP Output Reader for VS Code

**Give your AI assistant real-time access to VS Code Output channels**

[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.90.0-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-JSON--RPC%202.0-green)](https://modelcontextprotocol.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/topwebmaster/vscode-mcp-output-reader?style=social)](https://github.com/topwebmaster/vscode-mcp-output-reader/stargazers)

*Ruff errors • Pylance diagnostics • ESLint warnings • Python output • any Output channel — all accessible to Claude, Cursor, Copilot and Zed*

[Installation](#installation) • [How it works](#how-it-works) • [Configuration](#configuration) • [MCP Clients](#connecting-to-mcp-clients) • [Contributing](CONTRIBUTING.md)

</div>

---

## ✨ Why this extension?

AI coding assistants are powerful — but they can’t see what’s happening in your VS Code **Output panel**. When Ruff flags an import, Pylance reports a type error, or your Python script crashes, your AI has no idea.

**MCP Output Reader bridges that gap.** It runs a lightweight [Model Context Protocol](https://modelcontextprotocol.io/) server inside VS Code and streams every Output channel buffer to any MCP-compatible AI client.

```
VS Code Output channels
  ├── Ruff          ┌─────────────────┐
  ├── Pylance  ──►  MCP Output Reader  ┠──►  Claude / Cursor / Zed
  ├── ESLint        └─────────────────┘
  └── Python
```

## 🚀 Features

- 📡 **Dual transport** — HTTP (port 6070) + Unix/Windows socket, run both simultaneously
- 🔄 **Live capture** — intercepts `vscode.window.createOutputChannel` at runtime, zero config
- 🎯 **Channel filtering** — watch ALL channels or pin specific ones (`["Ruff", "Pylance"]`)
- 🔍 **Full-text search** — search across all channels at once
- 🧹 **Buffer management** — configurable per-channel line limit (default 500)
- ⚡ **Lightweight** — pure Node.js, no external runtime dependencies
- 🤝 **MCP 2024-11-05** — implements the latest Model Context Protocol spec

## How it works

The extension monkey-patches `vscode.window.createOutputChannel` so every channel created by any installed extension is captured into an in-memory ring buffer. Two MCP transports expose these buffers:

| Transport | Address | Best for |
|-----------|---------|----------|
| **HTTP** | `http://127.0.0.1:6070` | Cursor, web-based MCP clients |
| **stdio socket** | `/tmp/vscode-mcp-output-reader.sock` (Linux/macOS) · `\\.\pipe\vscode-mcp-output-reader` (Windows) | Claude Desktop, Zed, child-process clients |

Both transports speak JSON-RPC 2.0 and expose identical MCP tools.

## MCP Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `list_output_channels` | — | List all captured channels with line counts and timestamps |
| `read_output_channel` | `channel`, `last_n_lines?`, `filter?` | Read a channel buffer with optional tail and grep |
| `clear_output_channel` | `channel` | Clear the in-memory buffer for a channel |
| `search_output_channels` | `query` | Full-text search across all channels |

## Installation

### Option A — From source (development)

```bash
git clone https://github.com/topwebmaster/vscode-mcp-output-reader.git
cd vscode-mcp-output-reader
npm install
npm run compile
# Press F5 in VS Code to launch the Extension Development Host
```

### Option B — Package as .vsix

```bash
npm run package
code --install-extension vscode-mcp-output-reader-0.1.0.vsix
```

## Configuration

Add to your VS Code `settings.json`:

```json
{
  "mcpOutputReader.transport": "both",
  "mcpOutputReader.port": 6070,
  "mcpOutputReader.maxLines": 500,
  "mcpOutputReader.watchedChannels": []
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `transport` | `"both"` | `"http"` \| `"stdio"` \| `"both"` |
| `port` | `6070` | HTTP server port |
| `maxLines` | `500` | Ring-buffer size per channel |
| `watchedChannels` | `[]` | Pin to specific channels, empty = capture ALL |

## Connecting to MCP Clients

### Claude Desktop / Zed (stdio socket)

```json
{
  "mcpServers": {
    "vscode-output": {
      "socketPath": "/tmp/vscode-mcp-output-reader.sock"
    }
  }
}
```

> **Windows:** use `\\\\.\\pipe\\vscode-mcp-output-reader`

### Cursor / HTTP clients

```json
{
  "mcpServers": {
    "vscode-output": {
      "url": "http://127.0.0.1:6070"
    }
  }
}
```

## Example: Ask your AI

Once connected, you can ask your AI assistant:

> *“Check the Ruff output channel — are there any lint errors in my current file?”*

> *“Read the last 20 lines from the Python channel and explain the traceback.”*

> *“Search all output channels for ‘ImportError’ and suggest a fix.”*

## CLI / curl examples

```bash
# List all captured channels
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_output_channels","arguments":{}}}'

# Read last 50 lines from Ruff
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"read_output_channel","arguments":{"channel":"Ruff","last_n_lines":50}}}'

# Search all channels for "error"
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_output_channels","arguments":{"query":"error"}}}'
```

## VS Code Commands

| Command | Description |
|---------|-------------|
| `MCP Output Reader: List Captured Channels` | Show all active channels in a Quick Pick |
| `MCP Output Reader: Show Server Status` | Show port, socket path and channel count |

## Roadmap

- [ ] VS Code Marketplace publish
- [ ] WebSocket transport support
- [ ] Output channel timestamps / diffs
- [ ] Structured log parsing (JSON logs, stack traces)
- [ ] Unit tests & integration tests
- [ ] VS Code Webview dashboard

## Contributing

Contributions are very welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

```bash
git clone https://github.com/topwebmaster/vscode-mcp-output-reader.git
npm install
npm run watch   # TypeScript watch mode
# Press F5 → Extension Development Host opens
```

See [open issues](https://github.com/topwebmaster/vscode-mcp-output-reader/issues) for good first contributions.

## License

MIT © [topwebmaster](https://github.com/topwebmaster)

---

<div align="center">

⭐ If this extension helps you, please **star the repo** — it helps others discover it!

</div>

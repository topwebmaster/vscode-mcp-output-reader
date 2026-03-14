# vscode-mcp-output-reader

A VS Code extension that exposes all Output channel streams (Ruff, Pylance, ESLint, Python, mypy, etc.) to AI models via an **MCP-compatible HTTP server** (JSON-RPC 2.0).

## How it works

The extension monkey-patches `vscode.window.createOutputChannel` so every channel created by any installed extension is wrapped in a proxy that duplicates its output into an in-memory buffer. A lightweight HTTP server then serves these buffers as MCP tools.

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_output_channels` | List all captured channels with line counts and timestamps |
| `read_output_channel` | Read a specific channel buffer (with optional filter and line limit) |
| `clear_output_channel` | Clear the local buffer for a channel |
| `search_output_channels` | Search all channels at once for a keyword |

## Installation

```bash
git clone https://github.com/topwebmaster/vscode-mcp-output-reader.git
cd vscode-mcp-output-reader
npm install
npm run compile
```

Then press `F5` in VS Code to launch the extension host, or package it:

```bash
npm run package
code --install-extension vscode-mcp-output-reader-0.1.0.vsix
```

## Configuration

Add to your VS Code `settings.json`:

```json
{
  "mcpOutputReader.port": 6070,
  "mcpOutputReader.maxLines": 500,
  "mcpOutputReader.watchedChannels": []
}
```

- **`port`** (default `6070`) — port the MCP server listens on
- **`maxLines`** (default `500`) — maximum lines kept per channel buffer
- **`watchedChannels`** (default `[]` = **all channels**) — filter to specific channels, e.g. `["Ruff", "Pylance", "ESLint"]`

## Connecting to Claude / Cursor / Copilot

Add to your MCP client config:

```json
{
  "mcpServers": {
    "vscode-output": {
      "url": "http://127.0.0.1:6070"
    }
  }
}
```

## Example usage

```
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

## Commands

- `MCP Output Reader: List Captured Channels` — show all watched channels in a Quick Pick
- `MCP Output Reader: Show Server Status` — show current port and channel count

## License

MIT

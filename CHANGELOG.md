# Changelog

All notable changes to **MCP Output Reader** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- WebSocket transport support
- Output channel timestamps and diffs
- Structured log parsing (JSON, stack traces)
- Unit and integration test suite
- VS Code Marketplace publish
- VS Code Webview dashboard

---

## [0.1.0] - 2026-03-14

### Added
- **ChannelRegistry** — intercepts `vscode.window.createOutputChannel` at runtime and captures all Output channel content into in-memory ring buffers
- **HTTP transport** (`McpOutputServer`) — JSON-RPC 2.0 MCP server on configurable port (default `6070`)
- **stdio transport** (`StdioMcpServer`) — Unix Domain Socket (Linux/macOS) and Windows Named Pipe transport for Claude Desktop, Cursor, Zed and child-process MCP clients
- **Transport selection** via `mcpOutputReader.transport` setting: `"http"`, `"stdio"`, or `"both"`
- **MCP Tools**:
  - `list_output_channels` — list all captured channels with metadata
  - `read_output_channel` — read channel buffer with optional tail and filter
  - `clear_output_channel` — clear in-memory buffer for a channel
  - `search_output_channels` — full-text search across all channels
- **VS Code Commands**:
  - `MCP Output Reader: List Captured Channels`
  - `MCP Output Reader: Show Server Status`
- **Configuration** settings: `port`, `maxLines`, `watchedChannels`, `transport`
- Full TypeScript source with `tsconfig.json`
- MIT License
- README with badges, architecture diagram, configuration table and examples
- CONTRIBUTING.md with development guide and commit convention
- CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
- GitHub Issue templates (bug report, feature request)
- GitHub Actions CI workflow

[Unreleased]: https://github.com/topwebmaster/vscode-mcp-output-reader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/topwebmaster/vscode-mcp-output-reader/releases/tag/v0.1.0

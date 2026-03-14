import * as http from 'http';
import { ChannelRegistry } from './channelRegistry';

/**
 * McpOutputServer — MCP-совместимый HTTP-сервер (JSON-RPC 2.0).
 *
 * Инструменты:
 *   list_output_channels   — список всех захваченных Output-каналов
 *   read_output_channel    — чтение буфера конкретного канала (с фильтрацией и ограничением строк)
 *   clear_output_channel   — очистка локального буфера канала
 *   search_output_channels — поиск по всем каналам сразу
 */
export class McpOutputServer {
  private httpServer: http.Server;

  constructor(
    private readonly port: number,
    private readonly registry: ChannelRegistry
  ) {
    this.httpServer = http.createServer(this.handleRequest.bind(this));
  }

  start(): void {
    this.httpServer.listen(this.port, '127.0.0.1', () => {
      console.log(`[MCP Output Reader] Server listening on http://127.0.0.1:${this.port}`);
    });
  }

  stop(): void {
    this.httpServer.close();
  }

  // ── Tool definitions ─────────────────────────────────────────────────

  private get tools() {
    return [
      {
        name: 'list_output_channels',
        description:
          'List all VS Code Output channels currently captured by MCP Output Reader. ' +
          'Returns name, buffered line count and last update time.',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'read_output_channel',
        description:
          'Read the buffered output of a specific VS Code Output channel. ' +
          'Supports any installed extension: Ruff, Pylance, ESLint, Python, TypeScript, ' +
          'mypy, Flake8, Prettier, rust-analyzer, Go, etc. ' +
          'Use list_output_channels to get exact channel names.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Exact channel name (case-insensitive). Get names from list_output_channels.'
            },
            last_n_lines: {
              type: 'number',
              description: 'Return only the last N lines (default: all buffered lines).'
            },
            filter: {
              type: 'string',
              description: 'Return only lines that contain this substring (case-sensitive).'
            }
          },
          required: ['channel']
        }
      },
      {
        name: 'clear_output_channel',
        description: 'Clear the local MCP buffer for a specific Output channel. Does not affect the VS Code UI.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel name to clear (case-insensitive).'
            }
          },
          required: ['channel']
        }
      },
      {
        name: 'search_output_channels',
        description:
          'Search across ALL captured Output channels for lines matching a substring or keyword. ' +
          'Useful when you do not know which channel emitted a specific error or warning.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Substring to search for across all channel buffers (case-sensitive).'
            },
            last_n_lines_per_channel: {
              type: 'number',
              description: 'Limit search to last N lines per channel (default: all).'
            }
          },
          required: ['query']
        }
      }
    ];
  }

  // ── Tool execution ──────────────────────────────────────────────────

  private executeTool(name: string, args: Record<string, any>): string {
    switch (name) {

      case 'list_output_channels': {
        const list = this.registry.getAll().map((c) => ({
          name: c.name,
          buffered_lines: c.lines.length,
          last_updated: new Date(c.lastUpdated).toISOString()
        }));
        if (list.length === 0) {
          return 'No output channels captured yet. Channels are captured when extensions activate and call createOutputChannel().';
        }
        return JSON.stringify(list, null, 2);
      }

      case 'read_output_channel': {
        const ch = this.registry.getByName(args.channel as string);
        if (!ch) {
          const available = this.registry.getAll().map((c) => c.name).join(', ');
          return `Channel "${args.channel}" not found.${available ? ` Available channels: ${available}` : ' No channels captured yet.'}`;
        }
        let lines = [...ch.lines];
        if (args.filter) {
          lines = lines.filter((l) => l.includes(args.filter as string));
        }
        if (typeof args.last_n_lines === 'number' && args.last_n_lines > 0) {
          lines = lines.slice(-args.last_n_lines);
        }
        if (lines.length === 0) {
          return args.filter
            ? `No lines matching "${args.filter}" in channel "${ch.name}".`
            : `Channel "${ch.name}" buffer is empty.`;
        }
        return lines.join('\n');
      }

      case 'clear_output_channel': {
        const ok = this.registry.clearBuffer(args.channel as string);
        return ok
          ? `Buffer for "${args.channel}" cleared.`
          : `Channel "${args.channel}" not found.`;
      }

      case 'search_output_channels': {
        const query = args.query as string;
        const limit = typeof args.last_n_lines_per_channel === 'number'
          ? args.last_n_lines_per_channel
          : 0;
        const results: Array<{ channel: string; matches: string[] }> = [];

        for (const ch of this.registry.getAll()) {
          let lines = ch.lines;
          if (limit > 0) { lines = lines.slice(-limit); }
          const matches = lines.filter((l) => l.includes(query));
          if (matches.length > 0) {
            results.push({ channel: ch.name, matches });
          }
        }

        if (results.length === 0) {
          return `No matches for "${query}" across all captured channels.`;
        }
        return results
          .map((r) => `=== ${r.channel} (${r.matches.length} match(es)) ===\n${r.matches.join('\n')}`)
          .join('\n\n');
      }

      default:
        return `Unknown tool: ${name}`;
    }
  }

  // ── HTTP / JSON-RPC handler ─────────────────────────────────────────

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const rpc = body ? JSON.parse(body) : {};

        if (rpc.method === 'initialize') {
          return this.ok(res, rpc.id, {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'vscode-mcp-output-reader', version: '0.1.0' }
          });
        }

        if (rpc.method === 'tools/list') {
          return this.ok(res, rpc.id, { tools: this.tools });
        }

        if (rpc.method === 'tools/call') {
          const { name, arguments: args } = rpc.params ?? {};
          const text = this.executeTool(name as string, (args ?? {}) as Record<string, any>);
          return this.ok(res, rpc.id, { content: [{ type: 'text', text }] });
        }

        this.err(res, rpc.id, -32601, `Method not found: ${rpc.method}`);
      } catch (e: any) {
        this.err(res, null, -32700, `Parse error: ${e.message}`);
      }
    });
  }

  private ok(res: http.ServerResponse, id: unknown, result: unknown): void {
    res.writeHead(200);
    res.end(JSON.stringify({ jsonrpc: '2.0', id, result }));
  }

  private err(res: http.ServerResponse, id: unknown, code: number, message: string): void {
    res.writeHead(200);
    res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }));
  }
}

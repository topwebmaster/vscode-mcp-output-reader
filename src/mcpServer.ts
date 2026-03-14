import * as http from 'http';
import { ChannelRegistry } from './channelRegistry';

/**
 * McpOutputServer - MCP HTTP transport (JSON-RPC 2.0 over HTTP).
 * Static helpers getToolDefinitions() and executeTool() are shared with StdioMcpServer.
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
      console.log(`[MCP Output Reader] HTTP server on http://127.0.0.1:${this.port}`);
    });
  }

  stop(): void { this.httpServer.close(); }

  // Static helpers shared with StdioMcpServer

  static getToolDefinitions() {
    return [
      {
        name: 'list_output_channels',
        description: 'List all VS Code Output channels captured. Returns name, line count, last update.',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'read_output_channel',
        description: 'Read buffered output of a VS Code Output channel (Ruff, Pylance, ESLint, Python, mypy, etc). Use list_output_channels for names.',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel name (case-insensitive).' },
            last_n_lines: { type: 'number', description: 'Return only last N lines.' },
            filter: { type: 'string', description: 'Return only lines containing this substring.' }
          },
          required: ['channel']
        }
      },
      {
        name: 'clear_output_channel',
        description: 'Clear the MCP buffer for a channel (does not affect VS Code UI).',
        inputSchema: {
          type: 'object',
          properties: { channel: { type: 'string', description: 'Channel name (case-insensitive).' } },
          required: ['channel']
        }
      },
      {
        name: 'search_output_channels',
        description: 'Search ALL captured channels for lines matching a substring.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Substring to find (case-sensitive).' },
            last_n_lines_per_channel: { type: 'number', description: 'Limit to last N lines per channel.' }
          },
          required: ['query']
        }
      }
    ];
  }

  static executeTool(name: string, args: Record<string, any>, registry: ChannelRegistry): string {
    switch (name) {
      case 'list_output_channels': {
        const list = registry.getAll().map((c) => ({
          name: c.name, buffered_lines: c.lines.length,
          last_updated: new Date(c.lastUpdated).toISOString()
        }));
        return list.length === 0
          ? 'No channels captured yet.'
          : JSON.stringify(list, null, 2);
      }
      case 'read_output_channel': {
        const ch = registry.getByName(args.channel as string);
        if (!ch) {
          const avail = registry.getAll().map((c) => c.name).join(', ');
          return `Channel "${args.channel}" not found.${avail ? ` Available: ${avail}` : ''}`;
        }
        let lines = [...ch.lines];
        if (args.filter) { lines = lines.filter((l) => l.includes(args.filter as string)); }
        if (typeof args.last_n_lines === 'number' && args.last_n_lines > 0) { lines = lines.slice(-args.last_n_lines); }
        return lines.length === 0 ? `Channel "${ch.name}" buffer is empty.` : lines.join('\n');
      }
      case 'clear_output_channel': {
        const ok = registry.clearBuffer(args.channel as string);
        return ok ? `Buffer for "${args.channel}" cleared.` : `Channel "${args.channel}" not found.`;
      }
      case 'search_output_channels': {
        const q = args.query as string;
        const limit = typeof args.last_n_lines_per_channel === 'number' ? args.last_n_lines_per_channel : 0;
        const results: Array<{ channel: string; matches: string[] }> = [];
        for (const ch of registry.getAll()) {
          const lines = limit > 0 ? ch.lines.slice(-limit) : ch.lines;
          const matches = lines.filter((l) => l.includes(q));
          if (matches.length > 0) { results.push({ channel: ch.name, matches }); }
        }
        if (results.length === 0) { return `No matches for "${q}".`; }
        return results.map((r) => `=== ${r.channel} (${r.matches.length}) ===\n${r.matches.join('\n')}`).join('\n\n');
      }
      default: return `Unknown tool: ${name}`;
    }
  }

  private get tools() { return McpOutputServer.getToolDefinitions(); }

  private runTool(name: string, args: Record<string, any>): string {
    return McpOutputServer.executeTool(name, args, this.registry);
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const rpc = body ? JSON.parse(body) : {};
        if (rpc.method === 'initialize') {
          return this.ok(res, rpc.id, {
            protocolVersion: '2024-11-05', capabilities: { tools: {} },
            serverInfo: { name: 'vscode-mcp-output-reader', version: '0.1.0' }
          });
        }
        if (rpc.method === 'ping') { return this.ok(res, rpc.id, {}); }
        if (rpc.method === 'tools/list') { return this.ok(res, rpc.id, { tools: this.tools }); }
        if (rpc.method === 'tools/call') {
          const { name, arguments: args } = rpc.params ?? {};
          const text = this.runTool(name as string, (args ?? {}) as Record<string, any>);
          return this.ok(res, rpc.id, { content: [{ type: 'text', text }] });
        }
        this.err(res, rpc.id, -32601, `Method not found: ${rpc.method}`);
      } catch (e: any) { this.err(res, null, -32700, `Parse error: ${e.message}`); }
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

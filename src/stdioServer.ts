import * as readline from 'readline';
import { ChannelRegistry } from './channelRegistry';
import { McpOutputServer } from './mcpServer';

/**
 * StdioMcpServer — stdio транспорт для MCP (JSON-RPC 2.0 поверх stdin/stdout).
 *
 * Подходит для Claude Desktop, Cursor, Zed и любых клиентов,
 * которые запускают MCP-сервер как дочерний процесс.
 *
 * Протокол: каждое сообщение — единая строка JSON на stdin,
 * ответ — единая строка JSON на stdout + \n.
 * Для процесса VS Code Extension Host такой режим запускается через
 * отдельный stdin-поток посредством node:net (унарный socket или настоящий child_process).
 *
 * Здесь реализация через Named Pipe (Windows) / Unix Domain Socket (Linux/macOS),
 * чтобы не блокировать стандартный stdin/stdout самого VS Code.
 */

import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export class StdioMcpServer {
  private socketServer: net.Server | undefined;
  private socketPath: string;

  constructor(private readonly registry: ChannelRegistry) {
    // Unix socket path or Windows named pipe
    if (process.platform === 'win32') {
      this.socketPath = '\\\\.\\pipe\\vscode-mcp-output-reader';
    } else {
      this.socketPath = path.join(os.tmpdir(), 'vscode-mcp-output-reader.sock');
    }
  }

  getSocketPath(): string {
    return this.socketPath;
  }

  start(): void {
    // Clean up stale socket file on Unix
    if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    this.socketServer = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    this.socketServer.listen(this.socketPath, () => {
      console.log(
        `[MCP Output Reader] stdio/socket server listening on ${this.socketPath}`
      );
    });

    this.socketServer.on('error', (err) => {
      console.error('[MCP Output Reader] stdio server error:', err.message);
    });
  }

  stop(): void {
    this.socketServer?.close();
    if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
      try { fs.unlinkSync(this.socketPath); } catch { /* ignore */ }
    }
  }

  // ── Per-connection handler ───────────────────────────────────────────────

  private handleConnection(socket: net.Socket): void {
    const rl = readline.createInterface({ input: socket, crlfDelay: Infinity });

    rl.on('line', (line) => {
      if (!line.trim()) { return; }
      let rpc: any;
      try {
        rpc = JSON.parse(line);
      } catch {
        this.send(socket, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
      }

      const response = this.dispatch(rpc);
      if (response !== null) {
        this.send(socket, response);
      }
    });

    rl.on('close', () => socket.destroy());
    socket.on('error', () => rl.close());
  }

  private send(socket: net.Socket, msg: object): void {
    try {
      socket.write(JSON.stringify(msg) + '\n');
    } catch { /* connection closed */ }
  }

  // ── JSON-RPC dispatch (same logic as McpOutputServer) ───────────────────────

  private dispatch(rpc: any): object | null {
    const id = rpc.id ?? null;

    if (rpc.method === 'initialize') {
      return {
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'vscode-mcp-output-reader', version: '0.1.0' }
        }
      };
    }

    if (rpc.method === 'notifications/initialized') {
      return null; // notification, no response
    }

    if (rpc.method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: McpOutputServer.getToolDefinitions() } };
    }

    if (rpc.method === 'tools/call') {
      const { name, arguments: args } = rpc.params ?? {};
      const text = McpOutputServer.executeTool(name as string, args ?? {}, this.registry);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
    }

    if (rpc.method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${rpc.method}` } };
  }
}

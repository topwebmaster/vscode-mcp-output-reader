import * as vscode from 'vscode';
import { ChannelRegistry } from './channelRegistry';
import { McpOutputServer } from './mcpServer';
import { StdioMcpServer } from './stdioServer';

let registry: ChannelRegistry | undefined;
let httpServer: McpOutputServer | undefined;
let stdioServer: StdioMcpServer | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // 1. Init registry and intercept createOutputChannel
  registry = new ChannelRegistry();
  registry.install();

  const cfg = vscode.workspace.getConfiguration('mcpOutputReader');
  const port = cfg.get<number>('port', 6070);
  const transport = cfg.get<string>('transport', 'both');

  // 2. Start HTTP transport
  if (transport === 'http' || transport === 'both') {
    httpServer = new McpOutputServer(port, registry);
    httpServer.start();
  }

  // 3. Start stdio/socket transport (Unix socket or Windows named pipe)
  if (transport === 'stdio' || transport === 'both') {
    stdioServer = new StdioMcpServer(registry);
    stdioServer.start();
  }

  // 4. Reload on config change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('mcpOutputReader')) { return; }
      registry!.reloadConfig();
      const newCfg = vscode.workspace.getConfiguration('mcpOutputReader');
      const newPort = newCfg.get<number>('port', 6070);
      if (newPort !== port) {
        httpServer?.stop();
        httpServer = new McpOutputServer(newPort, registry!);
        httpServer.start();
        vscode.window.showInformationMessage(
          `MCP Output Reader: HTTP server restarted on port ${newPort}`
        );
      }
    })
  );

  // 5. Command: list channels
  context.subscriptions.push(
    vscode.commands.registerCommand('mcpOutputReader.listChannels', () => {
      const channels = registry?.getAll() ?? [];
      if (channels.length === 0) {
        vscode.window.showInformationMessage('MCP Output Reader: no channels captured yet.');
        return;
      }
      const items = channels.map((c) => `$(symbol-event) ${c.name}  [${c.lines.length} lines]`);
      vscode.window.showQuickPick(items, {
        title: 'MCP Output Reader - Captured Channels',
        placeHolder: 'Select a channel to open in Output panel'
      });
    })
  );

  // 6. Command: show status
  context.subscriptions.push(
    vscode.commands.registerCommand('mcpOutputReader.showStatus', () => {
      const channels = registry?.getAll() ?? [];
      const parts: string[] = [];
      if (transport === 'http' || transport === 'both') {
        parts.push(`HTTP: http://127.0.0.1:${port}`);
      }
      if (transport === 'stdio' || transport === 'both') {
        parts.push(`stdio/socket: ${stdioServer?.getSocketPath()}`);
      }
      vscode.window.showInformationMessage(
        `MCP Output Reader | ${parts.join(' | ')} | ${channels.length} channel(s) captured`
      );
    })
  );

  // Startup notification
  const startMsg: string[] = ['MCP Output Reader started'];
  if (transport === 'http' || transport === 'both') {
    startMsg.push(`HTTP: http://127.0.0.1:${port}`);
  }
  if (transport === 'stdio' || transport === 'both') {
    startMsg.push(`stdio: ${stdioServer?.getSocketPath()}`);
  }
  vscode.window.showInformationMessage(startMsg.join(' | '));
}

export function deactivate(): void {
  httpServer?.stop();
  stdioServer?.stop();
  registry?.uninstall();
}

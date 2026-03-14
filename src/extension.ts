import * as vscode from 'vscode';
import { ChannelRegistry } from './channelRegistry';
import { McpOutputServer } from './mcpServer';

let registry: ChannelRegistry | undefined;
let server: McpOutputServer | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // 1. Инициализируем реестр и устанавливаем перехват createOutputChannel
  registry = new ChannelRegistry();
  registry.install();

  // 2. Запускаем MCP HTTP сервер
  const cfg = vscode.workspace.getConfiguration('mcpOutputReader');
  const port = cfg.get<number>('port', 6070);
  server = new McpOutputServer(port, registry);
  server.start();

  // 3. Обновление при изменении настроек
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('mcpOutputReader')) { return; }
      registry!.reloadConfig();
      const newCfg = vscode.workspace.getConfiguration('mcpOutputReader');
      const newPort = newCfg.get<number>('port', 6070);
      if (newPort !== port) {
        server!.stop();
        server = new McpOutputServer(newPort, registry!);
        server.start();
        vscode.window.showInformationMessage(
          `MCP Output Reader restarted on port ${newPort}`
        );
      }
    })
  );

  // 4. Команда: список каналов
  context.subscriptions.push(
    vscode.commands.registerCommand('mcpOutputReader.listChannels', () => {
      const channels = registry?.getAll() ?? [];
      if (channels.length === 0) {
        vscode.window.showInformationMessage(
          'MCP Output Reader: no channels captured yet. ' +
          'Channels appear after extensions activate.'
        );
        return;
      }
      const items = channels.map((c) =>
        `$(symbol-event) ${c.name}  [${c.lines.length} lines]`
      );
      vscode.window.showQuickPick(items, {
        title: 'MCP Output Reader — Captured Channels',
        placeHolder: 'Select a channel to view in Output panel'
      }).then((selected) => {
        if (!selected) { return; }
        const name = selected.replace(/^.*? /, '').replace(/  \[.*\]$/, '');
        vscode.commands.executeCommand(
          'workbench.action.output.show',
          { name }
        );
      });
    })
  );

  // 5. Команда: статус сервера
  context.subscriptions.push(
    vscode.commands.registerCommand('mcpOutputReader.showStatus', () => {
      const channels = registry?.getAll() ?? [];
      vscode.window.showInformationMessage(
        `MCP Output Reader is running on http://127.0.0.1:${port}. ` +
        `Capturing ${channels.length} channel(s).`
      );
    })
  );

  vscode.window.showInformationMessage(
    `MCP Output Reader started on http://127.0.0.1:${port}`
  );
}

export function deactivate(): void {
  server?.stop();
  registry?.uninstall();
}

import * as vscode from 'vscode';

export interface ChannelBuffer {
  name: string;
  lines: string[];
  lastUpdated: number;
}

/**
 * ChannelRegistry — центральное хранилище буферов Output-каналов VS Code.
 * Перехватывает vscode.window.createOutputChannel и оборачивает каждый
 * созданный канал прокси-объектом, который дублирует вывод в буфер.
 */
export class ChannelRegistry {
  private buffers = new Map<string, ChannelBuffer>();
  private originalCreate: typeof vscode.window.createOutputChannel;
  private maxLines: number;
  private watchedChannels: string[];

  constructor() {
    this.originalCreate = vscode.window.createOutputChannel.bind(vscode.window);
    const cfg = vscode.workspace.getConfiguration('mcpOutputReader');
    this.maxLines = cfg.get<number>('maxLines', 500);
    this.watchedChannels = cfg.get<string[]>('watchedChannels', []);
  }

  /** Установить перехват createOutputChannel. */
  install(): void {
    const self = this;
    (vscode.window as any).createOutputChannel = function (
      name: string,
      languageIdOrOptions?: string | { log?: boolean }
    ): vscode.OutputChannel {
      const real: vscode.OutputChannel =
        languageIdOrOptions === undefined
          ? self.originalCreate(name)
          : (self.originalCreate as any)(name, languageIdOrOptions);

      if (!self.shouldWatch(name)) {
        return real;
      }

      return self.wrapChannel(name, real);
    };
  }

  /** Восстановить оригинальный createOutputChannel. */
  uninstall(): void {
    (vscode.window as any).createOutputChannel = this.originalCreate;
  }

  /** Обновить настройки (maxLines, watchedChannels) из конфига. */
  reloadConfig(): void {
    const cfg = vscode.workspace.getConfiguration('mcpOutputReader');
    this.maxLines = cfg.get<number>('maxLines', 500);
    this.watchedChannels = cfg.get<string[]>('watchedChannels', []);
  }

  /** Список всех буферизованных каналов. */
  getAll(): ChannelBuffer[] {
    return Array.from(this.buffers.values());
  }

  /** Получить буфер по точному имени (регистронезависимо). */
  getByName(name: string): ChannelBuffer | undefined {
    for (const [key, buf] of this.buffers) {
      if (key.toLowerCase() === name.toLowerCase()) {
        return buf;
      }
    }
    return undefined;
  }

  /** Очистить локальный буфер канала. */
  clearBuffer(name: string): boolean {
    const buf = this.getByName(name);
    if (!buf) { return false; }
    buf.lines = [];
    buf.lastUpdated = Date.now();
    return true;
  }

  // ── private ──────────────────────────────────────────────────────────

  private shouldWatch(name: string): boolean {
    if (this.watchedChannels.length === 0) { return true; }
    return this.watchedChannels.some(
      (w) => name.toLowerCase().includes(w.toLowerCase())
    );
  }

  private pushLines(buf: ChannelBuffer, text: string): void {
    const newLines = text.split(/\r?\n/);
    buf.lines.push(...newLines);
    if (buf.lines.length > this.maxLines) {
      buf.lines = buf.lines.slice(buf.lines.length - this.maxLines);
    }
    buf.lastUpdated = Date.now();
  }

  private wrapChannel(
    name: string,
    real: vscode.OutputChannel
  ): vscode.OutputChannel {
    if (!this.buffers.has(name)) {
      this.buffers.set(name, { name, lines: [], lastUpdated: Date.now() });
    }
    const buf = this.buffers.get(name)!;
    const self = this;

    return {
      get name() { return real.name; },
      append(value: string): void {
        real.append(value);
        self.pushLines(buf, value);
      },
      appendLine(value: string): void {
        real.appendLine(value);
        self.pushLines(buf, value + '\n');
      },
      replace(value: string): void {
        real.replace(value);
        buf.lines = [];
        self.pushLines(buf, value);
      },
      clear(): void {
        real.clear();
        buf.lines = [];
        buf.lastUpdated = Date.now();
      },
      show(...args: any[]): void { (real.show as any)(...args); },
      hide(): void { real.hide(); },
      dispose(): void {
        real.dispose();
        self.buffers.delete(name);
      },
    };
  }
}

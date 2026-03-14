# Руководство по тестированию — MCP Output Reader

> 🇬🇧 [English version / Английская версия](TESTING.md)

## 1. Запуск расширения в режиме разработки

```bash
git clone https://github.com/topwebmaster/vscode-mcp-output-reader.git
cd vscode-mcp-output-reader
npm install
npm run compile
```

Открой папку в VS Code и нажми **F5** — откроется второй экземпляр VS Code (Extension Development Host) с уже загруженным расширением. Проверь **Output** панель → выбери канал **"MCP Output Reader"** — должно быть:

```
[MCP Output Reader] HTTP server listening on port 6070
[MCP Output Reader] stdio/socket server listening on /tmp/vscode-mcp-output-reader.sock
```

---

## 2. Тест HTTP-транспорта через curl

**Инициализация MCP-сессии:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | python3 -m json.tool
```

**Список доступных MCP-инструментов:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | python3 -m json.tool
```

**Список всех захваченных Output-каналов:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_output_channels","arguments":{}}}' \
  | python3 -m json.tool
```

**Чтение последних 20 строк канала (например Python):**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_output_channel","arguments":{"channel":"Python","last_n_lines":20}}}'
```

**Поиск ошибок по всем каналам:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"search_output_channels","arguments":{"query":"error"}}}'
```

---

## 3. Тест stdio-транспорта (Unix socket / Named Pipe)

### Linux / macOS — через socat
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  socat - UNIX-CONNECT:/tmp/vscode-mcp-output-reader.sock
```

### Linux / macOS — через Python
```python
import socket, json

sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/tmp/vscode-mcp-output-reader.sock')

msg = json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}) + "\n"
sock.send(msg.encode())
print(json.loads(sock.recv(4096).decode()))
sock.close()
```

### Windows — через PowerShell
```powershell
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'vscode-mcp-output-reader', 'InOut')
$pipe.Connect(3000)
$writer = New-Object System.IO.StreamWriter($pipe)
$reader = New-Object System.IO.StreamReader($pipe)
$writer.WriteLine('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')
$writer.Flush()
Write-Host $reader.ReadLine()
$pipe.Dispose()
```

---

## 4. Тест команд VS Code

В Extension Development Host нажми **Ctrl+Shift+P** и выполни:

| Команда | Ожидаемый результат |
|---------|--------------------|
| `MCP Output Reader: Show Server Status` | Уведомление с портом, путём к сокету и количеством каналов |
| `MCP Output Reader: List Captured Channels` | QuickPick выпадающий список со всеми захваченными каналами |

---

## 5. Триггер захвата каналов

Каналы перехватываются когда другие расширения их создают. Чтобы заполнить реестр:

1. Открой любой `.py` файл — **Pylance** и **Python** создадут свои Output-каналы
2. Сохрани файл с синтаксической ошибкой — **Ruff** / **ESLint** запишут диагностику
3. Запусти задачу или сборку — любое расширение, пишущее в Output, будет захвачено
4. Вызови `list_output_channels` — увидишь все каналы в списке

---

## 6. Подключение к Claude Desktop (реальный MCP-тест)

Отредактируй конфигурационный файл Claude Desktop:

- **Linux:** `~/.config/claude/claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vscode-output": {
      "socketPath": "/tmp/vscode-mcp-output-reader.sock"
    }
  }
}
```

Для Windows:
```json
{
  "mcpServers": {
    "vscode-output": {
      "socketPath": "\\\\.\\pipe\\vscode-mcp-output-reader"
    }
  }
}
```

Перезапусти Claude Desktop. Инструменты `list_output_channels`, `read_output_channel`, `search_output_channels` и `clear_output_channel` появятся в списке инструментов.

---

## 7. Подключение к Cursor (HTTP)

В настройках Cursor → MCP Servers:
```json
{
  "mcpServers": {
    "vscode-output": {
      "url": "http://127.0.0.1:6070"
    }
  }
}
```

---

## 8. Быстрый чеклист проверки

| Проверка | Как проверить |
|----------|---------------|
| HTTP-сервер запущен | Output → "MCP Output Reader": `listening on port 6070` |
| Сокет создан | `ls /tmp/vscode-mcp-output-reader.sock` (Linux/macOS) |
| HTTP отвечает | `curl http://127.0.0.1:6070` — не `Connection refused` |
| Каналы захвачены | Открой `.py` файл → `list_output_channels` → Python/Pylance видны |
| Поиск работает | `search_output_channels` с `"query":"import"` возвращает результаты |
| Настройка транспорта | Измени `mcpOutputReader.transport` на `"http"` или `"stdio"`, перезагрузи окно, проверь что только один сервер стартовал |

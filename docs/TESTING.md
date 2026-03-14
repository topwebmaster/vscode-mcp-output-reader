# Testing Guide — MCP Output Reader

> 🇷🇺 [Russian version / Русская версия](TESTING.ru.md)

## 1. Launch the extension in development mode

```bash
git clone https://github.com/topwebmaster/vscode-mcp-output-reader.git
cd vscode-mcp-output-reader
npm install
npm run compile
```

Open the folder in VS Code and press **F5** — a second VS Code window (Extension Development Host) will open with the extension already loaded. Check the **Output** panel → select channel **"MCP Output Reader"** — you should see:

```
[MCP Output Reader] HTTP server listening on port 6070
[MCP Output Reader] stdio/socket server listening on /tmp/vscode-mcp-output-reader.sock
```

---

## 2. Test HTTP transport with curl

**Initialize MCP session:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  | python3 -m json.tool
```

**List available MCP tools:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | python3 -m json.tool
```

**List all captured Output channels:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_output_channels","arguments":{}}}' \
  | python3 -m json.tool
```

**Read last 20 lines from a channel (e.g. Python):**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"read_output_channel","arguments":{"channel":"Python","last_n_lines":20}}}'
```

**Search for errors across all channels:**
```bash
curl -s -X POST http://127.0.0.1:6070 \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"search_output_channels","arguments":{"query":"error"}}}'
```

---

## 3. Test stdio transport (Unix socket / Named Pipe)

### Linux / macOS — via socat
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  socat - UNIX-CONNECT:/tmp/vscode-mcp-output-reader.sock
```

### Linux / macOS — via Python
```python
import socket, json

sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/tmp/vscode-mcp-output-reader.sock')

msg = json.dumps({"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}) + "\n"
sock.send(msg.encode())
print(json.loads(sock.recv(4096).decode()))
sock.close()
```

### Windows — via PowerShell
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

## 4. Test VS Code commands

In the Extension Development Host press **Ctrl+Shift+P** and run:

| Command | Expected result |
|---------|----------------|
| `MCP Output Reader: Show Server Status` | Notification with port, socket path and channel count |
| `MCP Output Reader: List Captured Channels` | QuickPick dropdown with all captured channel names |

---

## 5. Trigger channel capture

Channels are captured lazily when other extensions create them. To populate the registry:

1. Open any `.py` file — **Pylance** and **Python** extension create their Output channels
2. Save a file with a syntax error — **Ruff** / **ESLint** write diagnostics
3. Run a task or build — any extension that writes to Output panel will be captured
4. Call `list_output_channels` — you should see them all listed

---

## 6. Connect to Claude Desktop (real MCP test)

Edit the Claude Desktop config file:

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

For Windows:
```json
{
  "mcpServers": {
    "vscode-output": {
      "socketPath": "\\\\.\\pipe\\vscode-mcp-output-reader"
    }
  }
}
```

Restart Claude Desktop. The tools `list_output_channels`, `read_output_channel`, `search_output_channels` and `clear_output_channel` will appear in the tool picker.

---

## 7. Connect to Cursor (HTTP)

In Cursor settings → MCP Servers:
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

## 8. Quick sanity checklist

| Check | How to verify |
|-------|---------------|
| HTTP server started | Output → "MCP Output Reader": `listening on port 6070` |
| Socket created | `ls /tmp/vscode-mcp-output-reader.sock` (Linux/macOS) |
| HTTP responds | `curl http://127.0.0.1:6070` — no `Connection refused` |
| Channels captured | Open `.py` file → `list_output_channels` → Python/Pylance visible |
| Search works | `search_output_channels` with `"query":"import"` returns results |
| Transport setting | Change `mcpOutputReader.transport` to `"http"` or `"stdio"`, reload window, verify only one server starts |

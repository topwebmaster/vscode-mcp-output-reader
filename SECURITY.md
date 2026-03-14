# Security Policy

## Supported Versions

| Version | Supported |
|---------|----------|
| 0.1.x | ✅ |

## Scope

**MCP Output Reader** is a VS Code extension that runs an MCP server **locally** (bound to `127.0.0.1` or a Unix Domain Socket). It does **not** make outbound network requests, store credentials, or expose any service to the internet.

Potential security concerns in scope:
- The HTTP server accidentally binding to `0.0.0.0` instead of `127.0.0.1`
- Buffer content leaking to unexpected local processes
- Dependency vulnerabilities

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

Instead, open a [GitHub Security Advisory](https://github.com/topwebmaster/vscode-mcp-output-reader/security/advisories/new) (private disclosure).

Please include:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if you have one)

You can expect a response within **7 days**.

## Security Best Practices for Users

- Keep the extension updated to the latest version
- Do not expose port `6070` (or the configured port) outside `127.0.0.1` via firewall rules or port forwarding
- The stdio socket path (`/tmp/vscode-mcp-output-reader.sock`) is accessible to all local users — set appropriate file permissions if working in a shared environment
- Treat Output channel content as potentially sensitive (it may contain tokens, passwords, or PII logged by other extensions)

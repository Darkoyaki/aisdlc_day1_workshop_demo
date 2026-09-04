# Snip CLI

A zero-dependency Node CLI (CommonJS, uses the global `fetch`) for the Snip URL
shortener backend.

## Install / run

No `npm install` needed — zero dependencies. Run directly:

```bash
node cli.js help
```

Or use one of the tiny wrapper scripts that forward args to `cli.js`:

```bash
./snip ls          # macOS/Linux
snip.cmd ls         # Windows cmd.exe
./snip.ps1 ls       # PowerShell
```

If installed as an npm package (`npm install -g .` or linked via the `bin`
entry in `package.json`), the `snip` command is available directly.

## Commands

| Command           | Behavior |
|--------------------|----------|
| `snip add <url>`   | `POST /api/links`; prints the returned `shortUrl` |
| `snip ls`          | `GET /api/links`; prints an aligned `code / hits / url` table (`No links yet.` when empty) |
| `snip open <code>` | `GET /:code` (manual redirect); opens the `Location` target in your OS browser |
| `snip help`        | Usage text (also shown with no arguments) |

Errors — bad input, an unknown code, or an unreachable backend — print to
stderr and exit with status `1`.

## Configuration

| Variable   | Default                 | Purpose |
|------------|--------------------------|---------|
| `SNIP_API` | `http://localhost:3000` | Base URL of the Snip backend |

## Example

```bash
SNIP_API=http://localhost:3000 node cli.js add https://example.com
node cli.js ls
node cli.js open <code>
```

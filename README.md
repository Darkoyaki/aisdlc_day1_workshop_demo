# Snip backend

A tiny URL shortener backend: a single-file [Bun](https://bun.sh) server
(`server.js`) with **zero npm dependencies**, storing links in an in-memory
`Map`. Restarting the server clears all links, by design.

## API

| Method | Path         | Body                       | Response |
|--------|--------------|-----------------------------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }`   | `201 { code, url, shortUrl, hits, createdAt }` · `400` on invalid JSON/URL |
| `GET`  | `/api/links` | —                           | `200` array of all links |
| `GET`  | `/:code`     | —                           | `302` redirect to the original URL (+1 hit) · `404` if unknown |

- Codes are 6 random base62 characters.
- `hits` starts at `0`; `createdAt` is an ISO timestamp.
- CORS is wide open, including `OPTIONS` preflight, so a browser app on
  another origin can call this API.

## Configuration (environment variables)

| Variable     | Default | Purpose |
|--------------|---------|---------|
| `PORT`       | `3000`  | Port the server listens on. |
| `BASE_URL`   | `https://$RAILWAY_PUBLIC_DOMAIN` if set, else `http://localhost:$PORT` | Origin used to build `shortUrl` values. |
| `PUBLIC_DIR` | unset   | When set, also serve static files from this folder (`/` → `index.html`). An existing static file wins over a same-named short code. |

## Run

```bash
bun install   # no-op, zero dependencies
bun start
```

## Try it

```bash
curl -X POST localhost:3000/api/links -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
curl localhost:3000/api/links
curl -i localhost:3000/<code>
```

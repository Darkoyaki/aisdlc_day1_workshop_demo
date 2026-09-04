# Snip

**One backend, two very different clients.** Snip is a tiny URL shortener that
demonstrates a **branch-per-layer + git submodule** repo architecture: each
part of the app lives on its own orphan branch (independent history, files at
the branch root), and this `main` branch mounts them all as submodules.

```
one repo ──┬── backend    Bun API server (zero deps, in-memory Map)
           ├── frontend   Angular 19 web app
           ├── cli        zero-dep Node CLI
           ├── bundle     GENERATED whole-app release (server + built UI + CLI)
           └── main       superproject: .gitmodules + build script + this README
```

## The API contract

One backend, consumed identically by the web UI and the CLI:

| Method | Path         | Body                       | Response |
|--------|--------------|-----------------------------|----------|
| `POST` | `/api/links` | `{ "url": "https://…" }`   | `201 { code, url, shortUrl, hits, createdAt }` · `400` on invalid JSON/URL |
| `GET`  | `/api/links` | —                           | `200` array of all links |
| `GET`  | `/:code`     | —                           | `302` redirect to the original URL (+1 hit) · `404` if unknown |

Storage is an in-memory `Map` — restarts clear all links, by design. Change
the contract everywhere or nowhere — the backend, frontend, and CLI all
depend on it.

## Layout

| Path        | Branch     | Tech |
|-------------|------------|------|
| `backend/`  | `backend`  | Bun, zero npm dependencies |
| `frontend/` | `frontend` | Angular 19 |
| `cli/`      | `cli`      | Node (CommonJS, zero npm dependencies) |
| `bundle/`   | `bundle`   | **Generated** — backend + built frontend + cli, assembled for release. Never hand-edit. |
| `main`      | `main`     | This superproject: `.gitmodules` + `scripts/build-bundle.mjs` + docs |

## Clone

Submodules are empty in a plain clone — always pull them in:

```bash
git clone --recurse-submodules https://github.com/Darkoyaki/aisdlc_day1_workshop_demo.git
```

(Already cloned without `--recurse-submodules`? Run
`git submodule update --init --recursive`.)

## Run everything

Three terminals, from the `main` checkout:

```bash
cd backend  && bun start                 # :3000
cd frontend && npm install && npx ng serve   # :4200
cd cli      && node cli.js ls            # talks to :3000
```

## Update workflow

Each layer is a full checkout of its own branch. After changing one:

```bash
cd backend                                        # edit, then:
git add -A && git commit -m "..." && git push          # advances origin/backend

cd ..                                              # back in the superproject
git submodule update --remote backend                  # move the pointer
git add backend && git commit -m "Bump backend submodule" && git push
```

The layer commit and the pointer-bump commit are two separate records — the
one extra step submodules require. In exchange, `main` is always a pinned,
reproducible snapshot of exactly which commit of each layer makes up the app.

## The `bundle` release

`bundle` is **generated output**, not source — never edit it by hand.
[`scripts/build-bundle.mjs`](scripts/build-bundle.mjs) (zero deps, cross-platform)
rebuilds it from the current `backend`/`frontend`/`cli` branch tips:

```bash
node scripts/build-bundle.mjs           # assemble + commit locally (safe no-op if unchanged)
node scripts/build-bundle.mjs --push    # also push the bundle branch and main
```

It updates the three submodules to their branch tips, builds the frontend,
copies `backend/server.js` + `cli/cli.js` + the built UI into `bundle/`, and
writes a `.env` (`PUBLIC_DIR=./public`, so the Bun server also serves the UI),
`package.json`, `Dockerfile`, `.dockerignore`, and `railway.json`. Then:

```bash
cd bundle && bun start        # one process: web UI + API + redirects on :3000
docker build -t snip . && docker run --rm -p 3000:3000 snip   # same, via Docker
```

// Snip backend — a tiny URL shortener.
// Zero npm dependencies: uses only Bun's built-in APIs.

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;

/** In-memory storage. Restarts clear all links, by design. */
const links = new Map();

function randomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

function generateUniqueCode() {
  let code = randomCode();
  while (links.has(code)) {
    code = randomCode();
  }
  return code;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toPublicLink(record) {
  return {
    code: record.code,
    url: record.url,
    shortUrl: `${BASE_URL}/${record.code}`,
    hits: record.hits,
    createdAt: record.createdAt,
  };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

async function handleCreateLink(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = payload && payload.url;
  if (!isValidHttpUrl(url)) {
    return jsonResponse(
      { error: "Body must be { \"url\": \"https://…\" } with an http(s) URL" },
      { status: 400 }
    );
  }

  const code = generateUniqueCode();
  const record = {
    code,
    url,
    hits: 0,
    createdAt: new Date().toISOString(),
  };
  links.set(code, record);

  return jsonResponse(toPublicLink(record), { status: 201 });
}

function handleListLinks() {
  const all = [...links.values()].map(toPublicLink);
  return jsonResponse(all, { status: 200 });
}

function handleRedirect(code) {
  const record = links.get(code);
  if (!record) {
    return jsonResponse({ error: "Unknown code" }, { status: 404 });
  }
  record.hits += 1;
  return new Response(null, {
    status: 302,
    headers: { Location: record.url, ...CORS_HEADERS },
  });
}

async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  const relative = pathname === "/" ? "/index.html" : pathname;
  const filePath = `${PUBLIC_DIR}${relative}`;
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file, { headers: { ...CORS_HEADERS } });
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (pathname === "/api/links") {
      if (method === "POST") return handleCreateLink(req);
      if (method === "GET") return handleListLinks();
      return jsonResponse({ error: "Method not allowed" }, { status: 405 });
    }

    // A short code always wins... unless an existing static file shares its name.
    const staticMatch = await serveStatic(pathname);
    if (staticMatch) return staticMatch;

    if (method === "GET" && /^\/[^/]+$/.test(pathname)) {
      const code = pathname.slice(1);
      return handleRedirect(code);
    }

    return jsonResponse({ error: "Not found" }, { status: 404 });
  },
});

console.log(`Snip backend listening on http://localhost:${server.port} (BASE_URL=${BASE_URL})`);

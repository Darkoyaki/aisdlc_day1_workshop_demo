#!/usr/bin/env node
'use strict';

// Snip CLI — zero-dependency Node client for the Snip backend (see server.js on
// the "backend" branch). Uses the global fetch built into modern Node, so there
// are no npm dependencies at all.

const { spawn } = require('child_process');

const API_BASE = process.env.SNIP_API || 'http://localhost:3000';

function usage() {
  return [
    'Usage: snip <command> [args]',
    '',
    'Commands:',
    '  snip add <url>    Create a short link for <url>, print the shortUrl',
    '  snip ls           List all links as an aligned code/hits/url table',
    "  snip open <code>  Open a short code's target URL in the browser",
    '  snip help         Show this help',
    '',
    'Environment:',
    '  SNIP_API   Backend base URL (default: http://localhost:3000)',
  ].join('\n');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function fetchJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    fail(`Could not reach backend at ${API_BASE}: ${err.message}`);
    return null;
  }

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      fail(`Backend returned an unexpected response (status ${res.status})`);
      return null;
    }
  }

  if (!res.ok) {
    fail(body && body.error ? body.error : `Request failed (status ${res.status})`);
    return null;
  }

  return body;
}

async function cmdAdd(url) {
  if (!url) {
    fail('Usage: snip add <url>');
    return;
  }

  const link = await fetchJson(`${API_BASE}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  console.log(link.shortUrl);
}

async function cmdLs() {
  const links = await fetchJson(`${API_BASE}/api/links`);

  if (!Array.isArray(links) || links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const codeWidth = Math.max(4, ...links.map((link) => String(link.code).length));
  const hitsWidth = Math.max(4, ...links.map((link) => String(link.hits).length));

  console.log(`${'CODE'.padEnd(codeWidth)}  ${'HITS'.padStart(hitsWidth)}  URL`);
  for (const link of links) {
    console.log(
      `${String(link.code).padEnd(codeWidth)}  ${String(link.hits).padStart(hitsWidth)}  ${link.url}`
    );
  }
}

async function cmdOpen(code) {
  if (!code) {
    fail('Usage: snip open <code>');
    return;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}/${code}`, { redirect: 'manual' });
  } catch (err) {
    fail(`Could not reach backend at ${API_BASE}: ${err.message}`);
    return;
  }

  if (res.status === 404) {
    fail(`Unknown code: ${code}`);
    return;
  }

  const location = res.headers.get('location');
  if (res.status < 300 || res.status >= 400 || !location) {
    fail(`Expected a redirect from the backend, got status ${res.status}`);
    return;
  }

  openInBrowser(location);
  console.log(location);
}

function openInBrowser(target) {
  const platform = process.platform;
  let command;
  let args;

  if (platform === 'win32') {
    // "start" is a cmd.exe builtin; the empty title avoids quoting pitfalls
    // when the URL itself contains quotes.
    command = 'cmd';
    args = ['/c', 'start', '""', target];
  } else if (platform === 'darwin') {
    command = 'open';
    args = [target];
  } else {
    command = 'xdg-open';
    args = [target];
  }

  spawn(command, args, { stdio: 'ignore', detached: true }).unref();
}

async function main() {
  const [, , cmd, ...rest] = process.argv;

  switch (cmd) {
    case undefined:
    case 'help':
    case '-h':
    case '--help':
      console.log(usage());
      return;
    case 'add':
      await cmdAdd(rest[0]);
      return;
    case 'ls':
      await cmdLs();
      return;
    case 'open':
      await cmdOpen(rest[0]);
      return;
    default:
      fail(`Unknown command: ${cmd}\n\n${usage()}`);
  }
}

main().catch((err) => fail(err && err.message ? err.message : String(err)));

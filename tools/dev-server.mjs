/* -----------------------------------------------------------------------------
   A small local stand-in for Vercel, so the app can be tried out before it is
   deployed. Serves /public as static files and routes /api/* to the handlers.

     npm run dev     ->  http://localhost:3000

   Note: iPhone push cannot be tested here. Web Push on iOS requires HTTPS and
   the app to be on the Home Screen, so notifications only really work once it
   is deployed. Everything else works fine locally.
   ----------------------------------------------------------------------------- */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.PORT || 3000);

// Minimal .env.local support so local runs match the deployed configuration.
const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith('/api/')) {
    const route = join(ROOT, normalize(pathname) + '.js');
    if (!route.startsWith(join(ROOT, 'api')) || !existsSync(route)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No such route' }));
    }
    try {
      const mod = await import(pathToFileURL(route).href);
      req.query = Object.fromEntries(url.searchParams);
      await mod.default(req, res);
    } catch (error) {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  let file = join(PUBLIC, normalize(pathname));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(403);
    return res.end('Nope');
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(PUBLIC, 'index.html'); // single page app fallback
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  Words to "Leave, Bye." running at http://localhost:${PORT}\n`);
});

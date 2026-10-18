// Loopback-only developer server. No directory listing, network writes or hidden files.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json; charset=utf-8'
}));
const contains = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);
const hidden = value => value.split(/[\\/]/).some(part => part === '..' || part.startsWith('.') || part === 'node_modules');

export function createStaticServer({ root = ROOT } = {}) {
  const realRoot = fs.realpathSync(root);
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-cache');
    const end = (code, message) => {
      res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(req.method === 'HEAD' ? undefined : message + '\n');
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD'); return end(405, 'Method not allowed');
    }
    let requestPath;
    try { requestPath = decodeURIComponent((req.url || '/').split(/[?#]/, 1)[0]); }
    catch { return end(400, 'Invalid URL encoding'); }
    // Inspect raw decoded segments before path.resolve can normalize traversal away.
    if (!requestPath.startsWith('/') || /[\\\0]/.test(requestPath)) return end(400, 'Invalid path');
    const segments = requestPath.split('/');
    if (hidden(segments.join('/'))) return end(403, 'Path not served');
    const candidate = path.resolve(realRoot, '.' + requestPath);
    if (!contains(realRoot, candidate)) return end(403, 'Path not served');
    try {
      let real = await fs.promises.realpath(candidate);
      if (!contains(realRoot, real)) return end(403, 'Path not served');
      if (hidden(path.relative(realRoot, real))) return end(403, 'Path not served');
      let stat = await fs.promises.stat(real);
      if (stat.isDirectory()) {
        real = await fs.promises.realpath(path.join(real, 'index.html'));
        if (!contains(realRoot, real)) return end(403, 'Path not served');
        if (hidden(path.relative(realRoot, real))) return end(403, 'Path not served');
        stat = await fs.promises.stat(real);
      }
      if (!stat.isFile()) return end(404, 'Not found');
      res.writeHead(200, { 'Content-Type': MIME.get(path.extname(real).toLowerCase()) || 'application/octet-stream', 'Content-Length': stat.size });
      if (req.method === 'HEAD') return res.end();
      const stream = fs.createReadStream(real);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      return end(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, error.code === 'ENOENT' ? 'Not found' : 'Could not serve file');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  const server = createStaticServer();
  server.on('error', error => { console.error(`Developer server: ${error.message}`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`CityMETER: Yolk · http://127.0.0.1:${port}/`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

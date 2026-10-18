import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createStaticServer } from './serve.mjs';

let root, outside, server, port;
before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'chainat-server-test-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'chainat-outside-test-'));
  for (const [file, body] of Object.entries({ 'index.html': '<h1>Public demo</h1>', 'app.js': 'export const ready = true;', 'area.geojson': '{}', 'site.webmanifest': '{}', '.env': 'private fixture' })) fs.writeFileSync(path.join(root, file), body);
  fs.mkdirSync(path.join(root, 'empty'));
  fs.writeFileSync(path.join(outside, 'hidden.txt'), 'outside fixture');
  fs.symlinkSync(path.join(outside, 'hidden.txt'), path.join(root, 'escape.txt'));
  fs.symlinkSync(path.join(root, '.env'), path.join(root, 'alias.txt'));
  server = createStaticServer({ root });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  port = server.address().port;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true });
});
function request(urlPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method }, res => {
      let body = ''; res.setEncoding('utf8'); res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.setTimeout(5000, () => req.destroy(new Error('Loopback request timed out')));
    req.on('error', reject); req.end();
  });
}
test('server binds loopback and serves the app with a safe browser referrer policy', async () => {
  assert.equal(server.address().address, '127.0.0.1');
  const r = await request('/?v=demand'); assert.equal(r.status, 200); assert.match(r.body, /Public demo/);
  assert.match(r.headers['content-type'], /^text\/html/); assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['referrer-policy'], 'strict-origin-when-cross-origin');
});
test('JS, GeoJSON and web manifest have usable MIME types; HEAD has no body', async () => {
  for (const [file, type] of [['/app.js', 'text/javascript'], ['/area.geojson', 'application/geo+json'], ['/site.webmanifest', 'application/manifest+json']]) {
    const r = await request(file, 'HEAD'); assert.equal(r.status, 200); assert.ok(r.headers['content-type'].startsWith(type)); assert.equal(r.body, '');
  }
});
test('traversal, encoded traversal, hidden paths and symlink escape are denied', async () => {
  for (const file of ['/../hidden.txt', '/%2e%2e/hidden.txt', '/%2eenv', '/.git/config', '/node_modules/package.json', '/escape.txt', '/alias.txt']) assert.equal((await request(file)).status, 403, file);
  assert.equal((await request('/%ZZ')).status, 400);
  assert.equal((await request('/bad%5cpath')).status, 400);
});
test('no directory listing or write methods; unknown files return 404', async () => {
  assert.equal((await request('/empty/')).status, 404);
  assert.equal((await request('/missing.json')).status, 404);
  const r = await request('/index.html', 'POST'); assert.equal(r.status, 405); assert.equal(r.headers.allow, 'GET, HEAD');
});

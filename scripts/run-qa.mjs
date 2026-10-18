// Starts an isolated local server automatically. Set BASE_URL for an explicit existing/live site.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { createStaticServer, ROOT } from './serve.mjs';

let server;
let base = process.env.BASE_URL;
if (!base) {
  server = createStaticServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/`;
}
const child = spawn(process.execPath, [path.join(ROOT, 'scripts/qa.mjs'), ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, BASE_URL: base } });
let exitCode;
try {
  exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => resolve(signal ? 1 : code ?? 1)); });
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
}
process.exitCode = exitCode;

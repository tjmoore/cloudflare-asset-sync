import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { Deployer } from './deployer.js';

const env = process.env;
const watchDir = path.resolve(env.WATCH_DIR || './site');
const debounceMs = Number(env.DEBOUNCE_MS || 5000);
const wranglerArgs = (env.WRANGLER_ARGS || '').split(/\s+/).filter(Boolean);
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

if (!existsSync(watchDir)) {
  console.error(`WATCH_DIR does not exist: ${watchDir}`);
  process.exit(1);
}

function runWrangler() {
  return new Promise((resolve, reject) => {
    log('Deploying with wrangler...');
    const child = spawn('npx', ['--no-install', 'wrangler', 'deploy', ...wranglerArgs], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? (log('Deploy complete'), resolve()) : reject(new Error(`wrangler exited with code ${code}`)),
    );
  });
}

const deployer = new Deployer({
  deploy: runWrangler,
  debounceMs,
  maxRetries: Number(env.MAX_RETRIES || 3),
  retryDelayMs: Number(env.RETRY_DELAY_MS || 10000),
  log,
});

const watcher = chokidar.watch(watchDir, {
  ignoreInitial: true,
  ignored: (p) => p !== watchDir && /(^|[\\/])(\.[^\\/]+|[^\\/]*~|[^\\/]*\.(swp|tmp))$/.test(p),
  usePolling: env.USE_POLLING === 'true',
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
});

watcher.on('all', (event, file) => {
  log(`${event}: ${path.relative(watchDir, file)}`);
  deployer.notify();
});
watcher.on('error', (err) => log(`Watcher error: ${err.message}`));

log(`Watching ${watchDir} (debounce ${debounceMs}ms)`);
if (env.DEPLOY_ON_START !== 'false') deployer.notify();

async function shutdown() {
  log('Shutting down...');
  await watcher.close();
  await deployer.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

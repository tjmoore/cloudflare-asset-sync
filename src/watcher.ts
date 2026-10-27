// Watcher and deployer setup for Cloudflare Workers site.

import { existsSync } from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { Deployer } from './deployer.js';
import { RobotsGenerator } from './robotsGenerator.js';
import { SitemapGenerator } from './sitemapGenerator.js';
import { WranglerDeploy } from './wranglerDeploy.js';
import { loadEnvFile } from 'node:process';

// Load environment variables from .env file if it exists, else rely on process environment variables.
if (existsSync('.env')) {
  loadEnvFile();
}

const env = process.env;
const watchDir = path.resolve(env.WATCH_DIR || './site');
const siteUrl = env.SITE_URL || '';
const debounceMs = Number(env.DEBOUNCE_MS || 5000);
const wranglerArgs = (env.WRANGLER_ARGS || '').split(/\s+/).filter(Boolean);
const log = (msg: string): void => console.log(`[${new Date().toISOString()}] ${msg}`);

if (!existsSync(watchDir)) {
  console.error(`WATCH_DIR does not exist: ${watchDir}`);
  process.exit(1);
}

const sitemap = new SitemapGenerator(watchDir, siteUrl, log, {
  changeFreq: env.SITEMAP_CHANGEFREQ_DEFAULT || 'monthly',
  priority: env.SITEMAP_PRIORITY_DEFAULT || '0.5',
});
const robots = new RobotsGenerator(watchDir, siteUrl, log);
const wrangler = new WranglerDeploy(wranglerArgs, log);

/**
 * Generates the sitemap and robots.txt, then deploys with wrangler.
 */
async function deploy(): Promise<void> {
  await sitemap.generate();
  await robots.generate();
  await wrangler.run();

  if (env.CLEANUP_GENERATED_FILES === 'true') {
    // Cleanup generated files after deployment
    await sitemap.cleanup();
    await robots.cleanup();
  }
}

/**
 * Creates a deployer instance with the specified configuration.
 */
const deployer = new Deployer({
  deploy,
  debounceMs,
  maxRetries: Number(env.MAX_RETRIES || 3),
  retryDelayMs: Number(env.RETRY_DELAY_MS || 10000),
  log,
});

/**
 * Sets up the file watcher for the specified directory.
 */
const watcher = chokidar.watch(watchDir, {
  ignoreInitial: true,
  ignored: (p) =>
    p !== watchDir &&
    (path.relative(watchDir, p) === SitemapGenerator.fileName ||
     path.relative(watchDir, p) === RobotsGenerator.fileName ||
      /(^|[\\/])(\.[^\\/]+|[^\\/]*~|[^\\/]*\.(swp|tmp))$/.test(p)),
  backend: env.USE_POLLING === 'true' ? 'polling' : 'auto',
  awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
});

/**
 * Handles file change events and notifies the deployer.
 */
watcher.on('all', (event, file) => {
  log(`${event}: ${path.relative(watchDir, file)}`);
  deployer.notify();
});

/**
 * Handles watcher errors.
 */
watcher.on('error', (err: unknown) => log(`Watcher error: ${err instanceof Error ? err.message : String(err)}`));

log(`Watching ${watchDir} (debounce ${debounceMs}ms)`);
if (env.DEPLOY_ON_START !== 'false') deployer.notify();

/**
 * Shuts down the watcher and deployer gracefully.
 */
async function shutdown(): Promise<void> {
  log('Shutting down...');
  await watcher.close();
  await deployer.stop();
  process.exit(0);
}

/**
 * Handles process shutdown signals.
 */
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

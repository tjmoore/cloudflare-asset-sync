import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { RobotsGenerator } from '../src/robotsGenerator.js';

describe('RobotsGenerator', () => {
  let dir: string;
  const robotsPath = () => path.join(dir, 'robots.txt');

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'robots-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates a default robots.txt with sitemap reference', async () => {
    await new RobotsGenerator(dir, 'https://example.com/').generate();
    assert.equal(
      await readFile(robotsPath(), 'utf8'),
      'User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n',
    );
  });

  it('appends the sitemap reference to an existing file', async () => {
    await writeFile(robotsPath(), 'User-agent: *\nDisallow: /private');
    await new RobotsGenerator(dir, 'https://example.com').generate();
    assert.equal(
      await readFile(robotsPath(), 'utf8'),
      'User-agent: *\nDisallow: /private\n\nSitemap: https://example.com/sitemap.xml\n',
    );
  });

  it('leaves the file untouched when the reference is present', async () => {
    const content = 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n';
    await writeFile(robotsPath(), content);
    const before = (await stat(robotsPath())).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    await new RobotsGenerator(dir, 'https://example.com').generate();
    assert.equal(await readFile(robotsPath(), 'utf8'), content);
    assert.equal((await stat(robotsPath())).mtimeMs, before);
  });

  it('does nothing when no base URL is set', async () => {
    await new RobotsGenerator(dir, '').generate();
    await assert.rejects(stat(robotsPath()));
  });
});

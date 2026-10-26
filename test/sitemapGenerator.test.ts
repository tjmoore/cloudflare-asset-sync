import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { SitemapGenerator } from '../src/sitemapGenerator.js';

const sampleSite = path.resolve('site');

describe('SitemapGenerator', () => {
  let dir: string;
  const sitemapPath = () => path.join(dir, 'sitemap.xml');

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'sitemap-'));
    await cp(sampleSite, dir, { recursive: true });
    await rm(sitemapPath(), { force: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('lists html pages from the sample site', async () => {
    await new SitemapGenerator(dir, 'https://example.com/').generate();
    const xml = await readFile(sitemapPath(), 'utf8');
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/example\.com\/folder\/<\/loc>/);
    assert.doesNotMatch(xml, /styles\.css|bod\.jpg/);
    assert.equal(xml.match(/<url>/g)?.length, 2);
  });

  it('writes lastmod from file mtime, plus default changefreq and priority', async () => {
    const mtime = new Date('2024-03-05T06:07:08.999Z');
    await utimes(path.join(dir, 'index.html'), mtime, mtime);
    await new SitemapGenerator(dir, 'https://example.com').generate();
    const xml = await readFile(sitemapPath(), 'utf8');
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>\s*<lastmod>2024-03-05T06:07:08Z<\/lastmod>/);
    assert.equal(xml.match(/<changefreq>monthly<\/changefreq>/g)?.length, 2);
    assert.equal(xml.match(/<priority>0\.5<\/priority>/g)?.length, 2);
  });

  it('uses overridden changefreq and priority', async () => {
    await new SitemapGenerator(dir, 'https://example.com', () => {}, {
      changeFreq: 'weekly',
      priority: '0.8',
    }).generate();
    const xml = await readFile(sitemapPath(), 'utf8');
    assert.equal(xml.match(/<changefreq>weekly<\/changefreq>/g)?.length, 2);
    assert.equal(xml.match(/<priority>0\.8<\/priority>/g)?.length, 2);
  });

  it('skips generation when no base URL is set', async () => {
    await new SitemapGenerator(dir, '').generate();
    await assert.rejects(stat(sitemapPath()));
  });

  it('does not rewrite an unchanged sitemap', async () => {
    const generator = new SitemapGenerator(dir, 'https://example.com');
    await generator.generate();
    const first = (await stat(sitemapPath())).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    await generator.generate();
    assert.equal((await stat(sitemapPath())).mtimeMs, first);
  });

  it('includes newly added pages and escapes special characters', async () => {
    await writeFile(path.join(dir, 'a&b.html'), '<html></html>');
    await new SitemapGenerator(dir, 'https://example.com').generate();
    const xml = await readFile(sitemapPath(), 'utf8');
    assert.match(xml, /https:\/\/example\.com\/a&amp;b\.html/);
  });
});

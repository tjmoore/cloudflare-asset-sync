import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { SitemapGenerator } from './sitemapGenerator.js';

/**
 * Creates or updates robots.txt so it references the sitemap.
 */
export class RobotsGenerator {
  static readonly fileName = 'robots.txt';
  static readonly defaultContent = 'User-agent: *\nAllow: /\n';

  private newFile: boolean = false;

  /**
   * @param siteDir Directory containing the site files.
   * @param baseUrl Public base URL of the site (e.g. https://example.com).
   * @param log Logging function.
   */
  constructor(
    private readonly siteDir: string,
    private readonly baseUrl: string,
    private readonly log: (msg: string) => void = () => {},
  ) {}

  /**
   * Creates robots.txt with defaults if missing, and adds the Sitemap reference if not present.
   * Skipped when no base URL is configured.
   */
  async generate(): Promise<void> {
    if (!this.baseUrl) return;
    const sitemapUrl = `${this.baseUrl.replace(/\/+$/, '')}/${SitemapGenerator.fileName}`;
    const target = path.join(this.siteDir, RobotsGenerator.fileName);
    const existing = await readFile(target, 'utf8').catch(() => null);

    const content = existing ?? RobotsGenerator.defaultContent;
    const hasReference = content
      .split(/\r?\n/)
      .some((line) => /^\s*sitemap\s*:/i.test(line) && line.replace(/^[^:]*:/, '').trim() === sitemapUrl);
    if (existing !== null && hasReference) return;

    const separator = content.endsWith('\n') ? '' : '\n';
    const updated = hasReference ? content : `${content}${separator}\nSitemap: ${sitemapUrl}\n`;
    await writeFile(target, updated, 'utf8');
    this.newFile = existing === null;
    this.log(this.newFile ? 'robots.txt created' : 'robots.txt updated with sitemap reference');
  }

  /**
   * Removes the generated robots.txt file.
   */
  async cleanup(): Promise<void> {
    if (!this.newFile) return;
    const target = path.join(this.siteDir, RobotsGenerator.fileName);
    await rm(target);
  }
}
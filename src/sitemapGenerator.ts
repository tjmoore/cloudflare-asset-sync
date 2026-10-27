import { readdir, readFile, stat, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

/**
 * Default values applied to every sitemap entry.
 */
export interface SitemapOptions {
  /** Default `changefreq` value (default 'monthly'). */
  changeFreq?: string;
  /** Default `priority` value (default '0.5'). */
  priority?: string;
}

/**
 * Generates a sitemap.xml from the HTML files in the site directory.
 */
export class SitemapGenerator {
  static readonly fileName = 'sitemap.xml';
  private readonly changeFreq: string;
  private readonly priority: string;

  private newFile: boolean = false;

  /**
   * @param siteDir Directory containing the site files.
   * @param baseUrl Public base URL of the site (e.g. https://example.com).
   * @param log Logging function.
   * @param options Default changefreq and priority for each entry.
   */
  constructor(
    private readonly siteDir: string,
    private readonly baseUrl: string,
    private readonly log: (msg: string) => void = () => {},
    options: SitemapOptions = {},
  ) {
    this.changeFreq = options.changeFreq || 'monthly';
    this.priority = options.priority || '0.5';
  }

  /**
   * Generates the sitemap and writes it to the site directory if changed.
   * Skipped when no base URL is configured.
   */
  async generate(): Promise<void> {
    if (!this.baseUrl) {
      this.log('SITE_URL not set; skipping sitemap generation');
      return;
    }
    this.log(`Sitemap generation started. Site URL: ${this.baseUrl}`);
    
    const files = await this.listHtmlFiles(this.siteDir);
    const base = this.baseUrl.replace(/\/+$/, '');
    const entries = await Promise.all(
      files.map(async (f) => ({
        urlPath: this.toUrlPath(f),
        lastMod: this.formatLastMod((await stat(path.join(this.siteDir, f))).mtime),
      })),
    );
    const urls = entries
      .sort((a, b) => (a.urlPath < b.urlPath ? -1 : a.urlPath > b.urlPath ? 1 : 0))
      .map(
        (e) =>
          `  <url>\n    <loc>${this.escapeXml(base + e.urlPath)}</loc>\n    <lastmod>${e.lastMod}</lastmod>\n` +
          `    <changefreq>${this.escapeXml(this.changeFreq)}</changefreq>\n` +
          `    <priority>${this.escapeXml(this.priority)}</priority>\n  </url>`,
      );
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    const target = path.join(this.siteDir, SitemapGenerator.fileName);
    const existing = await readFile(target, 'utf8').catch(() => null);
    if (existing === xml) return;
    await writeFile(target, xml, 'utf8');
    this.newFile = existing === null;
    this.log(this.newFile ? `Sitemap created with ${urls.length} URLs` : `Sitemap updated with ${urls.length} URLs`);
  }

  /**
   * Removes the generated sitemap file.
   */
  async cleanup(): Promise<void> {
    if (!this.newFile) return;
    const target = path.join(this.siteDir, SitemapGenerator.fileName);
    await rm(target);
  }

  /** Formats a date as W3C datetime in UTC, e.g. 2026-01-02T03:04:05Z. */
  private formatLastMod(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  private toUrlPath(relative: string): string {
    const posix = relative.split(path.sep).join('/');
    const withoutIndex = posix.replace(/(^|\/)index\.html$/, '$1');
    return '/' + encodeURI(withoutIndex);
  }

  private escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private async listHtmlFiles(dir: string, rel = ''): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const result: string[] = [];
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const r = rel ? path.join(rel, e.name) : e.name;
      if (e.isDirectory()) result.push(...(await this.listHtmlFiles(path.join(dir, e.name), r)));
      else if (/\.html?$/i.test(e.name)) result.push(r);
    }
    return result;
  }
}

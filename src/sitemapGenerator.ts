import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Generates a sitemap.xml from the HTML files in the site directory.
 */
export class SitemapGenerator {
  static readonly fileName = 'sitemap.xml';

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
   * Generates the sitemap and writes it to the site directory if changed.
   * Skipped when no base URL is configured.
   */
  async generate(): Promise<void> {
    if (!this.baseUrl) {
      this.log('SITE_URL not set; skipping sitemap generation');
      return;
    }
    const files = await this.listHtmlFiles(this.siteDir);
    const base = this.baseUrl.replace(/\/+$/, '');
    const urls = files
      .map((f) => this.toUrlPath(f))
      .sort()
      .map((p) => `  <url><loc>${this.escapeXml(base + p)}</loc></url>`);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    const target = path.join(this.siteDir, SitemapGenerator.fileName);
    const existing = await readFile(target, 'utf8').catch(() => null);
    if (existing === xml) return;
    await writeFile(target, xml, 'utf8');
    this.log(`Sitemap generated with ${urls.length} URLs`);
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

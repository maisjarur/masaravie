import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { RawPlace } from './scraper.types';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  // Reuse browser across scrapes
  private _browser: puppeteer.Browser | null = null;

  // Concurrency lock — only one Puppeteer scrape runs at a time
  private _scrapeLock: Promise<any> = Promise.resolve();

  withScrapeLock<T>(fn: () => Promise<T>): Promise<T> {
    const next = this._scrapeLock.then(fn);
    this._scrapeLock = next.catch(() => {}); // errors don't block the queue
    return next;
  }

  private async getBrowser(): Promise<puppeteer.Browser> {
    if (this._browser) {
      try {
        await this._browser.version(); // throws if browser has crashed/closed
        return this._browser;
      } catch (err) {
        this.logger.warn(
          `Existing browser instance unresponsive, restarting. ${err.message}`,
        );
        this._browser = null;
      }
    }
    this.logger.log('Launching new Puppeteer browser instance.');
    this._browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    return this._browser;
  }

  /**
   * Scrape a single Google Maps search query and return raw place objects.
   * Migrated exactly from server.js lines 199-306.
   */
  async scrapeGoogleMapsSearch(query: string, limit: number = 20): Promise<RawPlace[]> {
    this.logger.log(`Starting scrape — query: "${query}", limit: ${limit}`);
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      await page.setViewport({ width: 1280, height: 800 });

      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
      this.logger.log(`Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Dismiss cookie/consent dialogs if present
      for (const sel of [
        'button[aria-label*="Accept all"]',
        'button[jsname="b3VHJd"]',
        'form[action*="consent"] button:last-child',
      ]) {
        try {
          await page.click(sel, { timeout: 1500 } as any);
          this.logger.log(`Dismissed consent dialog via selector: ${sel}`);
          break;
        } catch (_) {}
      }

      // Wait for results feed
      try {
        await page.waitForSelector('[role="feed"]', { timeout: 15000 });
      } catch {
        this.logger.warn(
          `Results feed not found for query: "${query}" — page may have shown a CAPTCHA or empty results.`,
        );
        return [];
      }

      // Scroll the feed to load up to `limit` results
      await page.evaluate(async (target: number) => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return;
        for (let i = 0; i < 15; i++) {
          const count = feed.querySelectorAll('[role="article"]').length;
          if (count >= target) break;
          (feed as HTMLElement).scrollTop += 2000;
          await new Promise((r) => setTimeout(r, 700));
          // End-of-list sentinel Google sometimes adds
          if (document.querySelector('.HlvSq')) break;
        }
      }, limit);

      // Extract business data
      const places = await page.evaluate((lim: number) => {
        const feed = document.querySelector('[role="feed"]');
        if (!feed) return [];

        const articles = Array.from(feed.querySelectorAll('[role="article"]')).slice(0, lim);
        const results: any[] = [];

        for (const article of articles) {
          const nameLink = article.querySelector('a[href*="/maps/place/"]');
          const name =
            nameLink?.getAttribute('aria-label') ||
            article.querySelector('.qBF1Pd, [class*="fontHeadlineSmall"]')?.textContent?.trim() ||
            '';
          if (!name) continue;

          // Rating — aria-label like "4.5 stars"
          const ratingEl = article.querySelector('span[aria-label*="star"]');
          const ratingLabel = ratingEl?.getAttribute('aria-label') || '';
          const ratingMatch = ratingLabel.match(/([0-9]+\.?[0-9]*)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

          // Review count — usually "(1,234)" somewhere in the text
          const countMatch = (article.textContent || '').match(/\(([0-9,]+)\)/);
          const reviewCount = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : null;

          // Info rows (address, category, etc.)
          const rowEls = article.querySelectorAll('.W4Etrf, [class*="fontBodyMedium"] > div > span');
          const address = Array.from(rowEls)
            .map((el) => (el as HTMLElement).textContent?.trim())
            .filter(Boolean)
            .join(', ');

          // Lat/lng from the place URL — format: /@lat,lng,zoom z/
          const href = (nameLink as HTMLAnchorElement)?.href || '';
          const coordMatch = href.match(/@(-?\d+\.\d+),(-?\d+\.\d+),/);
          const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
          const lng = coordMatch ? parseFloat(coordMatch[2]) : null;

          results.push({
            name,
            rating,
            reviewCount,
            address,
            url: href,
            lat,
            lng,
          });
        }

        return results;
      }, limit);

      this.logger.log(`Extracted ${places.length} places for query: "${query}"`);
      return places as RawPlace[];
    } finally {
      await page.close();
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ScraperService } from '../scraper/scraper.service';
import { CacheService } from '../cache/cache.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Provider, SearchResult } from './dto/provider.type';
import { SERVICE_CATEGORIES } from '../../common/constants/service-categories';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly scraperService: ScraperService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Infer which service categories are mentioned in the given text.
   * Migrated exactly from server.js inferServicesFromText().
   */
  inferServicesFromText(knownServices: string[], text: string): string[] {
    const lower = (text || '').toLowerCase();
    const inferred: string[] = [];
    knownServices.forEach((s) => {
      if (lower.includes(s.toLowerCase())) {
        inferred.push(s);
      }
    });
    return Array.from(new Set(inferred));
  }

  /**
   * Deduplicate providers by name+address key.
   * Migrated exactly from server.js dedupeProviders().
   */
  dedupeProviders(providers: Provider[]): Provider[] {
    const seen = new Map<string, any>();

    for (const p of providers) {
      const key = `${(p.name || '').toLowerCase()}|${(p.location?.address || '').toLowerCase()}`;

      if (!seen.has(key)) {
        seen.set(key, { ...p });
      } else {
        const existing = seen.get(key);
        existing.services = Array.from(
          new Set([...(existing.services || []), ...(p.services || [])]),
        );
        existing.sources = Array.from(
          new Set(
            [
              ...(existing.sources || [existing.source]),
              ...((p as any).sources || [(p as any).source]),
            ].filter(Boolean),
          ),
        );
        if (p.rating && (!existing.rating || p.rating > existing.rating)) {
          existing.rating = p.rating;
        }
        if (
          p.reviewCount &&
          (!existing.reviewCount || p.reviewCount > existing.reviewCount)
        ) {
          existing.reviewCount = p.reviewCount;
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Score and sort providers by curation weights.
   * Migrated exactly from server.js sortProvidersForCuration().
   * Weights: rating 0.5, reviewCount 0.3, serviceCount 0.2
   */
  sortProvidersForCuration(providers: Provider[]): Provider[] {
    return providers
      .map((p) => {
        const reviewWeight =
          typeof p.reviewCount === 'number'
            ? Math.min(p.reviewCount, 200) / 200
            : 0;
        const ratingWeight =
          typeof p.rating === 'number' ? (p.rating - 3.5) / 1.5 : 0;
        const serviceWeight = (p.services || []).length / SERVICE_CATEGORIES.length;
        const score = ratingWeight * 0.5 + reviewWeight * 0.3 + serviceWeight * 0.2;
        return { ...p, curationScore: score };
      })
      .sort((a, b) => (b.curationScore || 0) - (a.curationScore || 0));
  }

  /**
   * Fetch providers from Google Maps by chunking services into groups of 3.
   * Migrated exactly from server.js fetchFromGoogleMaps().
   */
  async fetchFromGoogleMaps({
    location,
    services,
    onlineOnly,
    limit,
  }: {
    location: string;
    services: string[];
    onlineOnly: boolean;
    limit: number;
  }): Promise<Provider[]> {
    const activeServices =
      services && services.length
        ? services
        : [
            'holistic wellness',
            'conscious living',
            'yoga',
            'meditation',
            'breathwork',
            'healing',
            'ecstatic dance',
            'massage',
            'sound bath',
            'holistic nutrtion',
            'mystery school',
            'mental health',
            'acupuncture',
            'spiritual coaching',
            'energy work',
            'reiki',
            'shamanic healing',
            'tarot',
            'astrology',
            'vipanasa meditation',
            'art therapy',
            'DMT',
          ];

    const baseLocation =
      location && location.trim().length > 0 ? location.trim() : 'near me';

    // Google Maps is inherently location-based; for "online anywhere" skip it
    if (onlineOnly && (!location || !location.trim())) {
      return [];
    }

    // Batch service terms into broader queries to reduce browser sessions (chunk size 3)
    const chunkSize = 3;
    const queries: string[] = [];
    for (let i = 0; i < activeServices.length; i += chunkSize) {
      const chunk = activeServices.slice(i, i + chunkSize);
      const terms = onlineOnly ? chunk.map((s) => `${s} online`) : chunk;
      const q = baseLocation ? `${terms.join(' ')} ${baseLocation}` : terms.join(' ');
      queries.push(q);
    }

    const perQueryLimit = Math.ceil((limit || 40) / queries.length);
    const items: any[] = [];

    for (const query of queries) {
      try {
        const results = await this.scraperService.withScrapeLock(() =>
          this.scraperService.scrapeGoogleMapsSearch(query, perQueryLimit),
        );
        items.push(...results);
      } catch (err) {
        this.logger.error(`Scrape failed for query: "${query}" — ${err.message}`);
      }
    }

    // Normalize to Masaravie provider schema
    const providers: Provider[] = items.map((place) => ({
      id: place.url || place.name,
      name: place.name,
      services: this.inferServicesFromText(
        activeServices,
        `${place.name} ${place.address}`,
      ),
      location: {
        address: place.address || '',
        city: '',
        country: '',
        lat: place.lat ?? null,
        lng: place.lng ?? null,
      },
      online: onlineOnly || false,
      rating: place.rating || null,
      reviewCount: place.reviewCount || null,
      raw: place,
    }));

    return providers;
  }

  /**
   * Main search entry point. Checks cache first, falls back to scrape.
   * Returns paginated result set with metadata.
   */
  async search(dto: SearchQueryDto): Promise<SearchResult> {
    const location = dto.location || '';
    const services = dto.services || [];
    const onlineOnly = dto.onlineOnly || false;
    const page = dto.page || 1;
    const pageSize = dto.pageSize || 20;

    const cacheKey = this.cacheService.buildKey(location, onlineOnly, services);
    const cached = this.cacheService.get(cacheKey);

    if (cached) {
      this.logger.log(
        `Cache hit — location: "${location}", services: [${services.join(', ')}]`,
      );
      const fullSet: Provider[] = cached;
      const start = (page - 1) * pageSize;
      const pageSlice = fullSet.slice(start, start + pageSize);
      return {
        providers: pageSlice,
        total: fullSet.length,
        page,
        pageSize,
        hasMore: page * pageSize < fullSet.length,
        meta: {
          location: location || null,
          cached: true,
        },
      };
    }

    this.logger.log(
      `Cache miss — scraping for location: "${location}", services: [${services.join(', ')}], onlineOnly: ${onlineOnly}`,
    );

    const startTime = Date.now();
    const rawProviders = await this.fetchFromGoogleMaps({
      location,
      services,
      onlineOnly,
      limit: 100,
    });

    const dedupedProviders = this.dedupeProviders(rawProviders);
    const curatedProviders = this.sortProvidersForCuration(dedupedProviders);

    this.logger.log(
      `Complete — ${curatedProviders.length} providers for location: "${location}"`,
    );

    // Cache the full set
    this.cacheService.set(cacheKey, curatedProviders);

    const start = (page - 1) * pageSize;
    const pageSlice = curatedProviders.slice(start, start + pageSize);
    const queryTime = Date.now() - startTime;

    return {
      providers: pageSlice,
      total: curatedProviders.length,
      page,
      pageSize,
      hasMore: page * pageSize < curatedProviders.length,
      meta: {
        location: location || null,
        cached: false,
        queryTime,
      },
    };
  }

  getServiceCategories(): string[] {
    return SERVICE_CATEGORIES;
  }
}

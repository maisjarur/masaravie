import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('api')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/health
   */
  @Get('health')
  getHealth() {
    return { status: 'ok', app: 'masaravie', version: '2.0.0' };
  }

  /**
   * GET /api/services
   */
  @Get('services')
  getServices() {
    return { services: this.searchService.getServiceCategories() };
  }

  /**
   * GET /api/search
   * Throttled: 15 requests per 15 minutes (scraping is expensive)
   */
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 15 } })
  @Get('search')
  async search(@Query() query: any) {
    try {
      const dto: SearchQueryDto = {
        location: query.location ? String(query.location).slice(0, 200).trim() : undefined,
        services: query.services
          ? String(query.services)
              .slice(0, 500)
              .split(',')
              .map((s: string) => s.trim().slice(0, 60))
              .filter(Boolean)
              .slice(0, 20)
          : undefined,
        onlineOnly: String(query.onlineOnly || 'false').toLowerCase() === 'true',
        page: query.page ? Math.max(1, parseInt(String(query.page), 10) || 1) : 1,
        pageSize: query.pageSize
          ? Math.min(50, Math.max(1, parseInt(String(query.pageSize), 10) || 20))
          : 20,
      };

      const result = await this.searchService.search(dto);
      return { ok: true, ...result };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Search failed',
      };
    }
  }
}

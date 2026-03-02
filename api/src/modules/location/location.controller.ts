import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LocationService } from './location.service';

@Controller('api/location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * GET /api/location/autocomplete?q=
   * Throttled: 60 requests per minute
   */
  @Throttle({ default: { ttl: 60 * 1000, limit: 60 } })
  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    const text = String(q || '').trim().slice(0, 200);
    if (!text) {
      return { suggestions: [] };
    }
    const suggestions = await this.locationService.autocomplete(text);
    return { suggestions };
  }

  /**
   * GET /api/location/reverse?lat=&lng=
   * Throttled: 60 requests per minute
   */
  @Throttle({ default: { ttl: 60 * 1000, limit: 60 } })
  @Get('reverse')
  async reverseGeocode(@Query('lat') latStr: string, @Query('lng') lngStr: string) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { label: null };
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('lat must be -90..90 and lng must be -180..180');
    }

    const label = await this.locationService.reverseGeocode(lat, lng);
    return { label };
  }
}

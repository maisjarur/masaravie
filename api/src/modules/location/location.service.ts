import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LocationSuggestion {
  label: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Autocomplete a partial location query using Geoapify.
   * Migrated from server.js /api/location-autocomplete handler.
   */
  async autocomplete(q: string): Promise<LocationSuggestion[]> {
    const text = String(q || '').trim().slice(0, 200);
    if (!text) return [];

    const apiKey = this.config.get<string>('geoapifyApiKey');
    if (!apiKey) {
      this.logger.warn('GEOAPIFY_API_KEY is not configured');
      return [];
    }

    try {
      const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
      url.searchParams.set('text', text);
      url.searchParams.set('limit', '8');
      url.searchParams.set('apiKey', apiKey);

      const geoRes = await fetch(url.toString());
      if (!geoRes.ok) {
        const snippet = await geoRes.text();
        this.logger.warn(
          `Geoapify returned ${geoRes.status} ${geoRes.statusText} for query: "${text}" — ${snippet.slice(0, 300)}`,
        );
        return [];
      }

      const body: any = await geoRes.json();
      const suggestions: LocationSuggestion[] = (body.features || []).map((f: any) => {
        const p = f.properties || {};
        const label =
          p.formatted ||
          [p.city, p.state, p.country].filter(Boolean).join(', ');
        return {
          label,
          city: p.city || null,
          country: p.country || null,
          lat: p.lat ?? p.latitude ?? null,
          lng: p.lon ?? p.longitude ?? null,
        };
      });

      return suggestions;
    } catch (err) {
      this.logger.error(`Unexpected error for query: "${text}" — ${err.message}`);
      return [];
    }
  }

  /**
   * Reverse geocode lat/lng to a readable "City, Country" label using Geoapify.
   * Migrated from server.js /api/location-reverse handler.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const apiKey = this.config.get<string>('geoapifyApiKey');
    if (!apiKey) {
      this.logger.warn('GEOAPIFY_API_KEY is not configured');
      return null;
    }

    try {
      const url = new URL('https://api.geoapify.com/v1/geocode/reverse');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('apiKey', apiKey);

      const geoRes = await fetch(url.toString());
      if (!geoRes.ok) {
        this.logger.warn(
          `Geoapify returned ${geoRes.status} ${geoRes.statusText} for coords: ${lat},${lng}`,
        );
        return null;
      }

      const body: any = await geoRes.json();
      const props = (body.features?.[0]?.properties) || {};
      const label = [props.city || props.town || props.village, props.country]
        .filter(Boolean)
        .join(', ');

      return label || null;
    } catch (err) {
      this.logger.error(`Unexpected error for coords: ${lat},${lng} — ${err.message}`);
      return null;
    }
  }
}

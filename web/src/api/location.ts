import { apiFetch } from './client';
import type { LocationSuggestion } from '../types/search';

export async function fetchLocationSuggestions(q: string): Promise<LocationSuggestion[]> {
  const data = await apiFetch<{ suggestions: LocationSuggestion[] }>(
    `/api/location/autocomplete?q=${encodeURIComponent(q)}`
  );
  return data.suggestions ?? [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const data = await apiFetch<{ label: string | null }>(
    `/api/location/reverse?lat=${lat}&lng=${lng}`
  );
  return data.label ?? null;
}

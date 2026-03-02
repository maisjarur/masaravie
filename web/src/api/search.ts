import { apiFetch } from './client';
import type { SearchPage } from '../types/provider';

export interface FetchSearchParams {
  location: string;
  services: string[];
  onlineOnly: boolean;
  page: number;
  pageSize?: number;
}

export async function fetchSearch(params: FetchSearchParams): Promise<SearchPage> {
  const qs = new URLSearchParams();
  if (params.location) qs.set('location', params.location);
  if (params.onlineOnly) qs.set('onlineOnly', 'true');
  if (params.services.length) qs.set('services', params.services.join(','));
  qs.set('page', String(params.page));
  qs.set('pageSize', String(params.pageSize ?? 20));
  return apiFetch<SearchPage>(`/api/search?${qs}`);
}

export async function fetchServices(): Promise<{ services: string[] }> {
  return apiFetch<{ services: string[] }>('/api/services');
}

export interface ProviderLocation {
  address?: string;
  city?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface Provider {
  id: string;
  name: string;
  rating?: number | null;
  reviewCount?: number | null;
  services: string[];
  location: ProviderLocation;
  online: boolean;
  curationScore?: number;
  raw?: { url?: string; [key: string]: any };
}

export interface SearchMeta {
  location?: string;
  cached: boolean;
  queryTime?: number;
}

export interface SearchPage {
  ok: boolean;
  providers: Provider[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  meta: SearchMeta;
}

export interface SearchParams {
  location: string;
  services: string[];
  onlineOnly: boolean;
}

export interface LocationSuggestion {
  label: string;
  lat?: number | null;
  lng?: number | null;
}

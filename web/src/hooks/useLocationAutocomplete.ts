import { useState, useRef, useCallback } from 'react';
import { fetchLocationSuggestions } from '../api/location';
import type { LocationSuggestion } from '../types/search';

export function useLocationAutocomplete() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const results = await fetchLocationSuggestions(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 220);
  }, []);

  const clear = useCallback(() => setSuggestions([]), []);

  return { suggestions, search, clear };
}

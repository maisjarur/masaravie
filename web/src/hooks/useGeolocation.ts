import { useState, useCallback } from 'react';
import { reverseGeocode } from '../api/location';

export function useGeolocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (): Promise<string | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return null;
    }
    setLoading(true);
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            resolve(label ?? `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          } catch {
            resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          } finally {
            setLoading(false);
          }
        },
        () => {
          setError('Unable to access your location. You can type a city instead.');
          setLoading(false);
          resolve(null);
        },
        { timeout: 10000 }
      );
    });
  }, []);

  return { detect, loading, error };
}

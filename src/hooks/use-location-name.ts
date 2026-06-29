import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// Reverse geocoding is rate-limited by the OS, and lists render many cards at
// once, so we cache results by rounded coordinate to avoid repeat lookups.
const cache = new Map<string, string>();
const keyFor = (lat: number, lng: number) => `${lat.toFixed(3)},${lng.toFixed(3)}`;

// Custom hook that converts lat/lng into a human-readable place name for display.
export function useLocationName(latitude: number, longitude: number) {
  const [locationName, setLocationName] = useState<string | null>(
    () => cache.get(keyFor(latitude, longitude)) ?? null
  );

  useEffect(() => {
    const key = keyFor(latitude, longitude);

    // Serve from cache when we've already resolved this location.
    const cached = cache.get(key);
    if (cached) {
      setLocationName(cached);
      return;
    }

    // Otherwise look it up, guarding against state updates after unmount.
    let cancelled = false;
    (async () => {
      try {
        const result = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (result.length > 0) {
          const { city, region, country } = result[0];
          const name = [city, region, country].filter(Boolean).join(', ');
          cache.set(key, name);
          if (!cancelled) setLocationName(name);
        }
      } catch {
        if (!cancelled) setLocationName(null);
      }
    })();

    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return locationName;
}

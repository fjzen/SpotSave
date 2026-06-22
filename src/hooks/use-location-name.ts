import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

// Custom hook that converts lat/lng to a human-readable city name
export function useLocationName(latitude: number, longitude: number) {
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchName = async () => {
      try {
        const result = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!cancelled && result.length > 0) {
          const { city, region, country } = result[0];
          const parts = [city, region, country].filter(Boolean);
          setLocationName(parts.join(', '));
        }
      } catch {
        setLocationName(null);
      }
    };

    fetchName();
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return locationName;
}

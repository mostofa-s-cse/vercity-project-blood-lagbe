import { useCallback, useState } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeolocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported';

/**
 * Wraps the browser's Geolocation API. Never throws, never prompts on its own — `request()` is a
 * person pressing "Near me", so the plain list is always there first ("emergencies must never need
 * an account" extends to "never need location" too). Resolves to `coords: null` on denial, timeout or
 * an unsupported browser; the caller just keeps showing the default list in that case.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus('granted');
      },
      () => setStatus('denied'),
      { timeout: 8000, maximumAge: 5 * 60_000 }
    );
  }, []);

  return { coords, status, request };
}

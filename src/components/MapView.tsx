import dynamic from 'next/dynamic';
import type { MapMarker } from './MapViewInner';

export type { MapMarker };

// Leaflet touches `window` at import time, so it can only ever run in the browser.
const MapViewInner = dynamic(() => import('./MapViewInner'), { ssr: false });

const DHAKA_CENTER = { lat: 23.8103, lng: 90.4125 };

interface MapViewProps {
  markers: MapMarker[];
  /** Defaults to the first marker, or Dhaka if there are none. */
  center?: { lat: number; lng: number };
}

export function MapView({ markers, center }: MapViewProps) {
  const fallbackCenter = center ?? (markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : DHAKA_CENTER);
  return <MapViewInner markers={markers} center={fallbackCenter} />;
}

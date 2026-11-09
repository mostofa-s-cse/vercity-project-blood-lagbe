'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

export interface Point {
  lat: number;
  lng: number;
}

interface Props {
  value: Point | null;
  center: Point;
  onPick: (point: Point) => void;
}

/** Click anywhere to drop the pin there. */
function ClickToPin({ onPick }: { onPick: (point: Point) => void }) {
  useMapEvents({ click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

/** When the point changes from outside the map (a search result, "my location", typed numbers), move the view to it. */
function Follow({ value }: { value: Point | null }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    // Only the numbers matter, not the object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);
  return null;
}

/** OpenStreetMap tiles, no key. Rendered client-side only (see LocationPicker.tsx). */
export default function LocationPickerInner({ value, center, onPick }: Props) {
  return (
    <MapContainer
      center={[(value ?? center).lat, (value ?? center).lng]}
      zoom={value ? 15 : 11}
      scrollWheelZoom={false}
      style={{ height: '260px', width: '100%', borderRadius: '1rem', position: 'relative', zIndex: 0, isolation: 'isolate' }}
    >
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickToPin onPick={onPick} />
      <Follow value={value} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latlng = (event.target as L.Marker).getLatLng();
              onPick({ lat: latlng.lat, lng: latlng.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}

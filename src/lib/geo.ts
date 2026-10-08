export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Straight-line (great-circle) distance in kilometres. No routing/traffic — see WP6 plan's out-of-scope note. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const KM_PER_DEGREE_LAT = 111.32;

/**
 * A cheap degrees-based box around `center`, wide enough to contain every point within `radiusKm`
 * (and then some near the poles/equator, which doesn't matter at Bangladesh's latitude). Meant as a
 * SQL `where` pre-filter before the exact Haversine distance is computed and sorted in application code.
 */
export function boundingBox(center: LatLng, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const kmPerDegreeLng = KM_PER_DEGREE_LAT * Math.cos(toRadians(center.lat));
  // Near the poles this would blow up; irrelevant at Bangladesh's latitude, but guard against division by ~0.
  const lngDelta = radiusKm / Math.max(kmPerDegreeLng, 1);

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}

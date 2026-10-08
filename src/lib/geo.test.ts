import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boundingBox, haversineDistanceKm } from './geo.ts';

// Real district centroids from src/data/bdGeo.ts, so these are checkable against a map, not invented.
const DHAKA = { lat: 23.7115253, lng: 90.4111451 };
const CHATTOGRAM = { lat: 22.335109, lng: 91.834073 };
const SYLHET = { lat: 24.8897956, lng: 91.8697894 };

test('distance from a point to itself is zero', () => {
  assert.equal(haversineDistanceKm(DHAKA, DHAKA), 0);
});

test('Dhaka to Chattogram is approximately 211km straight-line', () => {
  const km = haversineDistanceKm(DHAKA, CHATTOGRAM);
  assert.ok(km > 205 && km < 217, `expected ~211km, got ${km}`);
});

test('Dhaka to Sylhet is approximately 198km straight-line', () => {
  const km = haversineDistanceKm(DHAKA, SYLHET);
  assert.ok(km > 192 && km < 204, `expected ~198km, got ${km}`);
});

test('distance is symmetric', () => {
  const ab = haversineDistanceKm(DHAKA, CHATTOGRAM);
  const ba = haversineDistanceKm(CHATTOGRAM, DHAKA);
  assert.ok(Math.abs(ab - ba) < 1e-9);
});

test('boundingBox contains the center point and widens with radius', () => {
  const tight = boundingBox(DHAKA, 10);
  const wide = boundingBox(DHAKA, 100);
  assert.ok(DHAKA.lat > tight.minLat && DHAKA.lat < tight.maxLat);
  assert.ok(DHAKA.lng > tight.minLng && DHAKA.lng < tight.maxLng);
  assert.ok(wide.maxLat - wide.minLat > tight.maxLat - tight.minLat);
  assert.ok(wide.maxLng - wide.minLng > tight.maxLng - tight.minLng);
});

test('boundingBox is conservative enough that a point inside the real radius is also inside the box', () => {
  const box = boundingBox(DHAKA, 50);
  // Chattogram is ~211km away, well outside a 50km box.
  assert.ok(
    CHATTOGRAM.lat < box.minLat || CHATTOGRAM.lat > box.maxLat ||
    CHATTOGRAM.lng < box.minLng || CHATTOGRAM.lng > box.maxLng
  );
});

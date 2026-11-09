import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLanguage } from '../context/LanguageContext';
import { parsePlaceResults, placeSearchUrl, roundCoordinate, type PlaceResult } from '../lib/placeSearch';
import type { Point } from './LocationPickerInner';

// Leaflet touches `window` at import time, so it can only run in the browser.
const LocationPickerInner = dynamic(() => import('./LocationPickerInner'), { ssr: false });

const DHAKA_CENTER: Point = { lat: 23.8103, lng: 90.4125 };

interface LocationPickerProps {
  value: Point | null;
  onChange: (point: Point | null) => void;
}

const inputClass = 'w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:border-red-500';

/**
 * Pick a facility's map location: search a place by name, press "use my location", click or drag the pin on the map,
 * or type the latitude and longitude. All four fill the same two numbers, which stay editable.
 */
export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { coords, status, request } = useGeolocation();

  useEffect(() => {
    if (!coords) return;
    onChange({ lat: roundCoordinate(coords.lat), lng: roundCoordinate(coords.lng) });
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);
  useEffect(() => {
    if (status === 'denied') setMessage(t.hospitals.locDenied);
    if (status === 'unsupported') setMessage(t.hospitals.locUnsupported);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const search = async () => {
    const url = placeSearchUrl(query);
    if (!url) {
      setMessage(t.hospitals.locTooShort);
      return;
    }
    setSearching(true);
    setMessage(null);
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(String(response.status));
      setResults(parsePlaceResults(await response.json()));
    } catch {
      setResults(null);
      setMessage(t.hospitals.locSearchFailed);
    } finally {
      setSearching(false);
    }
  };

  const setNumber = (key: 'lat' | 'lng', raw: string) => {
    const number = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(number)) return;
    onChange({ ...(value ?? DHAKA_CENTER), [key]: number });
  };

  return (
    <div className="flex flex-col gap-2.5" data-testid="location-picker">
      <p className="text-xs font-bold text-slate-700">{t.hospitals.locTitle}</p>
      <p className="text-[11px] text-slate-500 -mt-1.5">{t.hospitals.locHint}</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void search();
            }
          }}
          placeholder={t.hospitals.locSearchPlaceholder}
          aria-label={t.hospitals.locSearchPlaceholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={searching}
          className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
        >
          {searching ? t.hospitals.locSearching : t.hospitals.locSearch}
        </button>
      </div>

      {results && (
        <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
          {results.length === 0 && <li className="px-3 py-2 text-xs text-slate-500">{t.hospitals.locNoResults}</li>}
          {results.map((place) => (
            <li key={`${place.lat},${place.lng},${place.label}`}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: place.lat, lng: place.lng });
                  setResults(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-red-50 cursor-pointer"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={request}
        disabled={status === 'loading'}
        className="self-start flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">my_location</span>
        <span>{status === 'loading' ? t.hospitals.locLocating : t.hospitals.locUseMine}</span>
      </button>

      {message && <p role="status" className="text-xs font-semibold text-amber-700">{message}</p>}

      <LocationPickerInner
        value={value}
        center={DHAKA_CENTER}
        onPick={(point) => onChange({ lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) })}
      />
      <p className="text-[11px] text-slate-500 -mt-1">{t.hospitals.locMapHint}</p>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-slate-600 flex flex-col gap-1">
          {t.hospitals.locLatitude}
          <input type="number" step="any" min={-90} max={90} value={value ? value.lat : ''} onChange={(e) => setNumber('lat', e.target.value)} className={inputClass} />
        </label>
        <label className="text-[11px] font-bold text-slate-600 flex flex-col gap-1">
          {t.hospitals.locLongitude}
          <input type="number" step="any" min={-180} max={180} value={value ? value.lng : ''} onChange={(e) => setNumber('lng', e.target.value)} className={inputClass} />
        </label>
      </div>
    </div>
  );
}

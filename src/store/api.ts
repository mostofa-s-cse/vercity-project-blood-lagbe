import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { DonorListResponse } from '../lib/dtoTypes.ts';

export interface DonorQuery {
  bloodGroup?: string;
  /** Text searched in the donor's name and area. */
  q?: string;
  available?: boolean;
  page?: number;
  pageSize?: number;
}

/** "?a=1&b=2" from the values that are set, in the order given. Empty text, `false` and `undefined` are left out. */
function queryString(params: Array<[string, string | number | boolean | undefined]>): string {
  const search = new URLSearchParams();
  for (const [key, value] of params) {
    if (value === undefined || value === false || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

interface ApiOptions {
  baseUrl?: string;
  /** Swapped in by tests. */
  fetchFn?: typeof fetch;
  /** Seconds an unused result stays cached. Tests use 0 so no timer keeps the process alive. */
  keepUnusedDataFor?: number;
}

/** The client data layer: one RTK Query slice for every server call the screens make. */
export function createApiSlice({ baseUrl = '/api', fetchFn, keepUnusedDataFor = 60 }: ApiOptions = {}) {
  return createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl, fetchFn }),
    keepUnusedDataFor,
    tagTypes: ['Donor', 'Request'],
    endpoints: (build) => ({
      getDonors: build.query<DonorListResponse, DonorQuery | void>({
        query: (args) => {
          const a = (args ?? {}) as DonorQuery;
          return `donors${queryString([
            ['bloodGroup', a.bloodGroup],
            ['q', a.q],
            ['available', a.available],
            ['page', a.page],
            ['pageSize', a.pageSize],
          ])}`;
        },
        providesTags: ['Donor'],
      }),
    }),
  });
}

export const api = createApiSlice();
export const { useGetDonorsQuery } = api;

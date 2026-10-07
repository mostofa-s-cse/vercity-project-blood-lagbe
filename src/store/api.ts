import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { DonorPayload, SosPayload } from '../lib/api.ts';
import type {
  AdminStatsDto,
  AuditLogDto,
  DonationDto,
  DonorDto,
  DonorListResponse,
  FraudIncidentDto,
  RequestDetailResponse,
  RequestDto,
  RequestListResponse,
  ResponseDto,
} from '../lib/dtoTypes.ts';
import { browserStorage as donorStorage, tokenFor as donorTokenFor } from '../lib/myDonorProfile.ts';
import { browserStorage, tokenFor } from '../lib/myRequests.ts';
import type { RequestStatusValue } from '../lib/requestStatus.ts';

export interface DonorQuery {
  bloodGroup?: string;
  /** Text searched in the donor's name and area. */
  q?: string;
  available?: boolean;
  /** Only the signed-in person's own donor profiles. */
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

/** A donor profile's editable fields, any subset (server validates with `parseDonorUpdateInput`). */
export interface DonorUpdatePayload {
  name?: string;
  area?: string;
  division?: string;
  age?: number;
  gender?: 'Male' | 'Female';
  vehicle?: string;
  nearestHospital?: string;
  isAvailable?: boolean;
  lastDonationMonths?: number;
}

export interface RequestsQuery {
  status?: string;
  emergency?: boolean;
  bloodGroup?: string;
  /** Show only these requests, for "my requests" from this browser. */
  ids?: string[];
  /** Only the signed-in person's own requests. */
  mine?: boolean;
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

const MANAGE_TOKEN_HEADER = 'X-Manage-Token';

interface ApiOptions {
  baseUrl?: string;
  /** Swapped in by tests. */
  fetchFn?: typeof fetch;
  /** Seconds an unused result stays cached. Tests use 0 so no timer keeps the process alive. */
  keepUnusedDataFor?: number;
  /** The manage token this browser holds for a request, if any. Defaults to the browser's own list. */
  getToken?: (requestId: string) => string | undefined;
  /** The manage token this browser holds for a donor profile, if any. Defaults to the browser's own list. */
  getDonorToken?: (donorId: string) => string | undefined;
}

/** The client data layer: one RTK Query slice for every server call the screens make. */
export function createApiSlice({
  baseUrl = '/api',
  fetchFn,
  keepUnusedDataFor = 60,
  getToken = (id) => tokenFor(browserStorage(), id),
  getDonorToken = (id) => donorTokenFor(donorStorage(), id),
}: ApiOptions = {}) {
  const tokenHeaders = (id: string, explicit?: string) => {
    const token = explicit ?? getToken(id);
    return token ? { [MANAGE_TOKEN_HEADER]: token } : undefined;
  };
  const donorTokenHeaders = (id: string, explicit?: string) => {
    const token = explicit ?? getDonorToken(id);
    return token ? { [MANAGE_TOKEN_HEADER]: token } : undefined;
  };

  return createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({ baseUrl, fetchFn }),
    keepUnusedDataFor,
    tagTypes: ['Donor', 'Request', 'Fraud'],
    endpoints: (build) => ({
      getDonors: build.query<DonorListResponse, DonorQuery | void>({
        query: (args) => {
          const a = (args ?? {}) as DonorQuery;
          return `donors${queryString([
            ['bloodGroup', a.bloodGroup],
            ['q', a.q],
            ['available', a.available],
            ['mine', a.mine],
            ['page', a.page],
            ['pageSize', a.pageSize],
          ])}`;
        },
        providesTags: ['Donor'],
      }),

      /** The full phone number of one donor, fetched only when someone presses "call". */
      getDonorContact: build.query<{ phone: string }, string>({
        query: (id) => `donors/${encodeURIComponent(id)}/contact`,
      }),

      registerDonor: build.mutation<{ id: string; manageToken: string }, DonorPayload>({
        query: (body) => ({ url: 'donors', method: 'POST', body }),
        invalidatesTags: ['Donor'],
      }),

      /** One donor's `DonorDto` fields (never the phone). */
      getDonor: build.query<{ donor: DonorDto }, string>({
        query: (id) => `donors/${encodeURIComponent(id)}`,
        providesTags: ['Donor'],
      }),

      /** A donor's real donation history, newest first. */
      getDonorDonations: build.query<{ donations: DonationDto[] }, string>({
        query: (id) => `donors/${encodeURIComponent(id)}/donations`,
        providesTags: ['Donor'],
      }),

      /** Edits a donor's own profile. Sends this browser's manage token for it, same pattern as requests. */
      updateDonor: build.mutation<{ donor: DonorDto }, { id: string; token?: string } & DonorUpdatePayload>({
        query: ({ id, token, ...body }) => ({
          url: `donors/${encodeURIComponent(id)}`,
          method: 'PATCH',
          body,
          headers: donorTokenHeaders(id, token),
        }),
        invalidatesTags: ['Donor'],
      }),

      getRequests: build.query<RequestListResponse, RequestsQuery | void>({
        query: (args) => {
          const a = (args ?? {}) as RequestsQuery;
          return `requests${queryString([
            ['status', a.status],
            ['emergency', a.emergency],
            ['bloodGroup', a.bloodGroup],
            ['ids', a.ids?.length ? a.ids.join(',') : undefined],
            ['mine', a.mine],
            ['page', a.page],
            ['pageSize', a.pageSize],
          ])}`;
        },
        providesTags: ['Request'],
      }),

      /** One request with its answers. Sends this browser's manage token for it, so `canManage` is right. */
      getRequest: build.query<RequestDetailResponse, string>({
        query: (id) => ({ url: `requests/${encodeURIComponent(id)}`, headers: tokenHeaders(id) }),
        providesTags: ['Request'],
      }),

      /** Posts an SOS. The answer holds the one-time manage token: the caller must remember it (see myRequests.ts). */
      createSos: build.mutation<{ id: string; manageToken: string }, SosPayload>({
        query: (body) => ({ url: 'sos', method: 'POST', body }),
        invalidatesTags: ['Request'],
      }),

      /** "I can donate". */
      respondToRequest: build.mutation<{ response: ResponseDto; status: RequestStatusValue }, { id: string; name: string; phone: string }>({
        query: ({ id, name, phone }) => ({ url: `requests/${encodeURIComponent(id)}/respond`, method: 'POST', body: { name, phone } }),
        invalidatesTags: ['Request'],
      }),

      updateRequestStatus: build.mutation<{ request: RequestDto }, { id: string; status: RequestStatusValue; token?: string }>({
        query: ({ id, status, token }) => ({
          url: `requests/${encodeURIComponent(id)}`,
          method: 'PATCH',
          body: { status },
          headers: tokenHeaders(id, token),
        }),
        invalidatesTags: ['Request'],
      }),

      /** Real counts for the Admin Panel's Overview tab. */
      getAdminStats: build.query<AdminStatsDto, void>({
        query: () => 'admin/stats',
      }),

      getFraudIncidents: build.query<{ incidents: FraudIncidentDto[] }, void>({
        query: () => 'admin/fraud',
        providesTags: ['Fraud'],
      }),

      resolveFraudIncident: build.mutation<{ incident: FraudIncidentDto }, { id: string; status: 'banned' | 'dismissed' }>({
        query: ({ id, status }) => ({ url: `admin/fraud/${encodeURIComponent(id)}`, method: 'PATCH', body: { status } }),
        invalidatesTags: ['Fraud'],
      }),

      getAuditLog: build.query<{ entries: AuditLogDto[] }, void>({
        query: () => 'admin/logs',
      }),
    }),
  });
}

export const api = createApiSlice();
export const {
  useGetDonorsQuery,
  useGetDonorContactQuery,
  useLazyGetDonorContactQuery,
  useRegisterDonorMutation,
  useGetRequestsQuery,
  useGetRequestQuery,
  useCreateSosMutation,
  useRespondToRequestMutation,
  useUpdateRequestStatusMutation,
  useGetAdminStatsQuery,
  useGetFraudIncidentsQuery,
  useResolveFraudIncidentMutation,
  useGetAuditLogQuery,
  useGetDonorQuery,
  useUpdateDonorMutation,
  useGetDonorDonationsQuery,
} = api;

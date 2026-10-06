import type { RequestStatusValue } from './requestStatus.ts';
import type { BloodGroupValue } from './validation.ts';

/**
 * What the API sends to the browser. Types only, so browser code can import them without pulling in
 * Prisma. The functions that build these from database rows are in dto.ts (server only).
 */

export interface DonorDto {
  id: string;
  name: string;
  bloodGroup: BloodGroupValue;
  area: string;
  division: string | null;
  age: number | null;
  gender: 'Male' | 'Female' | null;
  isAvailable: boolean;
  lastDonationMonths: number | null;
  vehicle: string | null;
  nearestHospital: string | null;
  /** For example "017••••4315". The full number is only given by `GET /api/donors/[id]/contact`. */
  phoneMasked: string;
  createdAt: string;
}

export interface RequestDto {
  id: string;
  area: string | null;
  problem: string | null;
  patientName: string | null;
  patientAge: number | null;
  attendantName: string | null;
  bloodGroup: BloodGroupValue;
  bags: number;
  /** How many people said they can donate. */
  bagsPledged: number;
  place: string;
  /** Contact numbers of a request are public by design, like the social media posts this replaces. */
  phones: string[];
  isCritical: boolean;
  status: RequestStatusValue;
  language: 'bn' | 'en';
  postText: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  responseCount: number;
}

export interface ResponseDto {
  id: string;
  name: string;
  createdAt: string;
  /** Only sent to whoever manages the request. */
  phone?: string;
}

export interface Paged {
  total: number;
  page: number;
  pageSize: number;
}

export interface DonorListResponse extends Paged {
  donors: DonorDto[];
}

export interface RequestListResponse extends Paged {
  requests: RequestDto[];
}

/** One request with its answers. `canManage` is true for whoever may change it (see the API notes). */
export interface RequestDetailResponse {
  request: RequestDto;
  responses: ResponseDto[];
  canManage: boolean;
}

export interface FraudIncidentDto {
  id: string;
  type: string;
  location: string;
  description: string;
  targetEntity: string | null;
  carrierInfo: string | null;
  evidence: string | null;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** Counts for the Admin Panel's Overview tab, one round trip. */
export interface AdminStatsDto {
  totalDonors: number;
  availableDonors: number;
  requestsByStatus: Record<'PENDING' | 'DONOR_FOUND' | 'COMPLETED' | 'CANCELLED', number>;
  responses: number;
}

export interface AuditLogDto {
  id: string;
  actorEmail: string | null;
  action: string;
  detail: string;
  createdAt: string;
}

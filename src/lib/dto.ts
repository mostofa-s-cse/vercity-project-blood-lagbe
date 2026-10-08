import type { AuditLog, Donation, Donor, FraudIncident, Organization, RequestResponse, SosRequest } from '../generated/prisma/client';
import type { AuditLogDto, DonationDto, DonorDto, FraudIncidentDto, OrganizationDto, RequestDto, ResponseDto } from './dtoTypes';
import { isEligible } from './eligibility';
import { maskPhone } from './phoneMask';
import { BLOOD_GROUP_FROM_DB } from './validation';
import type { RequestStatusValue } from './requestStatus';

/**
 * Builds what the API sends from database rows. Server only.
 * Note: `toDonorDto` never copies the donor's phone number; only the masked form leaves the server in lists.
 */

/** `distanceKm` is only known when the caller ran a `near` query; null otherwise. */
export function toDonorDto(row: Donor, distanceKm: number | null = null): DonorDto {
  return {
    id: row.id,
    name: row.name,
    bloodGroup: BLOOD_GROUP_FROM_DB[row.bloodGroup],
    area: row.area,
    division: row.division,
    age: row.age,
    gender: row.gender === 'Male' || row.gender === 'Female' ? row.gender : null,
    isAvailable: row.isAvailable,
    lastDonationMonths: row.lastDonationMonths,
    lastDonationAt: row.lastDonationAt ? row.lastDonationAt.toISOString() : null,
    isEligible: isEligible(row.lastDonationAt),
    vehicle: row.vehicle,
    nearestHospital: row.nearestHospital,
    phoneMasked: maskPhone(row.phone),
    createdAt: row.createdAt.toISOString(),
    distanceKm,
  };
}

type RequestRow = SosRequest & { _count: { responses: number } };

export function toRequestDto(row: RequestRow, distanceKm: number | null = null): RequestDto {
  return {
    id: row.id,
    area: row.area,
    problem: row.problem,
    patientName: row.patientName,
    patientAge: row.patientAge,
    attendantName: row.attendantName,
    bloodGroup: BLOOD_GROUP_FROM_DB[row.bloodGroup],
    bags: row.bags,
    bagsPledged: row._count.responses,
    place: row.place,
    phones: row.phones,
    isCritical: row.isCritical,
    status: row.status as RequestStatusValue,
    language: row.language === 'en' ? 'en' : 'bn',
    postText: row.postText,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    responseCount: row._count.responses,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm,
  };
}

/** `includePhone` is true only for whoever manages the request. */
export function toResponseDto(row: RequestResponse, includePhone: boolean): ResponseDto {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    ...(includePhone ? { phone: row.phone } : {}),
  };
}

export function toFraudIncidentDto(row: FraudIncident): FraudIncidentDto {
  return {
    id: row.id,
    type: row.type,
    location: row.location,
    description: row.description,
    targetEntity: row.targetEntity,
    carrierInfo: row.carrierInfo,
    evidence: row.evidence,
    severity: row.severity,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

export function toAuditLogDto(row: AuditLog): AuditLogDto {
  return {
    id: row.id,
    actorEmail: row.actorEmail,
    action: row.action,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toDonationDto(row: Donation): DonationDto {
  return {
    id: row.id,
    hospital: row.hospital,
    units: row.units,
    donatedAt: row.donatedAt.toISOString(),
  };
}

export function toOrganizationDto(row: Organization, distanceKm: number | null = null): OrganizationDto {
  return {
    id: row.id,
    name: row.name,
    shortCode: row.shortCode,
    type: row.type,
    division: row.division,
    district: row.district,
    address: row.address,
    hotline: row.hotline,
    emergencyContact: row.emergencyContact,
    directorName: row.directorName,
    licenseNumber: row.licenseNumber,
    isVerified: row.isVerified,
    status: row.status,
    totalBeds: row.totalBeds,
    icuBeds: row.icuBeds,
    createdAt: row.createdAt.toISOString(),
    latitude: row.latitude,
    longitude: row.longitude,
    distanceKm,
  };
}

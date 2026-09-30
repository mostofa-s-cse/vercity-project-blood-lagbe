import type { Donor, RequestResponse, SosRequest } from '../generated/prisma/client';
import type { DonorDto, RequestDto, ResponseDto } from './dtoTypes';
import { maskPhone } from './phoneMask';
import { BLOOD_GROUP_FROM_DB } from './validation';
import type { RequestStatusValue } from './requestStatus';

/**
 * Builds what the API sends from database rows. Server only.
 * Note: `toDonorDto` never copies the donor's phone number; only the masked form leaves the server in lists.
 */

export function toDonorDto(row: Donor): DonorDto {
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
    vehicle: row.vehicle,
    nearestHospital: row.nearestHospital,
    phoneMasked: maskPhone(row.phone),
    createdAt: row.createdAt.toISOString(),
  };
}

type RequestRow = SosRequest & { _count: { responses: number } };

export function toRequestDto(row: RequestRow): RequestDto {
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

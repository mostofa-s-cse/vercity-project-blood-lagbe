import { toSampleDonorDtos, toSampleRequestDtos, sampleDonorPhone } from '../lib/sampleMapping';
import type { DonorDto, RequestDto } from '../lib/dtoTypes';
import { INITIAL_DEMANDS, INITIAL_DONORS } from './mockData';

/**
 * The demo data in the API's shapes, for screens to show when no database is connected.
 * Call once per screen (for example inside `useMemo`): the creation times are relative to "now".
 */
export const sampleDonors = (): DonorDto[] => toSampleDonorDtos(INITIAL_DONORS);
export const sampleRequests = (): RequestDto[] => toSampleRequestDtos(INITIAL_DEMANDS, INITIAL_DONORS);
export const sampleContactPhone = (sampleId: string): string | undefined => sampleDonorPhone(INITIAL_DONORS, sampleId);

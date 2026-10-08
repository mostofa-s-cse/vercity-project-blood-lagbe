export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type UrgencyTier = 'critical' | 'semi-urgent' | 'scheduled';

export type ScreenId = 
  | 'emergency-hub'
  | 'donor-directory'
  | 'create-sos'
  | 'request-tracking'
  | 'donor-register'
  | 'donor-passport'
  | 'hospital-org'
  | 'admin-panel'
  | 'ops-command'
  | 'user-docs';

export type RequestStatus = 'pending' | 'donor_found' | 'completed' | 'cancelled';

export interface BloodRequest {
  id: string;
  patientName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  condition: string;
  bloodGroup: BloodGroup;
  bagsRequired: number;
  bagsFulfilled: number;
  hospital: string;
  wardBed: string;
  division: string;
  district: string;
  locationDetails: string;
  attendantName: string;
  attendantPhone: string;
  doctorName?: string;
  bmdcReg?: string;
  urgency: 'immediate' | 'urgent' | 'scheduled';
  urgencyLabel: string;
  status: RequestStatus;
  createdAt: string;
  slipVerified: boolean;
  assignedDonors?: {
    id: string;
    name: string;
    phone: string;
    etaMinutes: number;
    status: string;
  }[];
  notes?: string;
}

export interface HospitalOrganization {
  id: string;
  name: string;
  shortCode: string;
  type: 'government_hospital' | 'private_hospital' | 'blood_bank' | 'volunteer_org';
  division: string;
  district: string;
  address: string;
  hotline: string;
  emergencyContact: string;
  directorName: string;
  licenseNumber: string;
  isVerified: boolean;
  verifiedBadge: string;
  totalBeds: number;
  icuBeds: number;
  availableBags: number;
  bloodStock: Record<BloodGroup, number>;
  coldStorageTempC: number;
  coldStorageStatus: 'optimal' | 'warning' | 'critical';
  lastAuditDate: string;
  /** For the map (WP6). `null`/absent until the organization has a real coordinate (sample data has none). */
  latitude?: number | null;
  longitude?: number | null;
}

export interface DonationCamp {
  id: string;
  title: string;
  organizer: string;
  venue: string;
  division: string;
  date: string;
  timeRange: string;
  targetBags: number;
  registeredDonors: number;
  contactNumber: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface DonationRecord {
  id: string;
  donationDate: string;
  hospital: string;
  recipientName: string;
  bloodGroup: BloodGroup;
  bagsDonated: number;
  certificateNumber: string;
  verifiedByDoctor: string;
  badgeEarned?: string;
}

export type OpsSubTab = 
  | 'overview'
  | 'sos-queue'
  | 'hospitals-stocks'
  | 'anti-fraud'
  | 'system-gateways';

export interface EmergencyDemand {
  id: string;
  patientName: string;
  condition: string;
  bloodGroup: BloodGroup;
  bagsRequired: number;
  bagsPledged: number;
  hospital: string;
  hospitalLocation: string;
  distanceKm: number;
  urgencyWindowText: string;
  windowRemainingSec: number;
  urgencyTag: string;
  verificationBadge: string;
  attendantPhone: string;
  requisitionDocUrl?: string;
  doctorName?: string;
  status: 'active' | 'in-progress' | 'fulfilled';
}

export interface Donor {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  bloodGroup: BloodGroup;
  rhType: 'POS' | 'NEG';
  location: string;
  division: string;
  distanceKm: number;
  nearestHospital: string;
  donationCount: number;
  rating: number;
  badge: 'Gold Donor' | 'Community Hero' | 'Rare Blood Roster' | 'Doctor Volunteer' | 'Universal Lifesaver';
  daysElapsedSinceDonation: number;
  isAvailable: boolean;
  isOnDuty: boolean;
  isBdrcsVerified: boolean;
  hbLevel: number;
  weightKg: number;
  bloodPressure: string;
  serologyClear: boolean;
  commuteEtaMin: number;
  vehicle: string;
  languages: string[];
  phone: string;
  bmdcReg?: string;
  avatarUrl: string;
}

export interface ChillerUnit {
  id: string;
  name: string;
  capacityBags: number;
  volumePct: number;
  tempCelsius: number;
  status: 'SAFE NOMINAL' | 'TEMP RISING';
}

export interface HospitalStock {
  id: string;
  name: string;
  district: string;
  hotline: string;
  triageLead: string;
  criticalBeds: number;
  totalBags: number;
  stockStatus: string;
  apiStatus: string;
  code: string;
}

export interface FraudIncident {
  id: string;
  type: string;
  severity: 'HIGH' | 'MED-HIGH' | 'CRITICAL';
  reportedAgo: string;
  location: string;
  targetEntity: string;
  carrierInfo: string;
  description: string;
  evidence: string;
  nidHash?: string;
  status: 'pending' | 'banned' | 'throttled' | 'dismissed';
}

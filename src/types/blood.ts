export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export type UrgencyTier = 'critical' | 'semi-urgent' | 'scheduled';

export type ScreenId = 
  | 'emergency-hub'
  | 'donor-directory'
  | 'create-sos'
  | 'request-tracking'
  | 'donor-register'
  | 'live-tracker'
  | 'donor-passport'
  | 'hospital-org'
  | 'admin-panel'
  | 'ops-command'
  | 'pitch-deck';

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

export interface DonorNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'urgent_request' | 'match_found' | 'handshake_completed' | 'system_alert' | 'eligibility_alert';
  read: boolean;
  bloodGroup?: BloodGroup;
  hospital?: string;
  distanceKm?: number;
  requestId?: string;
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

export interface ActiveMission {
  id: string;
  referenceNo: string;
  patientName: string;
  bloodGroup: BloodGroup;
  bagsNeeded: number;
  hospital: string;
  bedRoom: string;
  urgency: 'HIGH URGENCY - CRITICAL' | 'SURGERY' | 'MATERNAL';
  elapsedSeconds: number;
  stage: 1 | 2 | 3 | 4 | 5;
  otpCode: string;
  donors: {
    id: string;
    name: string;
    bloodGroup: BloodGroup;
    bagLabel: string;
    status: 'En Route' | 'In Lab Cross-Match' | 'Arrived' | 'Completed';
    distanceKm: number;
    etaMinutes: number;
    vehicle: string;
    phone: string;
    avatarUrl: string;
  }[];
  broadcastPulse: {
    time: string;
    message: string;
    type: 'verified' | 'viewed' | 'sms' | 'created';
  }[];
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

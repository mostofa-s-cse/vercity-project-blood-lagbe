export const hospitals = {
  toastStockAdded: (group: string) => `${group} stock +1 added.`,
  toastStockDeducted: (group: string) => `${group} stock -1 deducted.`,
  toastCampRegistered: 'Registered successfully as voluntary donor for this camp!',
  toastCampCreated: 'New blood donation drive scheduled and published!',
  toastSensorsRecalibrated: 'Cold chain sensors re-calibrated.',
  defaultCampDate: 'Upcoming Weekend',

  portalBadge: 'HOSPITAL & BLOOD BANK PORTAL',
  heroSubtitle:
    'Centralized institutional suite for cold-chain blood stock monitoring, verified doctor requisitions, and community blood drives.',
  switchFacility: 'Switch Active Facility:',

  tabs: {
    inventory: 'Blood Vault & Cold Storage',
    requisitions: 'Doctor Requisition Desk',
    camps: 'Donation Drives & Camps',
    dispatch: 'Emergency Call Dispatch',
  },

  totalUnitsInVault: 'Total Units in Vault',
  bagsCount: (n: number) => `${n} Units`,
  acrossAllGroups: 'Across all 8 groups',
  chillerTemp: 'Chiller Temp',
  safeTempRange: 'Safe (2°C - 6°C Range)',
  criticalIcuBeds: 'Critical ICU Beds',
  icuBedsCount: (n: number) => `${n} beds`,
  totalBeds: (n: number) => `Total Beds: ${n}`,
  healthAuditStatus: 'Health Audit Status',
  fullyCertified: 'Fully Certified',

  vaultTitle: 'Live Group-Wise Blood Vault & Inventory',
  vaultSubtitle:
    'Manage units, adjust for donor donations, and track release for operation theater transfusions.',
  refreshTelemetry: 'Refresh Telemetry',
  stockLow: 'LOW',
  stockSafe: 'SAFE',
  units: 'Units',
  deductUnitTitle: 'Deduct unit for transfusion',
  addUnitTitle: 'Add unit from donor',
  minusOne: '-1',
  plusOne: '+1',

  requisitionTitle: 'Doctor Requisition Desk',
  requisitionSubtitle:
    'Issue hospital-authenticated requisition slips with BMDC registration tokens to stop syndicates.',
  issueRequisition: 'Issue Requisition & Broadcast',
  protocolTitle: 'Hospital Protocol Compliance',
  protocol1: 'Every request requires a verified BMDC medical registration code.',
  protocol2: 'Recipient attendant identity is cross-checked to eliminate black-market brokering.',
  protocol3: 'Direct recipient OTP sign-off handshake is legally required for record-keeping.',

  campsTitle: 'Community & Campus Donation Drives',
  campsSubtitle: 'Organize university blood donation camps, recruit donors, and track collection targets.',
  scheduleCamp: 'Schedule Blood Camp',
  campStatus: {
    upcoming: 'UPCOMING',
    ongoing: 'ONGOING',
    completed: 'COMPLETED',
  },
  registeredDonors: 'Registered Donors:',
  target: 'Target:',
  bags: 'Bags',
  registerToDonate: 'Register to Donate',

  dispatchTitle: 'Emergency Standby Donor Dispatch',
  dispatchSubtitle:
    'Directly dispatch IVR emergency voice calls and SMS to pre-screened voluntary donors near this hospital.',
  icuPriorityLink: (name: string) => `${name} ICU Priority Link`,
  priorityLinkDesc: 'Dispatch priority beacon to donors stationed within immediate driving distance.',
  launchSos: 'Launch Immediate SOS Beacon',
  browseStandby: 'Browse Standby Volunteer Donors',
  browseStandbyDesc: 'View donor medical passports, hemoglobin levels, and direct verified contacts.',
  exploreDirectory: 'Explore Donor Directory',

  modalTitle: 'Schedule Blood Drive',
  campTitleLabel: 'Camp Title',
  campTitlePlaceholder: 'e.g. DU Central Blood Donation Drive',
  venueLabel: 'Venue / Location',
  venuePlaceholder: 'e.g. TSC Premises, Dhaka University',
  dateLabel: 'Date',
  datePlaceholder: 'e.g. Oct 12, 2026',
  targetBagsLabel: 'Target Bags',
  publishCamp: 'Publish Blood Camp',
  cancel: 'Cancel',
};
export type Hospitals = typeof hospitals;

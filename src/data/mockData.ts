import { EmergencyDemand, Donor, ActiveMission, ChillerUnit, HospitalStock, FraudIncident } from '../types/blood';

export const INITIAL_DEMANDS: EmergencyDemand[] = [
  {
    id: 'DEM-01',
    patientName: '8-yr-old Child (Thalassemia Transfusion)',
    condition: 'Child Thalassemia Transfusion',
    bloodGroup: 'O+',
    bagsRequired: 2,
    bagsPledged: 1,
    hospital: 'Dhaka Medical College Hospital (DMCH)',
    hospitalLocation: 'Pediatric Ward 4, Bed 18',
    distanceKm: 1.8,
    urgencyWindowText: 'Urgent: Within 2 Hours',
    windowRemainingSec: 5880, // ~1h 38m
    urgencyTag: 'Urgent: Within 2 Hours',
    verificationBadge: 'Verified DMCH Doctor Requisition',
    attendantPhone: '01712-489021',
    doctorName: 'Dr. Ashfaqul Alam, MD (Pediatrics)',
    status: 'active'
  },
  {
    id: 'DEM-02',
    patientName: 'Cardiac Bypass Surgery (Open Heart)',
    condition: 'Emergency Coronary Bypass',
    bloodGroup: 'AB-',
    bagsRequired: 3,
    bagsPledged: 0,
    hospital: 'National Heart Foundation',
    hospitalLocation: 'Mirpur-2, OT Complex Bed 3',
    distanceKm: 4.2,
    urgencyWindowText: 'Critical: Within 6 Hours',
    windowRemainingSec: 18850, // ~5h 14m
    urgencyTag: 'Critical: Within 6 Hours',
    verificationBadge: 'Crossmatch Ready at Lab',
    attendantPhone: '01819-552194',
    doctorName: 'Prof. Dr. M. K. Jahangir',
    status: 'active'
  },
  {
    id: 'DEM-03',
    patientName: 'Emergency C-Section Delivery',
    condition: 'Maternal Hemorrhage / C-Section',
    bloodGroup: 'B+',
    bagsRequired: 1,
    bagsPledged: 0,
    hospital: 'Square Hospital',
    hospitalLocation: 'Panthapath, Labor & Delivery Unit',
    distanceKm: 2.5,
    urgencyWindowText: 'Immediate Emergency: Within 45 Min',
    windowRemainingSec: 2700, // 45m
    urgencyTag: 'Immediate Emergency',
    verificationBadge: 'Obstetrics & Gynecology Verified',
    attendantPhone: '01819-330192',
    doctorName: 'Dr. Farhana Yasmin, FCPS',
    status: 'active'
  },
  {
    id: 'DEM-04',
    patientName: 'Severe Polytrauma Accident',
    condition: 'Multiple Fractures & Ruptured Spleen',
    bloodGroup: 'O-',
    bagsRequired: 4,
    bagsPledged: 2,
    hospital: 'Sir Salimullah Medical College (Mitford)',
    hospitalLocation: 'Trauma ICU, Bed 04',
    distanceKm: 3.1,
    urgencyWindowText: 'Within 1 Hour',
    windowRemainingSec: 3600,
    urgencyTag: 'Critical P1',
    verificationBadge: 'Emergency Code Red Slip Signed',
    attendantPhone: '01711-998822',
    doctorName: 'Dr. Nusrat Jahan',
    status: 'active'
  }
];

export const INITIAL_DONORS: Donor[] = [
  {
    id: 'DON-01',
    name: 'Tanvir Ahmed',
    age: 28,
    gender: 'Male',
    bloodGroup: 'O+',
    rhType: 'POS',
    location: 'Dhanmondi 27',
    division: 'Dhaka Central',
    distanceKm: 1.2,
    nearestHospital: 'BSMMU (PG Hospital)',
    donationCount: 8,
    rating: 4.9,
    badge: 'Gold Donor',
    daysElapsedSinceDonation: 94,
    isAvailable: true,
    isOnDuty: true,
    isBdrcsVerified: true,
    hbLevel: 14.8,
    weightKg: 71,
    bloodPressure: '120/80',
    serologyClear: true,
    commuteEtaMin: 12,
    vehicle: 'Personal Motorcycle',
    languages: ['Bangla', 'English'],
    phone: '+880 1712-489021',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRa_qgZ4D0JH1FH_9_3lcBwJW2TCZoLH0XEWx8Qwpdz8678B6kODnsDddVS-UFGFaJ8A7Xz-4Qplkl9AiX3edNVszYC_EcFAbCMMifCX9BmnXIUM4GAzPN8rYy--1oxTfesImJfy5rGo75P6Q6jrj5DTbU7jyJwqft8clNXttKn8jwOpjC8SYYfwIGobjjnaP3bmIetXYgFmeRZdE2um7l2J_xIVO97lnRl_1QO_qCYVTGikkez7FI'
  },
  {
    id: 'DON-02',
    name: 'Sadia Nusrat',
    age: 26,
    gender: 'Female',
    bloodGroup: 'A+',
    rhType: 'POS',
    location: 'Panthapath',
    division: 'Dhaka Central',
    distanceKm: 2.3,
    nearestHospital: 'Square Hospital',
    donationCount: 12,
    rating: 5.0,
    badge: 'Community Hero',
    daysElapsedSinceDonation: 104,
    isAvailable: true,
    isOnDuty: true,
    isBdrcsVerified: true,
    hbLevel: 13.6,
    weightKg: 58,
    bloodPressure: '118/76',
    serologyClear: true,
    commuteEtaMin: 15,
    vehicle: 'Personal Ride / Car',
    languages: ['Bangla', 'English'],
    phone: '+880 1819-330192',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQan4wsk6lQc6AkXQCIMLNa3j6DB6YCSEsA8oyeX7B1iZM1KrPC1QestIK8O7DE3pvMe-1kN39Jou4V6NYtnJ3Onm2fdAm00LXIx1baU6BKvncKqMl07me-rMzM-20gAwWy-4U_Av1dsNSV9qjTxMzlmn8HeAKzmdC70bpcjXOrK1tjflARTaapozVBKr77QuEaGxNHTklVj0alHGvejZuYy8bxc40o3cXLB6OMbRbEDXHoQ9EPn_8'
  },
  {
    id: 'DON-03',
    name: 'Rafiqul Karim',
    age: 38,
    gender: 'Male',
    bloodGroup: 'B-',
    rhType: 'NEG',
    location: 'Green Road',
    division: 'Dhaka Central',
    distanceKm: 0.8,
    nearestHospital: 'Central Hospital Green Rd',
    donationCount: 5,
    rating: 4.8,
    badge: 'Rare Blood Roster',
    daysElapsedSinceDonation: 96,
    isAvailable: true,
    isOnDuty: true,
    isBdrcsVerified: true,
    hbLevel: 14.1,
    weightKg: 69,
    bloodPressure: '122/82',
    serologyClear: true,
    commuteEtaMin: 8,
    vehicle: 'Bicycle / On Foot',
    languages: ['Bangla'],
    phone: '+880 1711-209482',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA4DkUr7Yfr-s0fD8PmChP6JKvJYkIcg5NJiPGghqO0TUfEn0Jr85oXZS-gzhPKXQMEof0lI5wYulSEdKZcOQE92vtozg4bYsP0NIJBWqzsiASvtT90zj6p_4wC63FoKQ8XbAXeE841UFAfRj_CwRDopR1RDLiz8LH9ztcau6uBgnTVRilkpmQUS_Rr-CfhVomf9Hgeri1CdgVeSiYddB2nqSxdjjdIGLEe02hgqoeGYpYJYYhjd9wX'
  },
  {
    id: 'DON-04',
    name: 'Dr. Farhana Yasmin',
    age: 34,
    gender: 'Female',
    bloodGroup: 'O-',
    rhType: 'NEG',
    location: 'Shahbagh',
    division: 'Dhaka Central',
    distanceKm: 1.9,
    nearestHospital: 'BSMMU Block C',
    donationCount: 18,
    rating: 5.0,
    badge: 'Doctor Volunteer',
    daysElapsedSinceDonation: 110,
    isAvailable: true,
    isOnDuty: true,
    isBdrcsVerified: true,
    hbLevel: 13.9,
    weightKg: 62,
    bloodPressure: '115/75',
    serologyClear: true,
    commuteEtaMin: 5,
    vehicle: 'On Hospital Duty',
    languages: ['Bangla', 'English'],
    phone: '+880 1914-772901',
    bmdcReg: 'BMDC Reg #89210-A (Verified)',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAelSIGbM80Le6O2G1UXrR701g6twipLBIrhH54tTmXehkIozr-g7DLvpEJzWq7TsuKUoxYBGNNWWVX4_TBDA3BNaz7pANykpUr7YRjVE-cFEMq9MD1-6JahdTHIU5m_xwIpPgNX6x3I8QlJZsgkI9pn8O0EF9vhm28pepXDcbLRST5hVAUaW16dRY-JbRoFgCZitYpyVtQzEzy85XOPdXBzvr7QHWPaBQvrbJmLIlCjv2NvPliPBks'
  },
  {
    id: 'DON-05',
    name: 'Sadman Sakib',
    age: 22,
    gender: 'Male',
    bloodGroup: 'O-',
    rhType: 'NEG',
    location: 'Mohakhali DOHS',
    division: 'Dhaka North',
    distanceKm: 3.4,
    nearestHospital: 'icddr,b & TB Hospital',
    donationCount: 4,
    rating: 4.9,
    badge: 'Universal Lifesaver',
    daysElapsedSinceDonation: 98,
    isAvailable: true,
    isOnDuty: true,
    isBdrcsVerified: true,
    hbLevel: 14.0,
    weightKg: 65,
    bloodPressure: '118/78',
    serologyClear: true,
    commuteEtaMin: 18,
    vehicle: 'Motorcycle',
    languages: ['Bangla', 'English'],
    phone: '+880 1722-113344',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA7LpngV3r8DzweGjurJ9Izx_6rVFLdJj5Csy9ue6UI-sJKU9kwrGZ3d8ir21GuubuaCEpspMwTIFhm9OIOr9UpbvHqff9KyUCvVzbKap89r6vGS18KsiiczXNoTKIFcficPUt90RBofBQzzyTTj_L6c58bUEvPJOkf0Juqb9ZKz1_aUQcK0UI1Dwrcd2d8NXDYostQly1cESLIwZXT3mAhW_paHBLLxS7CD-ESCD0vK-NJmgyiOLEe'
  },
  {
    id: 'DON-06',
    name: 'Nusrat Jahan Tina',
    age: 24,
    gender: 'Female',
    bloodGroup: 'AB-',
    rhType: 'NEG',
    location: 'Uttara Sector 11',
    division: 'Dhaka North',
    distanceKm: 6.8,
    nearestHospital: 'Kuwait Bangladesh Friendship Hospital',
    donationCount: 6,
    rating: 4.7,
    badge: 'Rare Blood Roster',
    daysElapsedSinceDonation: 48, // resting cooldown
    isAvailable: false,
    isOnDuty: false,
    isBdrcsVerified: true,
    hbLevel: 13.1,
    weightKg: 54,
    bloodPressure: '115/75',
    serologyClear: true,
    commuteEtaMin: 30,
    vehicle: 'Uber / Public',
    languages: ['Bangla', 'English'],
    phone: '+880 1733-445566',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBePRb3bIO_KXBCKEdN7FILsLgb_kEUzH668kAolnL-tv7vuHNI7cKW6RGk5QwBYKxBeakczC519yzEBPEesDh7v6saqUMYD42s7SpS1pRynJ7sn25QyIU0wfeDmQ2bWQkh4NGVH9_JV6b5b4YEk1psS0wrvHQ84s0O3DpJAzDhkO2rGeD_nq4H9D7y1ywpY7uAAKljyYpyKyjpFVJjS0f-eh50DVOX2lopQv2aVu0zqQAVSMEmp5Ta'
  }
];

export const ACTIVE_MISSION_DEFAULT: ActiveMission = {
  id: 'REQ-8942',
  referenceNo: 'DMCH-ICU-1049',
  patientName: 'Nahidul Islam',
  bloodGroup: 'O+',
  bagsNeeded: 2,
  hospital: 'Dhaka Medical College Hospital (DMCH)',
  bedRoom: 'Emergency Room • Bed 14A',
  urgency: 'HIGH URGENCY - CRITICAL',
  elapsedSeconds: 34 * 60 + 16,
  stage: 2, // 1: Broadcasted, 2: Accepted, 3: Cross-Match, 4: Handover, 5: Handshake
  otpCode: '4921',
  donors: [
    {
      id: 'DON-01',
      name: 'Tanvir Ahmed',
      bloodGroup: 'O+',
      bagLabel: 'O+ (Bag 1)',
      status: 'En Route',
      distanceKm: 1.2,
      etaMinutes: 8,
      vehicle: 'Motorcycle • Speed 22 km/h via Bakshibazar',
      phone: '+880 1712-489021',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRa_qgZ4D0JH1FH_9_3lcBwJW2TCZoLH0XEWx8Qwpdz8678B6kODnsDddVS-UFGFaJ8A7Xz-4Qplkl9AiX3edNVszYC_EcFAbCMMifCX9BmnXIUM4GAzPN8rYy--1oxTfesImJfy5rGo75P6Q6jrj5DTbU7jyJwqft8clNXttKn8jwOpjC8SYYfwIGobjjnaP3bmIetXYgFmeRZdE2um7l2J_xIVO97lnRl_1QO_qCYVTGikkez7FI'
    },
    {
      id: 'DON-07',
      name: 'Kamrul Ahsan',
      bloodGroup: 'O+',
      bagLabel: 'O+ (Bag 2)',
      status: 'In Lab Cross-Match',
      distanceKm: 0.1,
      etaMinutes: 12,
      vehicle: 'On-site Volunteer (Room 104 • Central Blood Bank)',
      phone: '+880 1819-334455',
      avatarUrl: ''
    }
  ],
  broadcastPulse: [
    {
      time: '10:14 AM',
      message: 'Hospital verified medical slip authenticity approved by Dr. Farhana (DMCH Admin). Priority Level 1 assigned.',
      type: 'verified'
    },
    {
      time: '10:22 AM',
      message: '3 nearby donors in Dhanmondi / Bakshibazar cluster (Radius 2.4 km) opened urgent case details.',
      type: 'viewed'
    },
    {
      time: '10:05 AM',
      message: 'Automated SMS dispatcher queued to 24 registered volunteers within Dhaka South zone.',
      type: 'sms'
    },
    {
      time: '09:58 AM',
      message: 'Initial SOS broadcast initiated from DMCH ICU Terminal Bed 14A.',
      type: 'created'
    }
  ]
};

export const CHILLER_UNITS: ChillerUnit[] = [
  {
    id: 'CH-01',
    name: 'Unit A-01: DMCH Central',
    capacityBags: 1200,
    volumePct: 84,
    tempCelsius: 3.4,
    status: 'SAFE NOMINAL'
  },
  {
    id: 'CH-02',
    name: 'Unit B-04: Mitford Bank',
    capacityBags: 800,
    volumePct: 62,
    tempCelsius: 4.1,
    status: 'SAFE NOMINAL'
  },
  {
    id: 'CH-03',
    name: 'Unit C-02: BSMMU Vault',
    capacityBags: 1500,
    volumePct: 91,
    tempCelsius: 2.8,
    status: 'SAFE NOMINAL'
  },
  {
    id: 'CH-04',
    name: 'Unit D-09: Kurmitola Hub',
    capacityBags: 600,
    volumePct: 45,
    tempCelsius: 5.7,
    status: 'TEMP RISING'
  }
];

export const HOSPITAL_STOCKS: HospitalStock[] = [
  {
    id: 'HOSP-01',
    name: 'Dhaka Medical College Hospital',
    district: 'Bakshibazar, Dhaka South',
    hotline: '+880 2-55165001',
    triageLead: 'Prof. Dr. M. K. Anam',
    criticalBeds: 312,
    totalBags: 1024,
    stockStatus: 'O- Critically Low (4)',
    apiStatus: 'Online 99.9%',
    code: 'DMCH'
  },
  {
    id: 'HOSP-02',
    name: 'BSMMU (PG Hospital)',
    district: 'Shahbag, Dhaka',
    hotline: '+880 2-9661051',
    triageLead: 'Dr. Shahedur Rahman',
    criticalBeds: 184,
    totalBags: 840,
    stockStatus: 'Safe Equilibrium',
    apiStatus: 'Online 99.8%',
    code: 'BSM'
  },
  {
    id: 'HOSP-03',
    name: 'Chittagong Medical College Hospital',
    district: 'Panchlaish, Chattogram',
    hotline: '+880 31-619400',
    triageLead: 'Dr. A. B. M. Niaz',
    criticalBeds: 220,
    totalBags: 512,
    stockStatus: 'AB- Caution (8)',
    apiStatus: 'Online 99.4%',
    code: 'CMCH'
  },
  {
    id: 'HOSP-04',
    name: 'Sir Salimullah Medical College & Mitford',
    district: 'Mitford Road, Old Dhaka',
    hotline: '+880 2-7319002',
    triageLead: 'Dr. Nusrat Jahan',
    criticalBeds: 94,
    totalBags: 430,
    stockStatus: 'Stable',
    apiStatus: 'Latency (320ms)',
    code: 'SSMC'
  },
  {
    id: 'HOSP-05',
    name: 'Square Hospital Blood Transfusion Lab',
    district: 'Panthapath, Dhaka',
    hotline: '+880 2-8159457',
    triageLead: 'Dr. Tariqul Islam',
    criticalBeds: 118,
    totalBags: 334,
    stockStatus: 'Stable',
    apiStatus: 'Online 100%',
    code: 'SQH'
  }
];

export const FRAUD_INCIDENTS: FraudIncident[] = [
  {
    id: 'FR-104',
    type: 'EXTORTION SOLICITATION',
    severity: 'HIGH',
    reportedAgo: '6 mins ago',
    location: 'Shahbagh PG / BSMMU Cluster',
    targetEntity: '+880 1711-***92',
    carrierInfo: 'GP Telephony Carrier',
    description: 'Demanded ৳3,500 cash fee disguised as "advance donor ambulance transit surcharge" before releasing donor contact.',
    evidence: 'Audio Clip & SMS Screen Attached ("Shahbagh_Gate3_VoiceDemand_CallRec.aac")',
    nidHash: '198426912*****',
    status: 'pending'
  },
  {
    id: 'FR-105',
    type: 'SYN FLOOD BOT PATTERN',
    severity: 'MED-HIGH',
    reportedAgo: '3 mins ago',
    location: 'Mohakhali TB Gate Cell',
    targetEntity: 'IP 103.114.***.89',
    carrierInfo: 'Broadband Subnet AS136***',
    description: 'Posting rapid synthetic B- Negative emergency patient tokens with generic patient names ("Md. Kashem", "Fatema Begum") to deplete donor pool.',
    evidence: 'Heuristic Bot Probability 94.6% • User-Agent: HeadlessChrome/118.0',
    status: 'pending'
  }
];

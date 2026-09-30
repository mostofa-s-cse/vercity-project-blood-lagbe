export const deck = {
  slide1: {
    title: 'The Blood Crisis in Bangladesh',
    subtitle: 'Fragmented communication, dangerous syndicates & urgent maternal emergencies',
    tag: 'PROBLEM ANALYSIS',
    unitsValue: '800,000+',
    unitsTitle: 'Annual Units Needed',
    unitsDesc:
      'Bangladesh experiences an acute deficit of safe voluntary blood, particularly for Thalassemia patients, trauma accidents, and emergency C-section deliveries.',
    unitsNote: '~35% Deficit in public healthcare',
    syndicateValue: '৳5K - ৳15K',
    syndicateTitle: 'Syndicate Exploitation',
    syndicateDesc:
      'Middlemen and illegal blood brokers prey on grieving families outside major hospitals like DMCH, selling unsafe, unscreened bags with falsified test stamps.',
    syndicateNote: 'Black market blood brokers',
    chaosValue: 'Chaos',
    chaosTitle: 'Unverified Social Posts',
    chaosDesc:
      'Desperate families post phone numbers on Facebook groups without verification, leading to harassment, fraudulent solicitations, and delayed emergency care.',
    chaosNote: 'Zero structured triage or telemetry',
  },
  slide2: {
    title: 'Blood Lagbe? (রক্ত লাগবে?)',
    subtitle: 'Centralized Emergency Lifeline & Geofenced Telemetry Network',
    tag: 'OUR SOLUTION',
    step1Title: 'Geofenced Multi-Carrier SMS',
    step1Desc:
      'Instant prioritized broadcast to pre-screened voluntary donors within 5 km radius via GP, Robi, Banglalink, and Teletalk.',
    step2Title: 'Doctor Verified Requisition Slips',
    step2Desc:
      'Clinical validation requirement prevents fake alerts and hoarded inventory, preserving precious donor goodwill.',
    step3Title: 'Live Responding Telemetry & Handshake',
    step3Desc:
      '5-stage transparent tracking with recipient OTP sign-off protects patients and validates clinical handover.',
    freeBadge: '100% Free & Non-Commercial',
    protocolTitle: 'Ethical Lifesaver Protocol',
    protocolDesc:
      'By removing monetary exchange and empowering verified voluntary heroes, Blood Lagbe dismantles predatory syndicates and creates a national culture of safe, regular blood donation.',
    dghsAuthorized: 'DGHS Authorized',
    bdrcsAffiliated: 'BDRCS Affiliated',
    integration999: '999 Integration',
  },
  slide3: {
    title: 'Digital Donor Passport & Biological Guardrails',
    subtitle: 'Protecting voluntary donors while ensuring medical readiness',
    tag: 'INNOVATION',
    cooldownTitle: '90-Day Biological Cooldown',
    cooldownDesc:
      'Automated biological countdown protects donors from excessive blood draw, ensuring full hemoglobin and iron replenishment before subsequent donation eligibility.',
    smartIdTitle: 'Tamper-Proof Digital Smart ID',
    smartIdDesc:
      'Authenticated QR passport tied to national NID and BDRCS records. Prevents donor impersonation and accelerates hospital triage intake.',
    coldChainTitle: 'IoT Cold-Chain Telemetry',
    coldChainDesc:
      'Real-time temperature telemetry (+2°C to +6°C) for blood bank chilling units prevents spoilage and maintains viability across regional hospital networks.',
  },
  slide4: {
    title: 'Measurable Impact & Scalability Roadmap',
    subtitle: 'From Dhaka medical cluster to all 64 districts of Bangladesh',
    tag: 'TRACTION & ROADMAP',
    responseValue: '18.4m',
    responseLabel: 'Average Response',
    fulfillmentLabel: 'SOS Fulfillment',
    donorsLabel: 'Verified Donors',
    districtsLabel: 'Districts Target',
    ctaTitle: 'Ready to explore the live application?',
    ctaDesc: 'Experience real-time SOS broadcast, donor GPS telemetry, and digital passports right now.',
    ctaButton: 'Launch Emergency Hub',
  },
  slideCounter: (current: number, total: number) => `Slide ${current} of ${total}`,
  initiative: 'Blood Lagbe? Initiative',
  previous: 'Previous',
  nextSlide: 'Next Slide',
};
export type Deck = typeof deck;

import type { DocSection } from './section.ts';

export const tracker: DocSection = {
  title: 'Live Tracker',
  summary:
    'The Live Tracker follows one rescue mission from the SOS broadcast to the moment blood is handed over at the bedside. The patient family and hospital staff use it to watch the donor arrive and to confirm the handover.',
  steps: {
    s1: 'At the top, check the patient, blood group, hospital and bed, and the Mission Elapsed timer that keeps counting.',
    s2: 'Follow the 5-Stage Emergency Protocol Progress: SOS Broadcast, Donor Accepted, En Route, Lab Cross-Match and Handshake Complete. Tap a stage card to mark the mission at that stage.',
    s3: 'Watch the map, where the donor icon moves toward the hospital. Below it you see speed, remaining distance and traffic. The Assigned Donors list shows each donor with their ETA and a Call Donor button, and Broadcast Pulse Events lists recent updates.',
    s4: 'Press Inspect Slip to view the Official Clinical Requisition for this patient, then Acknowledge & Close.',
    s5: 'When the donor reaches the bedside, press Recipient Handshake Sign-Off. The attendant gives the donor a 4-digit code; enter it in the four boxes. In this demo the code is 4921, and the Auto-fill Attendant\'s OTP (4921) link fills it in for you.',
    s6: 'Press Confirm Blood Handover. If the code is right you see Handshake Verified!, the window closes, and a message confirms that the handover receipt was recorded.',
  },
  tips: {
    t1: 'The handshake code makes sure blood is handed over free of charge, directly from donor to patient, with no broker in between.',
    t2: 'If you enter fewer than 4 digits or a wrong code, an error message appears and tells you the demo code. Cancel closes the window without confirming.',
    t3: 'Everything here is a demo: the mission, the donors, the GPS map (marked Simulated GPS Live) and the stage times are sample data, and no real hospital record or receipt is created.',
    t4: 'Confirming the handshake does not move the stage cards forward by itself; tap Handshake Complete if you want the progress to show the final stage.',
  },
};

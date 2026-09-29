import type { DocSection } from './section.ts';

export const sos: DocSection = {
  title: 'Create SOS Request',
  summary:
    'Use this screen when a patient urgently needs blood. A short 4-step form collects the patient, blood and doctor details, then sends an emergency alert to nearby donors.',
  steps: {
    s1: 'Step 1, Patient Info: enter the Patient Full Name, Age and Gender, pick the Hospital / Medical Center from the list, and fill in the Ward / Cabin / Bed No. and the Attendant Contact Mobile. Press Continue.',
    s2: 'Step 2, Blood & Urgency: tap the blood group you need, use the minus and plus buttons to set how many bags (1 to 8), choose an urgency level (Immediate, Urgent or Scheduled) and write the Clinical Indication / Diagnosis.',
    s3: "Step 3, Doctor Slip: enter the Attending Doctor's Name and BMDC Registration Number. A sample requisition slip is already attached; you can remove it with Change / Re-upload File and attach it again with Select Hospital Prescription.",
    s4: 'Step 4, Broadcast SOS: drag the slider to set the Geofence Broadcast Radius (2 to 20 km) and check the SMS alert preview, which is built from the details you entered.',
    s5: 'Press Launch Geofence SOS Broadcast. After a moment you see a Broadcast Active message, a new alert appears under the notification bell, and you are taken to the Live Tracker.',
  },
  tips: {
    t1: 'Use Previous Step to go back, or tap any finished step (marked with a tick) at the top to jump back to it. Back to Hub leaves the form.',
    t2: 'Most fields come pre-filled with sample values so you can try the flow quickly. Replace them with your own details if you like.',
    t3: 'This is a demo: no real SMS is sent and no file is uploaded. The mobile operator list and the donor count in the preview are sample data.',
    t4: 'The Live Tracker you land on shows a sample rescue mission, not the request you just created.',
  },
};

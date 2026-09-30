import type { DocSection } from './section.ts';

export const passport: DocSection = {
  title: 'Donor Passport',
  summary:
    'The Donor Passport is a donor\'s digital ID card. It shows who the donor is, whether they can donate again yet, their health checks and their past donations.',
  steps: {
    s1: 'Look at the smart ID card at the top: name, NID, area and Lifeline ID, blood group, a QR code, the PRIMARY TRANSFUSION BASE, TOTAL RECORDED DONATIONS and LAST DONATION DATE.',
    s2: 'Check the "Biological Rest Cooldown" dial. It counts days since the last donation out of 90 and shows "Eligible Now" once 90 days have passed, or "Resting Period" with the days remaining.',
    s3: 'When the donor is eligible, tap "View Nearby Emergency Requests" to go to the Emergency Hub and find a patient to help.',
    s4: 'Scroll to "Certified Clinical Screenings & Biomarkers" to see hemoglobin, resting blood pressure, body weight and the TTI infectious screen.',
    s5: 'In "Past Transfusion Ledger & Certificates", review each past donation (hospital, patient ward, bag size, date and certificate number) and tap "View Certificate".',
    s6: 'Tap "Export Certificate" at the top to get a donor certificate, or tap "Simulate "Resting Cooldown"" to see how the passport looks while a donor is still resting. Tap "Show "Ready to Donate"" to switch back.',
  },
  tips: {
    t1: 'The passport always shows the same sample donor (Tanvir Ahmed, O+). It does not show the profile you create on the "Register as Donor" screen.',
    t2: '"Export Certificate" and "View Certificate" only show a message on screen in this demo. No PDF is actually downloaded.',
    t3: 'The QR code, NID, health figures and donation history are sample data, not real medical records.',
    t4: 'Donors must wait 90 days between donations. While the cooldown is active, the button reads "Biological Cooldown Active" and is greyed out.',
    t5: 'When the site has Google sign-in switched on, you must sign in to open the Donor Passport. Without sign-in it opens for everyone as a demo.',
  },
};

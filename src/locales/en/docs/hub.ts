import type { DocSection } from './section.ts';

export const hub: DocSection = {
  title: 'Emergency Hub',
  summary:
    'The Emergency Hub is the home screen. Families start here to send an SOS, and donors come here to see who needs blood nearby and offer to help.',
  steps: {
    s1: 'Look at the red strip under the top bar. After CRITICAL RADIUS: it shows how many urgent requests there are within a few kilometres and at which hospitals.',
    s2: 'If you need blood, press Broadcast SOS Alert Now in the Need Blood Urgently? card. It opens Create SOS Request, where you fill in the details.',
    s3: 'The donor card on the right shows a sample donor, Tanvir Ahmed, with eligibility and readiness. Use the Voluntary Donor Active switch to pause or resume emergency alerts, and press View Donor Passport to see the full donor record.',
    s4: 'In the Blood Group Compatibility Filter Bar, press a blood group (or ALL) to show only the requests for that group. O- is marked in red because it is in critical shortage.',
    s5: 'Scroll through Emergency Demands Near You. Each card shows the blood group and bags needed, the patient, the hospital and distance, a Window Remaining countdown and how many bags are already pledged.',
    s6: 'On a request card, press I Can Donate (Commit) to offer your blood and open the Live Tracker. Press Direct Call to phone the patient\'s attendant, the share icon to send the request to others, or the document icon to see the doctor\'s slip (Official Clinical Requisition).',
    s7: 'On the right, see Dhaka Lifeline Impact numbers, Live Handshakes and 24/7 Verified Blood Banks with call buttons. At the bottom, View All Active Requests Across Dhaka Command Grid opens the Live Tracker, and Access Complete Dhaka Hospital Network Directory opens the Hospitals & Blood Banks screen.',
  },
  tips: {
    t1: 'Everything on this screen is sample data: patients, countdowns, stats and handshakes. The countdowns start again when you reload the page.',
    t2: 'An SOS you create does not appear in this list. After sending it you will see a confirmation message and a new alert under the bell in the top bar.',
    t3: 'The share icon uses your phone\'s share menu if it has one; otherwise the request text is copied so you can paste it into WhatsApp.',
    t4: 'The Filter Priority and Sort: Distance buttons do not do anything yet in this demo. Call buttons simply open your phone\'s dialer with the number shown.',
  },
};

import type { DocFaq } from './section.ts';

export const faq: DocFaq = {
  title: 'Frequently asked questions',
  items: {
    q1: {
      q: 'Is this a real service?',
      a: 'No. Blood Lagbe? is a demo with sample data. It does not send real SMS, make calls, take payments or connect to real hospitals. The donors, patients, hospitals and numbers you see are examples. A few call buttons may open your phone\'s dialer with a sample number.',
    },
    q2: {
      q: 'Is my data kept if I reload the page?',
      a: 'Your new SOS requests, registered donors and notifications stay while you move between pages or switch language. A reload or a closed tab brings back the sample data. Two things are kept in your browser: the alert and radius messages set in the Admin Panel, and your language choice. Changes made inside the Admin Panel tables reset as soon as you leave the panel.',
    },
    q3: {
      q: 'How do I change the language, and does it stay?',
      a: 'Press the language button in the header ("বাংলা" or "English"). You stay on the same page, and the web address changes between /bn and /en. Your browser remembers the choice, so the next link you open without a language uses it. Bangla is the default.',
    },
    q4: {
      q: 'What happens if I open a link without /bn or /en, or an old link like /#admin?',
      a: 'A link without a language is sent to your saved language, or to Bangla if you have none. An old link such as /#admin, /#donors or /#sos is sent to the matching page, for example /bn/admin. A page that does not exist shows a "not found" page.',
    },
    q5: {
      q: 'What is the OTP handshake, and what is the demo code?',
      a: 'It is a 4-digit code the patient\'s attendant gives the donor at the bedside, to confirm the blood was really handed over and stop brokers. Open it from "Recipient Handshake Sign-Off" in the Live Tracker. The demo code is 4921, and the auto-fill button enters it for you. Confirming only shows a success message.',
    },
    q6: {
      q: 'What is a requisition slip?',
      a: 'It is the doctor\'s written request for blood. In the app you open a sample slip with buttons such as "Inspect Doctor Slip" on the Emergency Hub, "Inspect Slip" in the Live Tracker or "Doctor Slip" in the Admin Panel. The patient name, blood group and bags come from the request. The rest is sample text, not a real verified document.',
    },
    q7: {
      q: 'How are the header alert ticker and the radius message set, and who can change them?',
      a: 'In the Admin Panel, open "Alerts & Radius Control". "Save & Broadcast Emergency Alert" sets the red ticker at the top of every public page. "Update Emergency Radius" sets the message in the Emergency Hub radar strip. The panel has no login, so anyone who opens it can change them. The settings are saved only in your own browser, so other people do not see your changes.',
    },
    q8: {
      q: 'How do I show up in the Donor Directory?',
      a: 'Fill in the "Register as Donor" form. You are added to the top of the Donor Directory with the BDRCS Verified mark. If you said you are not available, the "Available Now" filter hides you, so turn it off to see yourself. You disappear again after a reload, and you are not added to the Admin Panel\'s Donor Registry.',
    },
    q9: {
      q: 'Why does my new SOS not appear in the Emergency Hub list?',
      a: 'The Emergency Hub list always shows the same sample requests. When you post an SOS, the app shows a confirmation page with your shareable post (copy it or send it on WhatsApp or Facebook) and adds an alert to the notification bell. The new request is not added to the hub list. If the site owner has connected a database, the request is also saved there, but the screens still show sample data.',
    },
    q10: {
      q: 'What do the blood groups and urgency levels mean?',
      a: 'There are eight blood groups: A+, A-, B+, B-, AB+, AB-, O+ and O-. A minus sign means Rh negative, which is rarer, so those groups often show low stock. A doctor decides which blood a patient can receive. When you post an SOS you can tick Needed within 1 hour for the most urgent cases (top priority, P1); leave it unticked and the request gets the next priority (P2, about 4 hours). The admin alert has its own levels (Code-Red, Critical, Urgent), which are saved with the alert but not shown in the ticker text.',
    },
    q11: {
      q: 'Do I need to sign in?',
      a: 'No. You can post an SOS and register as a donor without signing in, so nobody has to sign in during an emergency. If the site owner has switched on Google sign-in, a Sign in with Google button appears in the top bar. Signing in links what you save to your account. Without it, the site works as a demo.',
    },
  },
};

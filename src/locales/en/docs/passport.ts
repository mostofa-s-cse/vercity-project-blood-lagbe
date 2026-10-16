import type { DocSection } from './section.ts';

export const passport: DocSection = {
  title: 'Donor Passport',
  summary:
    'The Donor Passport is a donor\'s digital ID card. It shows who the donor is, whether they can donate again yet, and every donation that was confirmed for them. Everything on it comes from the donor\'s own profile and donation record.',
  steps: {
    s1: 'Look at the ID card at the top: name, Donor ID, area, blood group, level (New, Bronze, Silver or Gold by number of donations), NEAREST HOSPITAL, TOTAL RECORDED DONATIONS and LAST DONATION DATE.',
    s2: 'Check the "Biological Rest Cooldown" dial. It counts days since the last donation out of 90 and shows "Eligible Now" once 90 days have passed, or "Resting Period" with the days remaining.',
    s3: 'When the donor is eligible, tap "View Nearby Emergency Requests" to go to the Emergency Hub and find a patient to help.',
    s4: 'In "Donation Readiness Checks" see your age (18 to 65), the 90-day interval, whether you are marked available, and the date you can donate next.',
    s5: 'In "Donation Record & Certificates" review each confirmed donation (hospital, bags, date and donation code) and tap "View Certificate" to open a printable certificate you can save as a PDF.',
    s6: 'If a donation is listed that is not yours, tap "Not mine". It is removed and the person who posted the request sees that you disputed it.',
  },
  tips: {
    t1: 'The passport shows your own donor profile: the donor registered on this browser, or the one linked to the account you signed in with. With neither, it asks you to register.',
    t2: 'A donation appears here only after the person who posted the request marks it completed and ticks you as a donor. You get a notification with the donation code.',
    t3: '"Export Certificate" opens the certificate of your latest donation. If your browser blocks pop-ups, allow them for this site.',
    t4: 'Donors must wait 90 days between donations. While the cooldown is active, the button reads "Biological Cooldown Active" and is greyed out.',
    t5: 'When the site has sign-in switched on, you must sign in to open the Donor Passport. Without sign-in set up it opens for everyone.',
  },
};

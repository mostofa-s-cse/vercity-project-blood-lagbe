import type { DocSection } from './section.ts';

export const register: DocSection = {
  title: 'Register as Donor',
  summary:
    'Use this screen to sign up as a voluntary blood donor in under a minute. You answer four questions, tick one box, and your donor card is added to the Donor Directory.',
  steps: {
    s1: 'Type your Full name and your Mobile number (for example 01712345678).',
    s2: 'Tap your Blood group. Only one of the eight buttons can be selected, and it turns red when chosen.',
    s3: 'Type your Area, for example "Dhanmondi 27 / Shahbagh". Leave "I am available to donate now" on, or turn it off if you cannot donate at the moment.',
    s4: 'Tick the box confirming that you are healthy, at least 18 years old, weigh 45 kg or more, and want to donate voluntarily and free of charge.',
    s5: 'If you like, open "More details (optional)" to change your age, gender, division, weight, months since your last donation, how you travel and your nearest hospital. You can skip it.',
    s6: 'Tap "Register as donor". A success screen shows your card, with buttons to "View Donor Passport" or "Open Donor Directory", where your card appears at the top.',
  },
  tips: {
    t1: 'The "Register as donor" button stays grey until the four fields are filled, the mobile number is valid and the box is ticked.',
    t2: 'If the mobile number is not a valid Bangladesh number, a red message appears under it after you leave the field. The number is saved with +880 in front if you do not type it yourself.',
    t3: 'This is a demo. Your profile is kept only in this browser tab and disappears when you reload the page. No real alerts or SMS are sent, and the email field is not saved.',
    t4: 'To keep the demo simple, a new donor is automatically marked as BDRCS verified, with sample health figures and a distance of 1.5 km.',
  },
};

import type { DocSection } from './section.ts';

export const register: DocSection = {
  title: 'Register as Donor',
  summary:
    'Use this screen to sign up as a voluntary blood donor. You fill in a short form, and your donor card is added to the Donor Directory.',
  steps: {
    s1: 'In "1. Personal Info & Blood Group", enter your Full Name and Mobile Number, choose your Blood Group, and set your age and gender.',
    s2: 'In "2. Location & Hospital Radius", pick your Division / Hub, type your Specific Area / Thana, and check the Nearest Preferred Hospital and Transit Vehicle.',
    s3: 'Watch the "LIVE PASSPORT PREVIEW" card on the side (below the form on a phone). It updates as you type, showing your blood group, name, area, phone, transit and hospital.',
    s4: 'In "3. Medical Eligibility Checklist", confirm the weight and age box and the no major illness box, and keep the "100% Voluntary Non-Commercial Pledge" ticked.',
    s5: 'Tap "Complete Registration". A welcome message appears and a success screen confirms that your profile is active.',
    s6: 'From the success screen, tap "View Donor Passport" or "Open Donor Directory". Your new card appears at the top of the directory.',
  },
  tips: {
    t1: 'Fields marked with * (Full Name, Mobile Number, Specific Area / Thana) and the voluntary pledge are required. The form will not submit without them.',
    t2: 'Age can be 18 to 65. The mobile number is saved with +880 in front if you do not type it yourself.',
    t3: 'This is a demo. Your profile is kept only in this browser session and disappears when you reload the page. No real alerts or SMS are sent to you.',
    t4: 'To keep the demo simple, a new donor is automatically marked as available and BDRCS verified, with sample health figures and a distance of 1.5 km.',
  },
};

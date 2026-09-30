import type { DocSection } from './section.ts';

export const sos: DocSection = {
  title: 'Create SOS Request',
  summary:
    'Use this screen when a patient urgently needs blood. Fill in a few details on one page and the app writes a short emergency post, like the ones people share on Facebook, that you can copy or share right away.',
  steps: {
    s1: 'Optionally write the Area (for example Habiganj) and the Patient problem. Tap a quick choice such as Pregnant or Accident, or type your own text.',
    s2: 'Tap the Blood group you need, then use the minus and plus buttons to set the Amount (1 to 8 bags).',
    s3: 'Write the Donation place. Start typing to pick from the suggested hospitals, or type any place.',
    s4: 'Enter a Contact number (a Bangladesh mobile number such as 01712345678). Tap "+ add another number" if you want to give a second one. Leave "Needed within 1 hour" ticked for a critical request, or untick it if a few hours is fine.',
    s5: 'Check the Your post preview, which updates as you type, then press Post SOS. The button stays grey until the blood group, the place and a valid number are filled in.',
    s6: 'After a moment you see "Your SOS is posted". Use Copy post, Share on WhatsApp or Share on Facebook to spread it, Track this request to open the Live Tracker, or Post another to start again.',
  },
  tips: {
    t1: 'Only three things are required: blood group, donation place and one contact number. Everything else can be left empty and that line is simply left out of the post.',
    t2: 'The post is written in the language you are using. Switch the language first if you want the post in Bengali or English.',
    t3: 'This is a demo: no real SMS or alert is sent to donors. The request is added to the app\'s list and a notification appears under the bell, but only in your browser.',
    t4: 'The Live Tracker shows a sample rescue mission, not the request you just posted. Back to Hub leaves this screen without posting.',
  },
};

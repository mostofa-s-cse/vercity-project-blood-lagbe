import type { DocSection } from './section.ts';

export const deck: DocSection = {
  title: 'Pitch Deck',
  summary:
    'A short four-slide presentation that explains the Blood Lagbe? idea. Use it when you present the project to judges, partners or new users.',
  steps: {
    s1: 'Open Pitch Deck from the menu. Each slide shows a tag at the top and a counter such as "Slide 1 of 4".',
    s2: 'Press "Next Slide" to move forward and "Previous" to go back. You can also tap the small dots at the bottom to jump straight to any slide.',
    s3: 'Slide 1, The Blood Crisis in Bangladesh: the shortage of safe blood, blood broker syndicates, and unverified requests on social media.',
    s4: 'Slide 2, Blood Lagbe? (রক্ত লাগবে?): the solution in three steps, namely SMS alerts to donors nearby, doctor-verified requisition slips, and live tracking with an OTP sign-off.',
    s5: 'Slide 3, Digital Donor Passport & Biological Guardrails: the 90-day rest period between donations, the digital smart ID, and cold-chain temperature monitoring.',
    s6: 'Slide 4, Measurable Impact & Scalability Roadmap: headline figures and the plan to grow to all 64 districts. Press "Launch Emergency Hub" to go to the app\'s home screen.',
  },
  tips: {
    t1: '"Previous" is greyed out on the first slide and "Next Slide" on the last one.',
    t2: 'The figures on the slides, such as the 18.4m average response or 2,480+ verified donors, are sample pitch numbers for this demo, not live statistics.',
    t3: 'There are no keyboard shortcuts for the slides. Use the buttons or the dots.',
  },
};

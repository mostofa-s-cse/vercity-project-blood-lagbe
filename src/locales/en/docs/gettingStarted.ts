import type { DocSection } from './section.ts';

export const gettingStarted: DocSection = {
  title: 'Getting started',
  summary:
    'Blood Lagbe? helps people in Bangladesh find blood fast in an emergency by connecting families, voluntary donors and hospitals in one place. This page explains who the app is for and where to begin.',
  steps: {
    s1: 'Open the app. It starts on the Emergency Hub, which shows urgent blood requests near you and a big button to send an SOS.',
    s2: 'If your family needs blood, use Create SOS Request to post the request, then follow it on Track Requests and Live Tracker.',
    s3: 'If you want to give blood, use Register as Donor to create your donor profile, find people to help on the Emergency Hub, and see your record on Donor Passport.',
    s4: 'If you work at a hospital or run the service, use Hospitals & Blood Banks and the Admin Panel to see blood stock, requests and alerts. The Admin Panel and the National Emergency Blood Operations Hub (Ops Command) are for administrators only.',
    s5: 'Choose your language. The language is part of the web address (/bn/... for Bengali, /en/... for English). Press the language button in the top bar (it shows বাংলা or English) to switch the same page to the other language.',
    s6: 'Explore in this order for the full picture: Emergency Hub, Create SOS Request, Track Requests, Live Tracker, Donor Directory, Register as Donor, Donor Passport, Hospitals & Blood Banks, Admin Panel, then Pitch Deck.',
    s7: 'Come back to this User Guide any time from the navigation tabs or the footer.',
  },
  tips: {
    t1: 'This is a demo. All donors, hospitals, requests and numbers are sample data. No real SMS, calls or alerts are sent to anyone.',
    t2: 'Anything you create, such as an SOS request or a donor profile, is kept only while the page is open and is cleared when you reload. Only the alert text set on the Admin Panel is remembered by your browser.',
    t3: 'If you open an address without /bn or /en, the app sends you to the language you used last time, or to Bengali the first time.',
    t4: 'Blood donation in Bangladesh is voluntary and free. The app never asks you to pay for blood.',
  },
};

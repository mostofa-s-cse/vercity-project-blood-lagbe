import { gettingStarted } from './docs/gettingStarted.ts';
import { header } from './docs/header.ts';
import { hub } from './docs/hub.ts';
import { donors } from './docs/donors.ts';
import { sos } from './docs/sos.ts';
import { tracking } from './docs/tracking.ts';
import { register } from './docs/register.ts';
import { passport } from './docs/passport.ts';
import { hospitals } from './docs/hospitals.ts';
import { command } from './docs/command.ts';
import { admin } from './docs/admin.ts';
import { faq } from './docs/faq.ts';

export const docs = {
  pageTitle: 'User Guide',
  pageSubtitle: 'How Blood Lagbe? works, from the first screen to the last.',
  tocTitle: 'Contents',
  openScreen: 'Open this screen',
  stepsLabel: 'How it works',
  tipsLabel: 'Good to know',
  backToTop: 'Back to top',
  demoNoteTitle: 'This is a demo',
  demoNote:
    'Blood Lagbe? runs here as a working demo. The donors, hospitals and requests you see are sample data. Anything you create (an SOS, a donor profile, a notification) lives only in your browser session and is gone when you reload the page.',
  sections: { gettingStarted, header, hub, donors, sos, tracking, register, passport, hospitals, command, admin },
  faq,
};
export type Docs = typeof docs;

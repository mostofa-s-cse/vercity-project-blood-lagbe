import type { Docs } from '../en/docs.ts';
import { gettingStarted } from './docs/gettingStarted.ts';
import { header } from './docs/header.ts';
import { hub } from './docs/hub.ts';
import { donors } from './docs/donors.ts';
import { sos } from './docs/sos.ts';
import { tracking } from './docs/tracking.ts';
import { tracker } from './docs/tracker.ts';
import { register } from './docs/register.ts';
import { passport } from './docs/passport.ts';
import { hospitals } from './docs/hospitals.ts';
import { command } from './docs/command.ts';
import { admin } from './docs/admin.ts';
import { deck } from './docs/deck.ts';
import { faq } from './docs/faq.ts';

export const docs: Docs = {
  pageTitle: 'ব্যবহার নির্দেশিকা',
  pageSubtitle: 'Blood Lagbe? কীভাবে কাজ করে, প্রথম স্ক্রিন থেকে শেষ স্ক্রিন পর্যন্ত।',
  tocTitle: 'সূচিপত্র',
  openScreen: 'এই স্ক্রিনটি খুলুন',
  stepsLabel: 'কীভাবে কাজ করে',
  tipsLabel: 'জেনে রাখুন',
  backToTop: 'উপরে ফিরে যান',
  demoNoteTitle: 'এটি একটি ডেমো',
  demoNote:
    'এখানে Blood Lagbe? একটি কার্যকর ডেমো হিসেবে চলছে। যেসব রক্তদাতা, হাসপাতাল ও রিকোয়েস্ট দেখা যায় সেগুলো নমুনা তথ্য। আপনি যা তৈরি করেন (এসওএস, রক্তদাতা প্রোফাইল, নোটিফিকেশন) তা শুধু আপনার ব্রাউজার সেশনে থাকে, পেজ রিলোড করলে মুছে যায়।',
  sections: { gettingStarted, header, hub, donors, sos, tracking, tracker, register, passport, hospitals, command, admin, deck },
  faq,
};

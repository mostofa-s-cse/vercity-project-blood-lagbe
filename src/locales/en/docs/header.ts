import type { DocSection } from './section.ts';

export const header: DocSection = {
  title: 'Top bar, menu and footer',
  summary:
    'The top bar and the footer appear on every screen except the Admin Panel, which has its own layout. They give you the live alert, quick actions and links to every screen.',
  steps: {
    s1: 'Read the red strip at the very top. After CRITICAL ALERT: a message about the most urgent blood need scrolls by. The same strip shows the Helpline 24/7: 10655 / 999 number on wider screens.',
    s2: 'Press Audio On to mute the alert sounds; it then shows Muted. Press it again to turn the sounds back on.',
    s3: 'Press the Blood Lagbe? logo to go back to the Emergency Hub. Next to it you can pick your division or zone from the list.',
    s4: 'Press the bell to open Donor Emergency Alerts. The red number on the bell counts unread alerts. Tap an alert to mark it as read, press Respond Now on an urgent one to go to Track Requests, or press Clear All to empty the list.',
    s5: 'Press the language button to switch the same page between Bengali and English. It shows বাংলা while you are in English and English while you are in Bengali.',
    s6: 'Press SOS TRIGGER to go straight to Create SOS Request. Press the round profile photo with the O+ badge to open your Donor Passport.',
    s7: 'Use the row of tabs under the top bar to move between screens; NEW and LIVE badges mark highlighted ones. On a phone, press the menu button to see the same list and the Division / Zone: picker. The footer at the bottom repeats all the links and has a Legal Hotline: 10655 / 999 button.',
  },
  tips: {
    t1: 'Short messages (toasts) appear at the bottom right after actions such as sending an SOS or registering as a donor. They close by themselves after a few seconds, or press the X.',
    t2: 'The alert strip text is set by staff in the Alerts & Radius Control tab of the Admin Panel, and your browser remembers it after a reload.',
    t3: 'The alerts in the bell are sample data, and a new SOS adds one to the top. The DGHS Carrier SMS Live label is for show: no real SMS is sent.',
    t4: 'In this demo the division or zone you pick is only remembered; it does not change the requests or donors shown on other screens.',
  },
};

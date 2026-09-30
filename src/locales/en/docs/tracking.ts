import type { DocSection } from './section.ts';

export const tracking: DocSection = {
  title: 'Track Requests',
  summary:
    'This screen lists blood requests and shows where each one stands. Patient families and hospital staff use it to follow a request from Pending to Donor Found to Completed, or to cancel it.',
  steps: {
    s1: 'Use the tabs at the top: My requests, Pending, Donor Found, Completed and Cancelled. Each tab shows a count. My requests combines requests remembered in this browser (from the SOS form) with your own requests when you are signed in, and opens automatically if this browser has any.',
    s2: 'On each card, read the blood group and bags needed, the Critical or Normal badge, the status badge, and the three-stage progress bar: Posted, Found, Done.',
    s3: 'See the donation place and area, how many donors have already pledged out of the bags needed, and the attendant\'s name if one was given. Tap a phone number to call.',
    s4: 'Open Answers to see who has offered to donate. Their phone numbers show only when you manage the request; otherwise just their names appear.',
    s5: 'For a request you manage (its manage token is remembered in this browser, or it is your own signed-in request), use the buttons at the bottom: Mark donor found, Mark completed, Cancel, or Back to pending, depending on the current status. Confirm the prompt for Cancel and Mark completed.',
    s6: 'Press Share to copy the request\'s post text, or Post Blood Request at the top to open Create SOS Request. Press Load more if a tab holds more requests than fit on one page.',
  },
  tips: {
    t1: 'Every status change shows a short confirmation message at the bottom of the screen; if someone else changed the request first, the card refreshes to show what actually happened.',
    t2: 'When no database is connected (demo mode) a note says the requests are sample data: the list still shows example requests, but nothing can be changed and My requests is empty.',
    t3: 'A request only moves DONOR_FOUND to PENDING back and forth or forward to COMPLETED or CANCELLED; COMPLETED and CANCELLED cannot be changed again. The server refuses any other move even if a button is somehow pressed twice.',
    t4: 'Manage tokens are remembered per browser, capped in number, and lost if you clear site data. Signing in and using "my requests" does not depend on that memory.',
  },
};

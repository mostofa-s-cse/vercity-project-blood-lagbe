import type { DocSection } from './section.ts';

export const tracking: DocSection = {
  title: 'Track Requests',
  summary:
    'This screen lists blood requests and shows where each one stands. Patient families and hospital staff use it to follow a request from Pending to Donor Found to Completed, or to cancel it.',
  steps: {
    s1: 'Use the tabs at the top (All Requests, Pending, Donor Found, Completed, Cancelled) to filter the list. Each tab shows how many requests it holds.',
    s2: 'Type in the search box to find a request by patient name, hospital or request ID.',
    s3: 'On each card, read the blood group and bags needed, the status badge, and the progress bar through the four stages: Request Issued, Donor Matching, OTP Confirmation and Donation Successful.',
    s4: 'Tap the phone number buttons to call the attendant or an assigned donor. Assigned donors and their ETA appear once a donor is found.',
    s5: 'Tap Doctor Slip to open the Official Clinical Requisition for that request. Press Acknowledge & Close when you are done.',
    s6: 'Move a request forward with the action buttons: Accept Donor turns a Pending request into Donor Found, and Confirm Handshake Completed turns Donor Found into Completed. Cancel Request is available until a request is completed.',
  },
  tips: {
    t1: 'Every status change shows a short confirmation message at the bottom of the screen.',
    t2: 'The requests here are sample data. Status changes are kept only while you stay on this screen, and SOS requests you create elsewhere are not added to this list.',
    t3: 'Share only shows a "link copied" message in this demo; nothing is actually copied.',
    t4: 'Post Blood Request at the top takes you to the Create SOS Request form.',
  },
};

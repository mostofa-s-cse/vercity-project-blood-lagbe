import type { DocSection } from './section.ts';

export const hub: DocSection = {
  title: 'Emergency Hub',
  summary:
    'The Emergency Hub is the home screen. Families start here to send an SOS, and donors come here to see the blood requests people have posted and offer to help.',
  steps: {
    s1: 'If you need blood, press Post a Blood Request in the Need Blood Urgently? card. It opens Create SOS Request, where you fill in the details. Your request then appears in the Blood Requests list.',
    s2: 'In Filter by blood group, press a blood group (or ALL) to show only the requests for that group. In the Blood Requests heading, press Emergencies only to hide requests that are not marked as emergencies; press it again to see all.',
    s3: 'Scroll through Blood Requests. Requests still looking for a donor come first, and emergencies lead among them. Each card shows the blood group and bags needed, the patient (or the problem), the place and area, its status (Looking for donors, Donor found, Completed or Cancelled), how many donors already said yes, and Time Left to Answer: one hour for an emergency, four hours for any other request, counted from when it was posted.',
    s4: 'To help, press I Can Donate on a card. A small form asks for your name and mobile number; press Send. The family then sees your name, and your number is shown only to the person who posted the request. The card changes to You offered to donate, and the count of donors who said yes goes up.',
    s5: 'Press Direct Call to phone the number given in the request, or the share icon to send the request text to others. If there are more requests than fit on the screen, press Load more requests at the bottom of the list.',
    s6: 'On the right, 24/7 Emergency Hotlines gives call buttons for national blood banks. See all hospitals and blood banks opens the full Hospitals & Blood Banks screen.',
  },
  tips: {
    t1: 'The Blood Requests list comes from the database. When no database is connected (demo mode) a yellow note says Sample data: you then see example requests, and I Can Donate is turned off because answers could not be saved.',
    t2: 'Your name and number are remembered in this browser after you send them, so the form is filled in for you next time. The same phone number can answer a request only once, and completed or cancelled requests take no answers.',
    t3: 'Saying I Can Donate does not book anything. Calling the family is the fastest way to agree on a time and place.',
    t4: 'The share icon uses your phone\'s share menu if it has one; otherwise the request text is copied so you can paste it into WhatsApp or Facebook.',
  },
};

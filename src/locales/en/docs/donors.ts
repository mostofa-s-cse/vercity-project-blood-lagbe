import type { DocSection } from './section.ts';

export const donors: DocSection = {
  title: 'Donor Directory',
  summary:
    'The Donor Directory lists voluntary blood donors so a patient\'s family or hospital staff can find a matching donor and call them quickly. It is open to everyone; no account is needed.',
  steps: {
    s1: 'Under "Filter Blood Group:", tap the blood group you need (for example O+), or tap ALL to see every group.',
    s2: 'Type in the search box to look up a donor by name, area (such as Dhanmondi) or division (such as Dhaka). The list updates a moment after you stop typing.',
    s3: 'Tick or untick "Available Now" to show only donors who are currently available, or everyone.',
    s4: 'Read a donor card: initials, name, blood group, area and division, whether the donor is available, age and gender when given, vehicle, the last donation (in months, or "Not stated") and the nearest hospital. A green strip on top means the donor is available.',
    s5: 'Above the cards you see "Showing X of Y donors". The list loads 20 donors at a time; tap "Load more" at the bottom to add the next 20.',
    s6: 'Tap anywhere on a card to open the donor\'s details. The phone number is shown partly hidden (for example 017••••4315).',
    s7: 'Tap "Call" on a card or in the details. The full number is fetched only at that moment, and your phone or computer is asked to dial it. If it cannot be fetched, a message appears under the button; try again.',
    s8: 'Need many donors at once? Tap "Broadcast SOS Alert Now" at the top to create an SOS request, or "Donor Passport" to open your own passport.',
  },
  tips: {
    t1: 'Full phone numbers are never part of the list. Each one is fetched only when someone presses "Call" for that donor.',
    t2: '"Available Now" is ticked when the screen opens. If no donor matches, tap "Reset All Filters": it chooses ALL groups, clears the search and unticks "Available Now".',
    t3: 'Searching by distance or by a verification mark is not available yet; filter by blood group, availability and text instead.',
    t4: 'When no database is connected (for example in a demo), a yellow note says the list shows sample donors. Those names and numbers are not real, the filters work on the sample list, and "Call" dials the made-up sample number.',
    t5: 'If the list cannot be loaded, a "Retry" button appears. Press it once your connection is back.',
  },
};

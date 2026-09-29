import type { DocSection } from './section.ts';

export const donors: DocSection = {
  title: 'Donor Directory',
  summary:
    'The Donor Directory lists voluntary blood donors so a patient\'s family or hospital staff can find a matching donor nearby and contact them quickly.',
  steps: {
    s1: 'Under "Filter Blood Group:", tap the blood group you need (for example O+), or tap ALL to see every group.',
    s2: 'Type in the search box to look up a donor by name, area (such as Dhanmondi), nearest hospital or vehicle.',
    s3: 'Drag the "Max Radius" slider (1 to 25 km) to show only donors within that distance. Tick or untick "Available Now" and "BDRCS Verified" to narrow or widen the list.',
    s4: 'Read a donor card: blood group, area and distance, donation count, vehicle, and a row with Hemoglobin, Rest Period (days since the last donation, green once 90 days have passed) and Transit ETA. A green strip on top means the donor is available.',
    s5: 'Tap anywhere on a card to open the donor\'s details: age, gender, Clinical Fitness & Lab Screen, Nearest Hospital Base, Rapid Transit Mode, Lifetime Donations, Languages and the Verified Contact Phone.',
    s6: 'Tap "Direct Call" on a card, or "Call Now" in the details, to call the donor. Tap "SOS Ping" to send the donor an urgent alert.',
    s7: 'Need many donors at once? Tap "Broadcast SOS Alert Now" at the top to create an SOS request, or "Donor Passport" to open your own passport.',
  },
  tips: {
    t1: 'All donors, phone numbers and health figures are sample data for this demo. The "SOS Ping" only shows a message on screen; no real SMS is sent.',
    t2: '"Direct Call" asks your phone or computer to dial the number shown, like any phone link. The numbers are fake, so do not expect a real donor to answer.',
    t3: '"Available Now" and "BDRCS Verified" are both ticked when the screen opens, and the radius starts at 15 km. If no donor matches, tap "Reset All Filters" (it does not untick "BDRCS Verified"; do that yourself if needed).',
    t4: 'Donors you add on the "Register as Donor" screen appear at the top of this list until you reload the page.',
  },
};

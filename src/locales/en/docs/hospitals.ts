import type { DocSection } from './section.ts';

export const hospitals: DocSection = {
  title: 'Hospitals & Blood Banks',
  summary:
    'The portal for hospital and blood bank staff. Anyone can check a facility\'s blood stock, cold storage and ICU beds, sign up for donation camps and start urgent blood requests. Changing stock and creating camps is for administrators and hospital accounts.',
  steps: {
    s1: 'Open Hospitals & Blood Banks from the menu. Use "Switch Active Facility" at the top to choose which hospital or blood bank you are looking at.',
    s2: 'On the "Blood Vault & Cold Storage" tab, the top cards show Total Units in Vault (always the sum of all blood groups), Chiller Temp, Critical ICU Beds (with the total number of beds) and Health Audit Status.',
    s3: 'Below them, each blood group has its own card with its number of units. A group with fewer than 20 units is marked LOW in red, the rest show SAFE.',
    s4: 'If you may change this facility\'s stock, each card has +1 (a donor gave a bag) and -1 (a bag was used for a transfusion). Only an administrator (any hospital) or the hospital\'s own account (its own hospital) can do this. Everyone else sees "View only" and a note explaining why. A group cannot go below 0.',
    s5: 'On the "Doctor Requisition Desk" tab, read the Hospital Protocol Compliance rules, then press "Issue Requisition & Broadcast". This takes you to the Create SOS Request screen, where you fill in the request.',
    s6: 'On the "Donation Drives & Camps" tab, each camp card shows the venue, date, contact number and a bar of registered donors against the target. Anyone can press "Register to Donate" to sign up for a camp.',
    s7: 'Administrators and hospital accounts also see "Schedule Blood Camp". Fill in Camp Title and Venue / Location, and if you like Date and Target Bags, then press "Publish Blood Camp". The new camp appears first in the list.',
    s8: 'On the "Emergency Call Dispatch" tab, press "Launch Immediate SOS Beacon" to open the SOS request form, or "Explore Donor Directory" to browse donors.',
  },
  tips: {
    t1: 'When the site has a database, stock changes made by an administrator or hospital account are saved and everyone sees the same numbers. Groups a hospital has never updated still show the sample figures. If a change cannot be saved, it is undone and a message tells you to try again.',
    t2: 'When sign-in is not set up (demo mode), everyone can press +1 and -1 to try it out, but the changes stay in your browser only and reset when you leave or reload.',
    t3: 'Camps, camp sign-ups and new camps are sample data and are not saved: they reset when you leave or reload. If you leave Date empty, a new camp shows "Upcoming Weekend" and uses the selected facility\'s name and hotline.',
    t4: '"Refresh Telemetry" only shows a confirmation message; no real temperature sensors are connected. Hospital details, beds and temperatures are sample data.',
    t5: 'No calls or SMS are sent from this screen. The dispatch and requisition buttons simply open other screens of the app.',
  },
};

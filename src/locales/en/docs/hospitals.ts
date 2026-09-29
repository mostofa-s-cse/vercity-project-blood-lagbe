import type { DocSection } from './section.ts';

export const hospitals: DocSection = {
  title: 'Hospitals & Blood Banks',
  summary:
    'The portal for hospital and blood bank staff. Here you check a facility\'s blood stock, cold storage and ICU beds, run donation camps, and start urgent blood requests.',
  steps: {
    s1: 'Open Hospitals & Blood Banks from the menu. Use "Switch Active Facility" at the top to choose which hospital or blood bank you are looking at.',
    s2: 'On the "Blood Vault & Cold Storage" tab, the top cards show Total Units in Vault, Chiller Temp, Critical ICU Beds (with the total number of beds) and Health Audit Status.',
    s3: 'Below them, each blood group has its own card with its number of units. A group with fewer than 20 units is marked LOW in red, the rest show SAFE. Press +1 when a donor gives a bag, or -1 when a bag is used for a transfusion.',
    s4: 'On the "Doctor Requisition Desk" tab, read the Hospital Protocol Compliance rules, then press "Issue Requisition & Broadcast". This takes you to the Create SOS Request screen, where you fill in the request.',
    s5: 'On the "Donation Drives & Camps" tab, each camp card shows the venue, date, contact number and a bar of registered donors against the target. Press "Register to Donate" to sign up for a camp.',
    s6: 'To create a camp, press "Schedule Blood Camp", fill in Camp Title and Venue / Location, and if you like Date and Target Bags. Then press "Publish Blood Camp". Your new camp appears first in the list.',
    s7: 'On the "Emergency Call Dispatch" tab, press "Launch Immediate SOS Beacon" to open the SOS request form, or "Explore Donor Directory" to browse donors.',
  },
  tips: {
    t1: 'All hospitals, stock figures, beds and camps are sample demo data. Stock changes, camp sign-ups and new camps are kept only while you stay on this screen, and reset when you leave or reload.',
    t2: '"Refresh Telemetry" only shows a confirmation message. No real temperature sensors are connected.',
    t3: 'If you leave Date empty, the new camp shows "Upcoming Weekend". The camp is listed under the facility you have selected and uses its hotline number.',
    t4: 'No calls or SMS are sent from this screen. The dispatch and requisition buttons simply open other screens of the app.',
  },
};

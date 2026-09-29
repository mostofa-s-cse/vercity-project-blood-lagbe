import type { DocSection } from './section.ts';

export const admin: DocSection = {
  title: 'Admin Panel',
  summary:
    'The Admin Panel is the control room of the demo. Here you set the alert and radius messages that public pages show, and you can try the verification desks for donors, requests, hospitals and fraud reports.',
  steps: {
    s1: 'The Admin Panel is only for administrators. Sign in with an administrator account and the "Admin Panel" link appears in the header menu. The panel has its own dark layout without the normal header and footer. Pick a tab from the ADMIN DESK list on the left. On a phone, tap the red menu button first.',
    s2: 'Overview & Analytics shows sample numbers: metric cards, a blood group supply and demand matrix and shortage alerts. It also shows the current alert and radius text. "Configure Alerts & Radius" takes you to the alert settings, and "Manage O- Negative Requests" opens the request list filtered to O-.',
    s3: 'In Alerts & Radius Control, use Emergency Alert Setup: fill in the hospital, ward or bed, bags, blood group and urgency, set the Active switch, then press "Save & Broadcast Emergency Alert". The text then scrolls in the red CRITICAL ALERT ticker at the top of every public page. If you switch it to Inactive, the ticker says no Code-Red alert is active.',
    s4: 'In Emergency Radius Setup, choose the zone, the distance in km, the number of urgent requests and the key hospitals, then press "Update Emergency Radius". This message shows in the radar strip on the Emergency Hub. The Public Live Previews box shows both messages, "Reset" brings back the default messages and "Test Siren" plays the siren sound.',
    s5: 'In Donor Registry, search or filter the sample donors. Click the Verified or Unverified badge, or the Available or Resting badge, to switch it. The eye icon opens the Donor Full Dossier, where you can grant or revoke the verified badge. "Add New Donor" opens the donor registration form.',
    s6: 'In Blood Requests Desk, each card is a sample request. "Assign", "Complete" and "Cancel" change its status. "Doctor Slip" opens the requisition slip, and "Post Blood Request" opens the Create SOS form.',
    s7: 'In Hospitals & Blood Banks, click the Verified or Unverified badge to switch it. In Anti-Fraud & Syndicates, press "Blacklist Entity" or "Dismiss" on a pending report. Audit Logs & SMS only shows sample gateway status and log lines.',
    s8: 'To go back, press "Public Site" at the top or "Back to Public App" in the sidebar. Both open the Emergency Hub. The PUBLIC MODULES links in the sidebar open other public pages, and the language button at the top switches between Bangla and English.',
  },
  tips: {
    t1: 'The panel has no password. Anyone with the link can open it. The admin name and the "Session Verified" button are only for show.',
    t2: 'Only the alert and radius settings are saved, and only in this browser. Changes to donors, requests, hospitals and fraud reports reset when you leave the panel or reload. They do not change the public Donor Directory. "SOS Broadcast" and "Send Emergency Ping" only play a sound and show a message. No SMS is sent.',
    t3: 'The custom message box is already filled with the current Bangla text, so the ticker does not change when you edit other fields. To build a new message from the fields, empty the box before you save. If you type your own Bangla message, the English ticker keeps its old text.',
    t4: 'Donor Registry and Blood Requests Desk share the same search box and filters. If a list looks empty after you switch tabs, set the filters back to "All Blood Groups" and "All Statuses".',
  },
};

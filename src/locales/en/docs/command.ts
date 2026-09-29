import type { DocSection } from './section.ts';

export const command: DocSection = {
  title: 'Ops Command',
  summary:
    'The National Emergency Blood Operations Hub, a DGHS-style control room for coordinators and admins. It brings blood reserves, the SOS queue, cold storage, fraud reports and SMS gateway health together in one place.',
  steps: {
    s1: 'Open it from the Emergency Hub with the "Access Complete Dhaka Hospital Network Directory" button. The header shows Active National SOS, Donors On Standby and a "Trigger Red Alert" button.',
    s2: 'The "Overview & Matrix" tab shows key figures (Avg Response Time, Fulfillment Ratio, Cold-Chain Alarms, Syndicates Intercepted) and a matrix of all 8 blood groups with their bag counts and a status such as Optimal, Low Stock or CRITICAL.',
    s3: 'The "Emergency SOS Queue" tab lists open cases. Press "Inspect" to see the case\'s Official Clinical Requisition slip, "Mark Dispatched" to change its status (press again to set it back to Active), or "Telemetry" to open the Live Tracker. "Manual SOS Intake" opens the SOS request form.',
    s4: 'The "Hospitals & Cold-Chain Stocks" tab shows each chiller unit\'s temperature and how full it is, against a target of +2°C to +6°C. A unit marked TEMP RISING is highlighted in amber. Below are hospital cards with total bags, critical beds, triage lead and a Direct Hotline button.',
    s5: 'The "Anti-Fraud & Syndicates" tab lists reported incidents with their severity, target, carrier and location. Press "Permanent Blacklist" or "Dismiss" on a pending one, and the card then shows "Action Taken".',
    s6: 'The "Telecom Gateways" tab shows each mobile operator\'s SMS throughput, API latency and delivery rate, plus the status of the National Emergency Service 999 link.',
  },
  tips: {
    t1: 'Everything on this screen is sample data. The figures, gateways and 999 link are fixed demo values, not live connections.',
    t2: '"Trigger Red Alert" plays a siren sound and shows a message, but no alert is actually sent to anyone. Close the message with its X button.',
    t3: 'Blacklisting, dismissing and changing a case status only change what you see here. Nobody is really blocked, and everything resets when you leave the screen.',
    t4: 'The Direct Hotline button opens your phone\'s dialer with a number from the sample data. Check the number yourself before relying on it in a real emergency.',
  },
};

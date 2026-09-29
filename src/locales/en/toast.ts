export const toast = {
  sosBroadcast: (bloodGroup: string, hospital: string) =>
    `Broadcast Active: ${bloodGroup} SOS dispatched to 450+ donors near ${hospital}.`,
  donorRegistered: (name: string, bloodGroup: string) =>
    `Welcome ${name}! Your ${bloodGroup} profile is now active on the donor roster.`,
  otpSuccess: 'Transfusion Handshake Confirmed! Official digital blood exchange receipt recorded.',
};
export type Toast = typeof toast;

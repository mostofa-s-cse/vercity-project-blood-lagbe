export const otp = {
  title: 'Recipient Handshake OTP',
  subtitle: 'Secure Anti-Broker Closure Token',
  errorIncomplete: 'Please enter all 4 digits of the handshake code.',
  errorIncorrect: (expectedOtp: string) => `Incorrect code. For demo, the secret OTP is ${expectedOtp}.`,
  successTitle: 'Handshake Verified!',
  successDesc: (donorName: string, patientName: string) =>
    `Blood donation officially credited to ${donorName}. 1 unit securely received for ${patientName}.`,
  explainer:
    'To eliminate financial extortion and black market blood selling, the patient attendant provides their confidential OTP to the volunteer donor upon bedside bag verification.',
  enterCode: 'Enter 4-Digit Handshake Code',
  autoFill: (expectedOtp: string) => `Auto-fill Attendant's OTP (${expectedOtp})`,
  confirmHandover: 'Confirm Blood Handover',
};
export type Otp = typeof otp;

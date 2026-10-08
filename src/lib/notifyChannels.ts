/**
 * Honest email/SMS delivery stubs. Without the matching environment variable configured, each resolves
 * immediately, doing nothing but a debug log — never throws, never blocks the caller, and never
 * pretends to have sent something. No real provider (Resend, an SMS gateway, ...) is wired in this
 * package; this is the switch the owner plugs a real key into later (same spirit as every other
 * "needs a real key" action in this app).
 */

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.debug(`[notify] email skipped, no RESEND_API_KEY configured: to=${to} subject=${JSON.stringify(subject)}`);
    return;
  }
  // No real provider call is made yet — set RESEND_API_KEY only once one is actually wired up.
  console.debug(`[notify] email would send: to=${to} subject=${JSON.stringify(subject)} body=${JSON.stringify(body)}`);
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (!process.env.SMS_GATEWAY_API_KEY) {
    console.debug(`[notify] sms skipped, no SMS_GATEWAY_API_KEY configured: to=${to}`);
    return;
  }
  console.debug(`[notify] sms would send: to=${to} body=${JSON.stringify(body)}`);
}

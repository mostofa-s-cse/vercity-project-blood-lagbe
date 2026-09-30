import { NextResponse } from 'next/server';
import { GrantError, type GrantErrorCode } from './grantService';

const STATUS: Record<GrantErrorCode, number> = {
  service_key_missing: 503,
  not_found: 404,
  role_not_found: 404,
  cannot_revoke_self: 400,
  hospital_required: 400,
  name_taken: 409,
  system_role_locked: 403,
  role_in_use: 409,
};

/** Turns a rule violation from the grant service into the API answer, or null if it is some other error. */
export function grantErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof GrantError)) return null;
  return NextResponse.json({ error: error.code }, { status: STATUS[error.code] });
}

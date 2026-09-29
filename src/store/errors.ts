/**
 * Helpers for the errors RTK Query hands back. A server answer has a numeric `status` and, for our API,
 * a JSON body like `{ "error": "already_responded" }`. A network failure or an unreadable answer has a
 * text status (`FETCH_ERROR`, `PARSING_ERROR`) and neither of these helpers finds anything.
 */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** The HTTP status of an answer from our server, or undefined. */
export function apiStatus(error: unknown): number | undefined {
  return isRecord(error) && typeof error.status === 'number' ? error.status : undefined;
}

/** The `error` code our API puts in the body of a failed answer, or undefined. */
export function apiErrorCode(error: unknown): string | undefined {
  if (apiStatus(error) === undefined || !isRecord(error) || !isRecord(error.data)) return undefined;
  return typeof error.data.error === 'string' ? error.data.error : undefined;
}

/** True when the server answered that no database is connected: the screens then show sample data. */
export function isDatabaseOff(error: unknown): boolean {
  return apiStatus(error) === 503 && apiErrorCode(error) === 'database_not_configured';
}

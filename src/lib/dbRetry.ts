/**
 * Supabase's pooler closes idle connections, so a pooled one can die between two requests ("Connection
 * terminated unexpectedly"). A read that hits one is safe to run again on a fresh connection; a write is not
 * (it may already have been applied), so only reads are retried.
 */
export function isTransientDbError(error: unknown): boolean {
  const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : '';
  return /connection terminated|ECONNRESET|server closed the connection/i.test(message);
}

const READ_OPERATIONS = new Set(['findMany', 'findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy']);

export function isReadOperation(operation: string): boolean {
  return READ_OPERATIONS.has(operation);
}

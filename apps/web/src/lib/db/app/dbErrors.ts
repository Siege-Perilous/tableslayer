// Drizzle wraps driver errors in DrizzleQueryError, whose message is only the failed SQL; the
// libsql/SQLite detail lives on `cause`. Match against the whole chain, not just the top message.
export const errorChainMatches = (error: unknown, pattern: RegExp): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    const message =
      typeof current === 'object' && 'message' in current
        ? String((current as { message: unknown }).message)
        : String(current);
    if (pattern.test(message)) return true;
    current = typeof current === 'object' && 'cause' in current ? (current as { cause: unknown }).cause : undefined;
  }
  return false;
};

const UNIQUE_CONSTRAINT = /UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i;

export const isUniqueConstraintError = (error: unknown): boolean => errorChainMatches(error, UNIQUE_CONSTRAINT);

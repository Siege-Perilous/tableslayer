import { DrizzleQueryError } from 'drizzle-orm/errors';
import { describe, expect, it } from 'vitest';
import { isUniqueConstraintError } from './dbErrors';

const sqliteUniqueError = () =>
  new Error(
    'Hrana(CursorError(StepError { step: 0, error: Error { message: "SQLite error: UNIQUE constraint failed: party.slug", code: "SQLITE_CONSTRAINT" } }))'
  );

describe('isUniqueConstraintError', () => {
  it('matches a bare libsql unique-constraint error', () => {
    expect(isUniqueConstraintError(sqliteUniqueError())).toBe(true);
  });

  it('finds the constraint message when drizzle wraps it as the cause', () => {
    const wrapped = new DrizzleQueryError('insert into "party" ...', ['testing'], sqliteUniqueError());
    expect(wrapped.message).not.toContain('UNIQUE');
    expect(isUniqueConstraintError(wrapped)).toBe(true);
  });

  it('ignores unrelated errors and non-errors', () => {
    expect(isUniqueConstraintError(new Error('SQLITE_BUSY: database is locked'))).toBe(false);
    expect(isUniqueConstraintError(new DrizzleQueryError('select 1', [], new Error('stream not found')))).toBe(false);
    expect(isUniqueConstraintError(undefined)).toBe(false);
  });
});

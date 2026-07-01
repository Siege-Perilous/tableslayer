// Base class for expected, user-facing errors. apiFactory returns these as 400s and does NOT report
// them to Sentry (unlike unexpected/infrastructure errors). See src/lib/factories/apiFactory.ts.
// Lives outside $lib/server so apiFactory (re-exported from the client-reachable $lib/factories
// barrel) can reference it without pulling a $lib/server module into the browser bundle.
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

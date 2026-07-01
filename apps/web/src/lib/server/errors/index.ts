// Base class for expected, user-facing errors. apiFactory returns these as 400s and does NOT
// report them to Sentry (unlike unexpected/infrastructure errors). See src/lib/factories/apiFactory.ts.
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SlugConflictError extends AppError {
  name = 'SlugConflictError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserAlreadyInvitedError extends AppError {
  name = 'UserAlreadyInvitedError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserAlreadyInPartyError extends AppError {
  name = 'UserAlreadyInPartyError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserIsLastAdminInParty extends AppError {
  name = 'UserIsLastAdminInParty';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EmailAlreadyInUseError extends AppError {
  name = 'EmailAlreadyInUseError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

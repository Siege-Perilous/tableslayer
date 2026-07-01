import { AppError } from '$lib/errors';

// AppError is re-exported so existing `$lib/server/errors` / `$lib/server` imports keep working.
export { AppError };

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

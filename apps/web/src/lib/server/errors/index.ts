export class SlugConflictError extends Error {
  name = 'SlugConflictError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserAlreadyInvitedError extends Error {
  name = 'UserAlreadyInvitedError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserAlreadyInPartyError extends Error {
  name = 'UserAlreadyInPartyError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserIsLastAdminInParty extends Error {
  name = 'UserIsLastAdminInParty';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

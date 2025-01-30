export class SlugConflictError extends Error {
  name = 'SlugConflictError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

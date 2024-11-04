import crypto from 'crypto';

export const getGravatarUrl = (email: string) => {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = crypto.createHash('md5').update(trimmedEmail).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}`;
};

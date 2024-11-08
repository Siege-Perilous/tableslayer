import crypto from 'crypto';

const getEmailHash = (email: string): string => {
  const trimmedEmail = email.trim().toLowerCase();
  return crypto.createHash('md5').update(trimmedEmail).digest('hex');
};

export const getGravatarUrl = (email: string) => {
  const hash = getEmailHash(email);
  return `https://www.gravatar.com/avatar/${hash}`;
};

const extractNameFromEmail = (email: string): string => {
  const namePart = email.split('@')[0];
  return namePart.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getGravatarDisplayName = async (email: string): Promise<string> => {
  const hash = getEmailHash(email);
  const response = await fetch(`https://gravatar.com/${hash}.json`);

  if (response.ok) {
    const profile = await response.json();
    console.log(profile);
    if (profile.entry[0]) {
      return profile.entry[0].displayName || extractNameFromEmail(email);
    }
  }
  // Fallback if Gravatar profile or display name is not found
  return extractNameFromEmail(email);
};

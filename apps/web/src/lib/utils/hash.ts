import { hash, verify } from '@node-rs/argon2';
import crypto from 'crypto';

const hashOptions = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
};

export const createArgonHash = async (token: string) => {
  const hashedToken = await hash(token, hashOptions);
  return hashedToken;
};

export const verifyArgonHash = async (storedToken: string, providedToken: string) => {
  const isValid = await verify(storedToken, providedToken, hashOptions);
  return isValid;
};

export const createSha256Hash = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return hashedToken;
};

export const verifySha256Hash = async (storedToken: string, providedToken: string) => {
  const isValid = storedToken === providedToken;
  return isValid;
};

export const createShortCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
};

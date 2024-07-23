import { hash, verify } from '@node-rs/argon2';

const hashOptions = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1
};

export const createHash = async (token: string) => {
  const hashedToken = await hash(token, hashOptions);
  return hashedToken;
};

export const verifyHash = async (storedToken: string, providedToken: string) => {
  const isValid = await verify(storedToken, providedToken, hashOptions);
  return isValid;
};

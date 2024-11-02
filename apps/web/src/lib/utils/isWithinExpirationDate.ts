export const isWithinExpirationDate = (date: Date): boolean => {
  return Date.now() < date.getTime();
};

export const extractLocationFromUrl = (fullUrl: string): string | null => {
  const regex = /https?:\/\/[^/]+\/(?:cdn-cgi\/image\/[^/]+\/)?(.+?)(?:\?.*)?$/;
  const match = fullUrl.match(regex);
  return match ? match[1] : null;
};

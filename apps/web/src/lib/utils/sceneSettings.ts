export type TvResolution = {
  label: string;
  value: string;
  width: number;
  height: number;
};

export const tvResolutionOptions = [
  { label: '720p', value: '720p', width: 1280, height: 720 },
  { label: '1080p', value: '1080p', width: 1920, height: 1080 },
  { label: '1440p', value: '1440p', width: 2560, height: 1440 },
  { label: '4K', value: '4K', width: 3840, height: 2160 }
];

export const getTvDimensions = (
  diagonalInches: number,
  aspectRatio: { width: number; height: number } = { width: 16, height: 9 }
): { width: number; height: number } => {
  const { width: aspectRatioWidth, height: aspectRatioHeight } = aspectRatio;
  // Calculate the diagonal factor using the Pythagorean theorem
  const diagonalFactor = Math.sqrt(aspectRatioWidth ** 2 + aspectRatioHeight ** 2);
  // Calculate height and width
  const height = (diagonalInches * aspectRatioHeight) / diagonalFactor;
  const width = (diagonalInches * aspectRatioWidth) / diagonalFactor;
  return { width, height };
};

export const selectTvResolutionOptions = tvResolutionOptions.map(({ label, value }) => ({ label, value }));

export const getResolutionOption = (width: number, height: number) => {
  return tvResolutionOptions.find((option) => option.width === width && option.height === height);
};

export const getTvSizeFromPhysicalDimensions = (width: number, height: number): number => {
  // Calculate the diagonal using the Pythagorean theorem
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

  return Math.round(diagonal);
};

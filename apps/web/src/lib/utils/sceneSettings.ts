export type TvResolution = {
  label: string;
  value: string;
  width: number;
  height: number;
};

export type AspectRatioKey = '16x9' | '16x10';

export type AspectRatioGroup = {
  [key in AspectRatioKey]: TvResolution[];
};

export const tvResolutionOptions: AspectRatioGroup = {
  '16x9': [
    { label: '720p', value: '720p', width: 1280, height: 720 },
    { label: '1080p', value: '1080p', width: 1920, height: 1080 },
    { label: '1440p', value: '1440p', width: 2560, height: 1440 },
    { label: '4K', value: '4K', width: 3840, height: 2160 }
  ],
  '16x10': [
    { label: 'WXGA', value: 'WXGA', width: 1280, height: 800 },
    { label: 'WXGA+', value: 'WSGA+', width: 1440, height: 900 },
    { label: 'WSXGA+', value: 'WSXGA+', width: 1680, height: 1050 },
    { label: 'WUXGA', value: 'WUXGA', width: 1920, height: 1200 },
    { label: 'WQXGA', value: 'WQXGA', width: 2560, height: 1600 },
    { label: 'WQUXGA', value: 'WQUXGA', width: 3840, height: 2400 }
  ]
};

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

export const selectTvResolutionOptions = (aspectRatio: AspectRatioKey = '16x9') => {
  return tvResolutionOptions[aspectRatio].map(({ label, value }) => ({ label, value }));
};

export const getResolutionOption = (width: number, height: number, aspectRatio?: AspectRatioKey) => {
  if (aspectRatio) {
    return tvResolutionOptions[aspectRatio].find((option) => option.width === width && option.height === height);
  }

  for (const ratioKey in tvResolutionOptions) {
    const foundOption = tvResolutionOptions[ratioKey as AspectRatioKey].find(
      (option) => option.width === width && option.height === height
    );
    if (foundOption) return foundOption;
  }

  return undefined;
};

export const getTvSizeFromPhysicalDimensions = (width: number, height: number): number => {
  // Calculate the diagonal using the Pythagorean theorem
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

  return Math.round(diagonal);
};

export const getAllResolutions = (): TvResolution[] => {
  return Object.values(tvResolutionOptions).flat();
};

export const getAspectRatioFromDimensions = (width: number, height: number): AspectRatioKey | undefined => {
  // Find the closest standard aspect ratio
  for (const ratioKey in tvResolutionOptions) {
    const typedRatioKey = ratioKey as AspectRatioKey;
    const [ratioWidth, ratioHeight] = typedRatioKey.split('x').map(Number);
    const calculatedRatio = width / height;
    const standardRatio = ratioWidth / ratioHeight;

    // Allow small margin of error (0.01)
    if (Math.abs(calculatedRatio - standardRatio) < 0.01) {
      return typedRatioKey;
    }
  }

  return undefined;
};

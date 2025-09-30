const BUCKET_URL = process.env.CLOUDFLARE_R2_BUCKET_URL || 'https://files.tableslayer.com';

type ImageDetails = {
  width: number;
  height: number;
  original: {
    width: number;
    height: number;
    file_size: number;
    format: string;
  };
};

export type BuildImageResult = {
  url: string;
  resizedUrl: string;
  details: ImageDetails;
};

export type Thumb = {
  thumb: BuildImageResult;
};

export const getImageDetails = async (url: string): Promise<ImageDetails> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const metadata = (await response.json()) as ImageDetails;
    return metadata;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

export const getVideoUrl = (urlFragment: string): BuildImageResult => {
  const url = `${BUCKET_URL}/${urlFragment}`;
  return {
    url,
    resizedUrl: url, // Use the same URL for videos (no resizing)
    details: {
      width: 0,
      height: 0,
      original: {
        width: 0,
        height: 0,
        file_size: 0,
        format: 'video'
      }
    }
  };
};

export const transformImage = async (urlFragment: string, options: string): Promise<BuildImageResult> => {
  const url = `${BUCKET_URL}/${urlFragment}`;
  const resizedUrl = `${BUCKET_URL}/cdn-cgi/image/${options}/${urlFragment}`;

  try {
    const detailsUrl = `${BUCKET_URL}/cdn-cgi/image/format=json,${options}/${urlFragment}`;
    const details = await getImageDetails(detailsUrl);
    return { url, resizedUrl, details };
  } catch (error) {
    console.error('Error transforming image, using fallback:', error);
    // Return a fallback response when the image service is unavailable
    // The resizedUrl will still work, we just won't have metadata
    return {
      url,
      resizedUrl,
      details: {
        width: 0,
        height: 0,
        original: {
          width: 0,
          height: 0,
          file_size: 0,
          format: 'unknown'
        }
      }
    };
  }
};

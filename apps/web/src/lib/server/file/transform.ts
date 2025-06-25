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

export const transformImage = async (urlFragment: string, options: string): Promise<BuildImageResult> => {
  const url = `https://files.tableslayer.com/${urlFragment}`;
  const resizedUrl = `https://files.tableslayer.com/cdn-cgi/image/${options}/${urlFragment}`;

  try {
    const detailsUrl = `https://files.tableslayer.com/cdn-cgi/image/format=json,${options}/${urlFragment}`;
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

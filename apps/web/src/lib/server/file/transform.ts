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

export const getImageDetails = async (url: string): Promise<ImageDetails> => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const metadata = await response.json();
    return metadata;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

export const transformImage = async (urlFragment: string, options: string) => {
  console.log('transformImage', urlFragment, options);
  try {
    const url = `https://files.tableslayer.com/${urlFragment}`;
    const resizedUrl = `https://files.tableslayer.com/cdn-cgi/image/${options}/${urlFragment}`;
    const detailsUrl = `https://files.tableslayer.com/cdn-cgi/image/format=json,${options}/${urlFragment}`;
    const details = await getImageDetails(detailsUrl);
    return { url, resizedUrl, details };
  } catch (error) {
    console.error('Error transforming image:', error);
    throw error;
  }
};

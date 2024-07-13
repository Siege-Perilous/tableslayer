import { v2 as cloudinary } from 'cloudinary';

export * from './gravatar';

export const uploadImage = async (imagePath: string, autoTag: boolean = false) => {
  let autoTagOptions = {};
  if (autoTag) {
    autoTagOptions = {
      categorization: 'google_tagging',
      auto_tagging: 0.6
    };
  }
  const options = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    ...autoTagOptions
  };

  try {
    const result = await cloudinary.uploader.upload(imagePath, options);
    console.log(result);
    return result.public_id;
  } catch (error) {
    console.error(error);
  }
};

export const getAssetInfo = async (publicId: string) => {
  try {
    // Get details about the asset
    const result = await cloudinary.api.resource(publicId);
    console.log(result);
    return result.colors;
  } catch (error) {
    console.error(error);
  }
};

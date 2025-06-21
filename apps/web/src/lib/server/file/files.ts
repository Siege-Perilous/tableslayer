import { db } from '$lib/db/app';
import { filesTable, userFilesTable } from '$lib/db/app/schema';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { Readable } from 'stream';

// Setup R2 Client
export const r2 = new S3Client({
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!
  },
  region: 'auto',
  forcePathStyle: true
});

const CLOUDFLARE_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

const generateRandomFileName = (originalName: string) => {
  const extensionMatch = originalName.match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch ? `.${extensionMatch[1]}` : '';
  return `${randomUUID()}${extension}`;
};

const uploadToR2 = async (
  fileStream: Readable | Buffer,
  fileName: string,
  contentType: string,
  destinationFolder?: string,
  contentLength?: number,
  caching: boolean = true // Default to true
) => {
  // Normalize the destination folder
  const normalizedFolder = destinationFolder?.replace(/^\/+|\/+$/g, '') || '';
  let key = fileName;

  // If there's a destination folder, include it in the key
  if (normalizedFolder) {
    key = `${normalizedFolder}/${fileName}`;
  }

  const putObjectParams = {
    Bucket: CLOUDFLARE_BUCKET_NAME,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
    ...(contentLength && { ContentLength: contentLength }),
    ...(caching === false && { CacheControl: 'no-cache, no-store, must-revalidate' }) // Apply no-cache headers if caching is false
  };

  try {
    await r2.send(new PutObjectCommand(putObjectParams));
    return key;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
};

/**
 * Function to upload a file from a URL.
 */
export const uploadFileFromUrl = async (imageUrl: string, userId: string, destinationFolder?: string) => {
  try {
    // Get the image as a buffer
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to download image from ${imageUrl}: ${response.status} ${response.statusText}`);
    }

    const originalFileName = imageUrl.split('/').pop() || 'unknown_file';
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const contentLength = fileBuffer.byteLength;

    // Generate a random file name with the original extension
    const fileName = generateRandomFileName(originalFileName);

    // Upload to R2 using the helper function
    const fullPath = await uploadToR2(fileBuffer, fileName, contentType, destinationFolder, contentLength);

    // Insert file details into your database with the correct full path
    const fileRow = await db.insert(filesTable).values({ location: fullPath }).returning().get();
    const fileToUserRow = await db.insert(userFilesTable).values({ userId, fileId: fileRow.id }).returning().get();

    return fileToUserRow;
  } catch (error) {
    console.error('Error uploading from URL:', error);
    throw error;
  }
};

/**
 * Function to upload a file from a local file input (in the browser).
 */
export const uploadFileFromInput = async (file: File, userId: string, destinationFolder?: string) => {
  try {
    const originalFileName = file.name;
    const contentType = file.type || 'application/octet-stream';
    const fileBuffer = await file.arrayBuffer(); // Convert the file to a buffer
    const contentLength = fileBuffer.byteLength;

    // Generate a random file name with the original extension
    const fileName = generateRandomFileName(originalFileName);

    // Upload to R2 using the helper function
    const fullPath = await uploadToR2(Buffer.from(fileBuffer), fileName, contentType, destinationFolder, contentLength);

    // Insert file details into your database with the correct full path
    const fileRow = await db.insert(filesTable).values({ location: fullPath }).returning().get();
    const fileToUserRow = await db.insert(userFilesTable).values({ userId, fileId: fileRow.id }).returning().get();

    return {
      userId: fileToUserRow.userId,
      fileId: fileToUserRow.fileId,
      location: fileRow.location
    };
  } catch (error) {
    console.error('Error uploading from file input:', error);
    throw error;
  }
};

export const uploadFileFromBlob = async (blob: Blob, userId: string, destinationFolder?: string) => {
  const file = new File([blob], 'fog', { type: blob.type });
  return await uploadFileFromInput(file, userId, destinationFolder);
};

// We don't bother storing any user db records for the fog of war files
export const uploadFogFromBlob = async (sceneId: string, blob: Blob) => {
  try {
    const file = new File([blob], 'fog', { type: blob.type });
    const fileType = 'image/png';
    const fileName = `${sceneId}.png`;
    const fileBuffer = await file.arrayBuffer();
    const contentLength = fileBuffer.byteLength;

    const fullPath = await uploadToR2(Buffer.from(fileBuffer), fileName, fileType, 'fog', contentLength, false);
    return fullPath;
  } catch (error) {
    console.error('Error uploading fog from blob:', error);
    throw error;
  }
};

// Upload scene thumbnail with sceneId naming
export const uploadSceneThumbnailFromBlob = async (sceneId: string, blob: Blob) => {
  try {
    const file = new File([blob], 'thumbnail', { type: blob.type });
    const fileType = 'image/jpeg';
    const fileName = `${sceneId}.jpg`;
    const fileBuffer = await file.arrayBuffer();
    const contentLength = fileBuffer.byteLength;

    const fullPath = await uploadToR2(Buffer.from(fileBuffer), fileName, fileType, 'thumbnail', contentLength, false);
    return fullPath;
  } catch (error) {
    console.error('Error uploading scene thumbnail from blob:', error);
    throw error;
  }
};

// Upload scene map with sceneId naming
export const uploadSceneMapFromFile = async (sceneId: string, file: File, userId: string) => {
  try {
    const originalFileName = file.name;
    const extensionMatch = originalFileName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : 'jpg';
    const fileName = `${sceneId}.${extension}`;
    const contentType = file.type || 'application/octet-stream';
    const fileBuffer = await file.arrayBuffer();
    const contentLength = fileBuffer.byteLength;

    const fullPath = await uploadToR2(Buffer.from(fileBuffer), fileName, contentType, 'map', contentLength);

    // Insert file details into database
    const fileRow = await db.insert(filesTable).values({ location: fullPath }).returning().get();
    const fileToUserRow = await db.insert(userFilesTable).values({ userId, fileId: fileRow.id }).returning().get();

    return {
      userId: fileToUserRow.userId,
      fileId: fileToUserRow.fileId,
      location: fileRow.location
    };
  } catch (error) {
    console.error('Error uploading scene map from file:', error);
    throw error;
  }
};

// Upload marker image with markerId naming
export const uploadMarkerImageFromFile = async (markerId: string, file: File, userId: string) => {
  try {
    const originalFileName = file.name;
    const extensionMatch = originalFileName.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : 'jpg';
    const fileName = `${markerId}.${extension}`;
    const contentType = file.type || 'application/octet-stream';
    const fileBuffer = await file.arrayBuffer();
    const contentLength = fileBuffer.byteLength;

    const fullPath = await uploadToR2(Buffer.from(fileBuffer), fileName, contentType, 'marker', contentLength);

    // Insert file details into database
    const fileRow = await db.insert(filesTable).values({ location: fullPath }).returning().get();
    const fileToUserRow = await db.insert(userFilesTable).values({ userId, fileId: fileRow.id }).returning().get();

    return {
      userId: fileToUserRow.userId,
      fileId: fileToUserRow.fileId,
      location: fileRow.location
    };
  } catch (error) {
    console.error('Error uploading marker image from file:', error);
    throw error;
  }
};

export const getFile = async (fileId: number) => {
  try {
    const fileRow = await db.select().from(filesTable).where(eq(filesTable.id, fileId)).get();
    if (!fileRow) {
      throw new Error(`File with ID ${fileId} found`);
    }
    return fileRow;
  } catch (error) {
    console.log('Error getting file from table', error);
    throw error;
  }
};

export const getR2FileInfo = async (fileName: string) => {
  try {
    const getObjectParams = {
      Bucket: CLOUDFLARE_BUCKET_NAME,
      Key: fileName
    };

    const result = await r2.send(new GetObjectCommand(getObjectParams));

    return {
      ContentType: result.ContentType,
      ContentLength: result.ContentLength,
      LastModified: result.LastModified
    };
  } catch (error) {
    console.error('Error fetching asset info from R2:', error);
    throw error;
  }
};

export const generatePresignedReadUrl = async (fileName: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: fileName
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
  return signedUrl;
};

export const generatePresignedWriteUrl = async (fileName: string, contentType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: fileName,
    ContentType: contentType
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
  return signedUrl;
};

export const createUserFileFromLocation = async (location: string, userId: string) => {
  try {
    const fileRow = await db.insert(filesTable).values({ location }).returning().get();
    const fileToUserRow = await db.insert(userFilesTable).values({ userId, fileId: fileRow.id }).returning().get();
    return {
      userId: fileToUserRow.userId,
      fileId: fileToUserRow.fileId,
      location: fileRow.location
    };
  } catch (error) {
    console.error('Error creating file from location:', error);
    throw error;
  }
};

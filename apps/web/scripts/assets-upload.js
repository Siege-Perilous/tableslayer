#!/usr/bin/env node

/**
 * Uploads static assets to a self-hoster's R2/S3 bucket
 * Reads from the committed static-assets.json manifest
 */

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file (but don't override existing env vars)
config({ path: path.resolve(process.cwd(), '.env'), override: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check required environment variables
const required = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY',
  'CLOUDFLARE_R2_SECRET_KEY',
  'CLOUDFLARE_R2_BUCKET_NAME'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('Error: Missing required environment variables:');
  console.error(missing.map((key) => `  - ${key}`).join('\n'));
  console.error('\nPlease configure your R2/S3 credentials before running this script.');
  process.exit(1);
}

// Configure R2/S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  endpoint: process.env.CLOUDFLARE_ACCOUNT_ID
    ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined, // Will use default AWS endpoint if not R2
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
  }
});

// Read manifest
const manifestPath = path.join(__dirname, '..', 'static-assets.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Error: static-assets.json not found');
  console.error('This file should be committed to the repository.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

/**
 * Downloads a file from the CDN
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * Checks if an object exists in the bucket
 */
async function objectExists(key) {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: key
      })
    );
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Uploads a file to R2/S3
 */
async function uploadFile(key, data, contentType) {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: key,
      Body: data,
      ContentType: contentType
    })
  );
}

/**
 * Gets the content type for a file
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.cube': 'application/octet-stream',
    '.json': 'application/json'
  };
  return types[ext] || 'application/octet-stream';
}

async function uploadAssets() {
  console.log('Table Slayer Static Assets Uploader');
  console.log('====================================');
  console.log(`Source: ${manifest.source}`);
  console.log(`Destination: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
  console.log(`Total files: ${manifest.totalFiles}`);
  console.log('');

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < manifest.files.length; i++) {
    const file = manifest.files[i];
    const progress = `[${i + 1}/${manifest.files.length}]`;

    process.stdout.write(`${progress} ${file}... `);

    try {
      // Check if file already exists
      const exists = await objectExists(file);
      if (exists && !process.env.FORCE_UPLOAD) {
        process.stdout.write('SKIPPED (exists)\n');
        skipped++;
        continue;
      }

      // Download from CDN
      const url = `${manifest.source}/${file}`;
      const data = await downloadFile(url);

      // Upload to bucket
      const contentType = getContentType(file);
      await uploadFile(file, data, contentType);

      process.stdout.write(`OK (${(data.length / 1024).toFixed(1)}KB)\n`);
      uploaded++;
    } catch (error) {
      process.stdout.write(`FAILED\n`);
      console.error(`  Error: ${error.message}`);
      errors.push({ file, error: error.message });
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Upload Summary:');
  console.log(`  ✓ Uploaded: ${uploaded} files`);
  if (skipped > 0) {
    console.log(`  - Skipped: ${skipped} files (already exist)`);
  }
  if (failed > 0) {
    console.log(`  ✗ Failed: ${failed} files`);
  }

  if (errors.length > 0) {
    console.log('\nFailed files:');
    for (const { file, error } of errors) {
      console.log(`  - ${file}: ${error}`);
    }
    console.log('\nTo retry only failed files, you can run the script again.');
  }

  if (skipped > 0 && !process.env.FORCE_UPLOAD) {
    console.log('\nTip: To force re-upload existing files, set FORCE_UPLOAD=true');
  }

  console.log('\n' + (failed === 0 ? '✓ Upload complete!' : '⚠ Upload completed with errors'));

  process.exit(failed > 0 ? 1 : 0);
}

// Run the script
uploadAssets().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

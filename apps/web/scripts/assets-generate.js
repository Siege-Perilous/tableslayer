#!/usr/bin/env node

/**
 * Generates a manifest of static assets from the Table Slayer CDN
 * This script should only be run by maintainers with access to the R2 bucket
 */

import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file (but don't override existing env vars)
config({ path: path.resolve(process.cwd(), '.env'), override: false });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardcoded source - always uses the official CDN
const SOURCE_CDN = 'https://files.tableslayer.com';

// Directories to include in the manifest
const STATIC_DIRECTORIES = ['illustrations/', 'stage/luts/'];

// Individual files to include
const STATIC_FILES = [
  'map/example1080.png', // Default map
  'avatar/default.png' // Default avatar
];

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
  console.error('\nThis script should only be run by maintainers with R2 access.');
  process.exit(1);
}

// Configure R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY
  }
});

async function listBucketContents(prefix) {
  const files = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken
    });

    try {
      const response = await r2Client.send(command);

      if (response.Contents) {
        files.push(...response.Contents.map((obj) => obj.Key));
      }

      continuationToken = response.NextContinuationToken;
    } catch (error) {
      console.error(`Error listing objects with prefix "${prefix}":`, error.message);
      throw error;
    }
  } while (continuationToken);

  return files;
}

async function generateManifest() {
  console.log('Generating static assets manifest...');
  console.log(`Source CDN: ${SOURCE_CDN}`);
  console.log(`Bucket: ${process.env.CLOUDFLARE_R2_BUCKET_NAME}`);
  console.log('');

  const allFiles = [];

  // List files from directories
  for (const prefix of STATIC_DIRECTORIES) {
    console.log(`Scanning directory: ${prefix}`);
    try {
      const files = await listBucketContents(prefix);
      console.log(`  Found ${files.length} files`);
      allFiles.push(...files);
    } catch (error) {
      console.error(`  Failed to scan directory: ${error.message}`);
      process.exit(1);
    }
  }

  // Add individual static files
  for (const file of STATIC_FILES) {
    console.log(`Adding static file: ${file}`);
    allFiles.push(file);
  }

  // Sort files for consistent output
  allFiles.sort();

  // Create manifest
  const manifest = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    source: SOURCE_CDN,
    totalFiles: allFiles.length,
    totalSize: null, // Could calculate if needed
    files: allFiles
  };

  // Write manifest to file
  const outputPath = path.join(__dirname, '..', 'static-assets.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.log('');
  console.log(`✓ Generated manifest with ${allFiles.length} files`);
  console.log(`✓ Saved to: static-assets.json`);

  // Show summary by directory
  const summary = {};
  for (const file of allFiles) {
    const dir = file.split('/')[0];
    summary[dir] = (summary[dir] || 0) + 1;
  }

  console.log('\nSummary by directory:');
  for (const [dir, count] of Object.entries(summary)) {
    console.log(`  ${dir}: ${count} files`);
  }
}

// Run the script
generateManifest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

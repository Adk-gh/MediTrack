// scripts/migrate-firebase-storage.js
require('dotenv').config();
const { bucket } = require('../configs/firebase-admin'); // your firebase admin storage bucket
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(
  process.env.supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY
);

// Supabase bucket name — create this in Supabase Storage dashboard first
const SUPABASE_BUCKET = 'MediStorage';

const downloadFile = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });

async function migrateStorageFiles() {
  console.log('\n🚀 Starting Firebase Storage → Supabase Storage migration...');

  // List all files in Firebase Storage
  const [files] = await bucket.getFiles();

  if (files.length === 0) {
    console.log('No files found in Firebase Storage.');
    return;
  }

  console.log(`\n📦 Found ${files.length} files to migrate...\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = file.name; // e.g. "announcements/image.png" or "logo.jpg"
    const contentType = file.metadata.contentType || 'application/octet-stream';

    try {
      // Check if already exists in Supabase
      const { data: existing } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list(filePath.includes('/') ? filePath.split('/').slice(0, -1).join('/') : '');

      const fileName = filePath.split('/').pop();
      const alreadyExists = existing?.some((f) => f.name === fileName);

      if (alreadyExists) {
        console.log(`  ⏭️  Skipped (exists): ${filePath}`);
        skipped++;
        continue;
      }

      // Get signed download URL from Firebase
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Download the file
      const fileBuffer = await downloadFile(signedUrl);

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.log(`  ❌ Failed: ${filePath} — ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ Migrated: ${filePath} (${contentType})`);
        success++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${filePath} — ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Migrated : ${success}`);
  console.log(`   ⏭️  Skipped  : ${skipped}`);
  console.log(`   ❌ Failed   : ${failed}`);
  console.log('\n✅ Storage migration complete!');
}

migrateStorageFiles().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
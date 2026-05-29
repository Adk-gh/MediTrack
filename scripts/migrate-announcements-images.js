// scripts/migrate-announcements-images.js
require('dotenv').config();
const { bucket } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

const supabase = createClient(
  process.env.supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY
);

const SUPABASE_BUCKET = 'MediStorage';

const downloadFile = (url) =>
  new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });

const getSupabasePublicUrl = (path) => {
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

// Extract Firebase Storage path from a Firebase URL
// e.g. https://firebasestorage.googleapis.com/v0/b/.../o/announcements%2Fimage.jpg?alt=media&token=...
const extractFirebasePath = (url) => {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/);
    if (!match) return null;
    return decodeURIComponent(match[1]); // e.g. "announcements/image.jpg"
  } catch {
    return null;
  }
};

async function migrateAnnouncementImages() {
  console.log('\n🚀 Migrating announcement image URLs...');

  // Fetch all announcements with Firebase image URLs
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('id, image_url')
    .like('image_url', '%firebasestorage.googleapis.com%');

  if (error) {
    console.error('Failed to fetch announcements:', error.message);
    return;
  }

  console.log(`\n📦 Found ${announcements.length} announcements with Firebase URLs\n`);

  let success = 0;
  let failed = 0;

  for (const announcement of announcements) {
    const firebaseUrl = announcement.image_url;
    const storagePath = extractFirebasePath(firebaseUrl);

    if (!storagePath) {
      console.log(`  ⚠️  Could not extract path from URL: ${firebaseUrl}`);
      failed++;
      continue;
    }

    try {
      // Check if already uploaded to Supabase
      const folder = storagePath.includes('/')
        ? storagePath.split('/').slice(0, -1).join('/')
        : '';
      const fileName = storagePath.split('/').pop();

      const { data: existing } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list(folder);

      const alreadyExists = existing?.some((f) => f.name === fileName);

      if (!alreadyExists) {
        // Download from Firebase
        const fileBuffer = await downloadFile(firebaseUrl);

        // Upload to Supabase
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.log(`  ❌ Upload failed for ${storagePath}: ${uploadError.message}`);
          failed++;
          continue;
        }
      }

      // Get new Supabase public URL
      const newUrl = getSupabasePublicUrl(storagePath);

      // Update the announcement record
      const { error: updateError } = await supabase
        .from('announcements')
        .update({ image_url: newUrl })
        .eq('id', announcement.id);

      if (updateError) {
        console.log(`  ❌ DB update failed for ${announcement.id}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Updated: ${storagePath}`);
        success++;
      }
    } catch (err) {
      console.log(`  ❌ Error processing ${storagePath}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Success : ${success}`);
  console.log(`   ❌ Failed  : ${failed}`);
  console.log('\n✅ Done!');
}

migrateAnnouncementImages().catch((err) => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
// scripts/migrate-firebase-auth.js
// Migrates Firebase Auth users to Supabase Auth
require('dotenv').config();
const { auth } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.supabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default password for all migrated users
const DEFAULT_PASSWORD = '1234567890';

async function migrateFirebaseAuth() {
  console.log('\n🚀 Starting Firebase Auth to Supabase Auth migration...\n');

  // 1. List all users from Firebase Auth
  let users = [];
  let nextPageToken;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users = [...users, ...result.users];
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`Found ${users.length} Firebase Auth users\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 2. Create them in Supabase Auth
  for (const user of users) {
    try {
      const tempPassword = DEFAULT_PASSWORD;

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          firebase_uid: user.uid,
          displayName: user.displayName,
          createdAt: user.metadata.creationTime,
          lastLogin: user.metadata.lastRefreshTime
        }
      });

      if (error) {
        // Check if user already exists
        if (error.message.includes('already been registered')) {
          console.log(`  ⏭️  ${user.email}: Already exists in Supabase`);
          skipCount++;
        } else {
          console.log(`  ❌ ${user.email}: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`  ✅ ${user.email} → ${data.user.id}`);
        successCount++;
      }
    } catch (e) {
      console.log(`  ❌ ${user.email}: ${e.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (successCount > 0) {
    console.log('\n⚠️  Note: All users have temporary passwords.');
    console.log('   They can reset their password using Supabase\'s forgot password flow.');
  }

  return { success: successCount, skipped: skipCount, errors: errorCount };
}

migrateFirebaseAuth()
  .then(() => {
    console.log('\n✅ Auth migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Auth migration failed:', error.message);
    process.exit(1);
  });
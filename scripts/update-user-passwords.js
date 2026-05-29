// scripts/update-user-passwords.js
// Updates passwords for existing Supabase Auth users
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.supabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const NEW_PASSWORD = '1234567890';

async function updatePasswords() {
  console.log('\n🔐 Updating passwords for all Supabase Auth users...\n');

  // List all users in Supabase Auth
  const { data: { users }, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} Supabase Auth users\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: NEW_PASSWORD }
      );

      if (updateError) {
        console.log(`  ❌ ${user.email}: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ ${user.email}`);
        successCount++;
      }
    } catch (e) {
      console.log(`  ❌ ${user.email}: ${e.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
}

updatePasswords()
  .then(() => {
    console.log('\n✅ Password update complete!');
    console.log(`\n📝 All users can now log in with:`);
    console.log(`   Email: (their email)`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
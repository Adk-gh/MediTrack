// scripts/migrate-rtdb-to-supabase.js
require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY
);

const data = JSON.parse(
  fs.readFileSync('./meditrack-plsp-default-rtdb-export.json', 'utf8')
);

function toTimestamp(ms) {
  if (!ms) return null;
  return new Date(ms).toISOString();
}

async function migrateConsultations() {
  console.log('\n📦 Migrating consultations...');

  // Get all users from Supabase to map Firebase UIDs → Supabase UUIDs
  const { data: supabaseUsers, error: userError } = await supabase
    .from('users')
    .select('id, uid');

  if (userError) {
    console.error('❌ Could not fetch users:', userError.message);
    return;
  }

  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  const consultationRows = [];
  // Store mapping of Firebase consultation ID → Supabase UUID (for messages)
  const consultIdMap = {};

  for (const [consultId, consult] of Object.entries(data.consultations)) {
    const meta = consult.metadata || {};
    const patientUid = meta.patientUid || null;
    const patientSupabaseId = uidToUuid[patientUid] || null;

    consultationRows.push({
      consultation_type: meta.consultType || 'medical',
      patient_id: patientSupabaseId,
      created_by: patientSupabaseId,
      patient_name: meta.patientName || null,
      status: meta.status === 'active' ? 'active' : 'ended',
      created_at: toTimestamp(meta.createdAt),
      ended_at: null,
      // Temporarily store firebase ID for message mapping (removed before insert)
      _firebase_id: consultId,
    });
  }

  // Insert consultations one by one to capture returned UUIDs
  console.log(`   Inserting ${consultationRows.length} consultations...`);

  for (const row of consultationRows) {
    const firebaseId = row._firebase_id;
    delete row._firebase_id;

    const { data: inserted, error } = await supabase
      .from('consultations')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error(`   ❌ Failed to insert consultation ${firebaseId}:`, error.message);
    } else {
      consultIdMap[firebaseId] = inserted.id;
    }
  }

  console.log(`   ✅ Migrated ${Object.keys(consultIdMap).length} consultations`);

  // Now migrate messages
  await migrateMessages(consultIdMap, uidToUuid);
}

async function migrateMessages(consultIdMap, uidToUuid) {
  console.log('\n📦 Migrating consultation messages...');

  const messageRows = [];

  for (const [consultId, consult] of Object.entries(data.consultations)) {
    const supabaseConsultId = consultIdMap[consultId];
    if (!supabaseConsultId || !consult.messages) continue;

    for (const [msgId, msg] of Object.entries(consult.messages)) {
      // Skip bot/triage messages since your schema requires a message TEXT NOT NULL
      // and these don't have real senders — store them but mark via sender_role
      const senderId = msg.senderUid ? (uidToUuid[msg.senderUid] || null) : null;

      messageRows.push({
        consultation_id: supabaseConsultId,
        sender_id: senderId,
        sender_name: msg.senderName || (msg.isBot ? 'System' : null),
        sender_role: msg.isBot
          ? 'bot'
          : msg.isTriageChoice
            ? 'triage'
            : msg.senderRole || null,
        message: msg.text || '',
        created_at: toTimestamp(msg.timestamp),
      });
    }
  }

  if (messageRows.length === 0) {
    console.log('   ⚠️  No messages to migrate');
    return;
  }

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  let migrated = 0;

  for (let i = 0; i < messageRows.length; i += BATCH_SIZE) {
    const batch = messageRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('consultation_messages')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Error inserting message batch:`, error.message);
    } else {
      migrated += batch.length;
    }
  }

  console.log(`   ✅ Migrated ${migrated} messages`);
}

async function migratePresence() {
  console.log('\n📦 Migrating presence...');

  const { data: supabaseUsers } = await supabase
    .from('users')
    .select('id, uid');

  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  const presenceRows = [];

  for (const [uid, p] of Object.entries(data.presence)) {
    const supabaseUserId = uidToUuid[uid];
    if (!supabaseUserId) {
      console.log(`   ⚠️  Skipping presence for unknown uid: ${uid}`);
      continue;
    }

    presenceRows.push({
      user_id: supabaseUserId,
      status: 'offline', // snapshot export, everyone is offline
      last_seen: toTimestamp(p.lastSeen),
    });
  }

  const { error } = await supabase
    .from('presence')
    .upsert(presenceRows, { onConflict: 'user_id' });

  if (error) {
    console.error('❌ Error migrating presence:', error.message);
  } else {
    console.log(`✅ Migrated ${presenceRows.length} presence records`);
  }
}

async function run() {
  console.log('\n🚀 Starting RTDB migration...');
  await migrateConsultations();
  await migratePresence();
  console.log('\n✅ RTDB migration complete!');
}

run();
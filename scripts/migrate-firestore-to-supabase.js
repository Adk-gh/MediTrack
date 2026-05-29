// scripts/migrate-firestore-to-supabase.js
require('dotenv').config();
const { db } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.supabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Set supabaseUrl and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to convert Firestore timestamp to ISO string
const convertTimestamp = (timestamp) => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  return new Date().toISOString();
};

// Helper to map Firestore camelCase to Supabase snake_case
const mapUserData = (user) => ({
  uid: user.uid,
  email: user.email,
  first_name: user.firstName,
  middle_initial: user.middleInitial,
  last_name: user.lastName,
  suffix: user.suffix,
  university_id: user.universityId,
  role: user.role || 'student',
  is_verified: user.isVerified || false,
  is_profile_setup: user.isProfileSetup || false,
  profile_complete: user.profileComplete || false,
  birthday: user.birthday || null,
  age: user.age || null,
  sex: user.sex || null,
  blood_type: user.bloodType || null,
  home_address: user.homeAddress || null,
  religion: user.religion || null,
  nationality: user.nationality || null,
  civil_status: user.civilStatus || null,
  department: user.department || null,
  program: user.program || null,
  year_level: user.yearLevel ? String(user.yearLevel) : null,
  section: user.section || null,
  student_classification: user.studentClassification || null,
  classification: user.classification || null,
  job_title: user.jobTitle || null,
  phone_number: user.phoneNumber ? String(user.phoneNumber) : null,
  emergency_contact: user.emergencyContact || {},
  vaccinations: user.vaccinations || {},
  created_at: convertTimestamp(user.createdAt),
  updated_at: convertTimestamp(user.updatedAt),
});

const mapAppointmentData = (apt) => ({
  user_id: null, // Will be looked up by university_id
  university_id: apt.idno, // Preserve for lookup
  patient_name: apt.name,
  student_name: apt.name,
  day: apt.day,
  month: apt.month,
  year: apt.year,
  time: apt.time,
  service_type: apt.type,
  reason: apt.reason,
  status: apt.status || 'Pending',
  created_at: convertTimestamp(apt.bookedAt),
});

const mapExaminationData = (exam) => ({
  user_id: exam.userId,
  examination_type: exam.type,
  examination_data: exam.data || {},
  logs: exam.logs || [],
  created_at: convertTimestamp(exam.createdAt),
  updated_at: convertTimestamp(exam.updatedAt),
});

const mapAnnouncementData = (ann) => ({
  title: ann.title,
  content: ann.content,
  image_url: ann.image,
  created_at: convertTimestamp(ann.createdAt),
  updated_at: convertTimestamp(ann.updatedAt),
});

const mapNotificationData = (notif) => ({
  user_id: notif.userId,
  type: notif.type,
  title: notif.title,
  message: notif.message,
  reference_id: notif.referenceId,
  reference_type: notif.referenceType,
  is_read: notif.isRead || false,
  created_at: convertTimestamp(notif.createdAt),
});

async function migrateUsers() {
  console.log('\n📦 Migrating users...');
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`   Found ${users.length} users in Firestore`);

  // Handle duplicate university_ids and uids by keeping only the first occurrence
  const seenUniversityId = new Set();
  const seenUid = new Set();
  const uniqueUsers = users.filter(user => {
    const universityId = user.universityId;
    const uid = user.uid;
    if (!universityId || !uid) return false; // Skip users without valid id
    if (seenUniversityId.has(universityId)) return false;
    if (seenUid.has(uid)) return false;
    seenUniversityId.add(universityId);
    seenUid.add(uid);
    return true;
  });
  console.log(`   Unique users after deduplication: ${uniqueUsers.length}`);

  // Delete all existing users first to avoid conflicts
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const mappedUsers = uniqueUsers.map(mapUserData);

  const { data, error } = await supabase
    .from('users')
    .insert(mappedUsers);

  if (error) {
    console.error('   ❌ Error migrating users:', error.message);
    return 0;
  }

  console.log(`   ✅ Migrated ${users.length} users`);
  return users.length;
}

async function migrateAppointments() {
  console.log('\n📦 Migrating appointments...');
  const snapshot = await db.collection('appointments').get();
  const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`   Found ${appointments.length} appointments in Firestore`);

  // Map Firestore university IDs to Supabase user UUIDs
  const { data: supabaseUsers } = await supabase.from('users').select('university_id, id');
  const universityIdToUuid = {};
  supabaseUsers.forEach(u => { universityIdToUuid[u.university_id] = u.id; });

  const mappedAppointments = appointments
    .map(mapAppointmentData)
    .map(apt => ({
      user_id: universityIdToUuid[apt.university_id] || null,
      patient_name: apt.patient_name,
      student_name: apt.student_name,
      day: apt.day,
      month: apt.month,
      year: apt.year,
      time: apt.time,
      service_type: apt.service_type,
      reason: apt.reason,
      status: apt.status,
      created_at: apt.created_at,
    }))
    .filter(apt => apt.user_id); // Only include appointments with valid user references

  if (mappedAppointments.length === 0) {
    console.log('   ⚠️  No appointments to migrate (users not yet migrated)');
    return 0;
  }

  const { error } = await supabase
    .from('appointments')
    .insert(mappedAppointments);

  if (error) {
    console.error('   ❌ Error migrating appointments:', error.message);
    return 0;
  }

  console.log(`   ✅ Migrated ${mappedAppointments.length} appointments`);
  return mappedAppointments.length;
}

async function migrateExaminations() {
  console.log('\n📦 Migrating examinations...');
  const snapshot = await db.collection('examinations').get();
  const examinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`   Found ${examinations.length} examinations in Firestore`);

  const { data: supabaseUsers } = await supabase.from('users').select('uid, id');
  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  const mappedExams = examinations
    .map(mapExaminationData)
    .map(exam => ({
      ...exam,
      user_id: uidToUuid[exam.user_id] || null,
    }))
    .filter(exam => exam.user_id);

  if (mappedExams.length === 0) {
    console.log('   ⚠️  No examinations to migrate');
    return 0;
  }

  const { error } = await supabase
    .from('examinations')
    .insert(mappedExams);

  if (error) {
    console.error('   ❌ Error migrating examinations:', error.message);
    return 0;
  }

  console.log(`   ✅ Migrated ${mappedExams.length} examinations`);
  return mappedExams.length;
}

async function migrateAnnouncements() {
  console.log('\n📦 Migrating announcements...');
  const snapshot = await db.collection('announcements').get();
  const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`   Found ${announcements.length} announcements in Firestore`);

  const mappedAnnouncements = announcements.map(mapAnnouncementData);

  const { error } = await supabase
    .from('announcements')
    .insert(mappedAnnouncements);

  if (error) {
    console.error('   ❌ Error migrating announcements:', error.message);
    return 0;
  }

  console.log(`   ✅ Migrated ${announcements.length} announcements`);
  return announcements.length;
}

async function migrateNotifications() {
  console.log('\n📦 Migrating notifications...');
  const snapshot = await db.collection('notifications').get();
  const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`   Found ${notifications.length} notifications in Firestore`);

  const { data: supabaseUsers } = await supabase.from('users').select('uid, id');
  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  const mappedNotifications = notifications
    .map(mapNotificationData)
    .map(notif => ({
      ...notif,
      user_id: uidToUuid[notif.user_id] || null,
    }))
    .filter(notif => notif.user_id);

  if (mappedNotifications.length === 0) {
    console.log('   ⚠️  No notifications to migrate');
    return 0;
  }

  const { error } = await supabase
    .from('notifications')
    .insert(mappedNotifications);

  if (error) {
    console.error('   ❌ Error migrating notifications:', error.message);
    return 0;
  }

  console.log(`   ✅ Migrated ${mappedNotifications.length} notifications`);
  return mappedNotifications.length;
}

async function runMigration() {
  console.log('\n🚀 Starting Firestore to Supabase migration...\n');

  try {
    // Migrate in order - users first (other collections depend on them)
    const usersCount = await migrateUsers();
    const appointmentsCount = await migrateAppointments();
    const examinationsCount = await migrateExaminations();
    const announcementsCount = await migrateAnnouncements();
    const notificationsCount = await migrateNotifications();

    console.log('\n📊 Migration Summary:');
    console.log(`   Users: ${usersCount}`);
    console.log(`   Appointments: ${appointmentsCount}`);
    console.log(`   Examinations: ${examinationsCount}`);
    console.log(`   Announcements: ${announcementsCount}`);
    console.log(`   Notifications: ${notificationsCount}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
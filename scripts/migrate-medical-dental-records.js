// scripts/migrate-medical-dental-records.js
// Migrates medical_records and dental_records subcollections from Firestore to Supabase
require('dotenv').config();
const { db } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.supabaseUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const convertTimestamp = (ts) => {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (ts._seconds) return new Date(ts._seconds * 1000).toISOString();
  return new Date().toISOString();
};

const mapMedicalRecord = (record, userId) => ({
  user_id: userId,
  university_id: record.studentId || null,
  last_name: record.lastName || null,
  first_name: record.firstName || null,
  middle_name: record.middleName || null,
  sex: record.sex || null,
  birthday: record.birthday || null,
  age: record.age ? parseInt(record.age) : null,
  address: record.address || null,
  contact_no: record.contactNo || null,
  religion: record.religion || null,
  nationality: record.nationality || null,
  civil_status: record.civilStatus || null,

  // Emergency Contact
  emergency_name: record.emergencyName || null,
  emergency_relation: record.emergencyRelation || null,
  emergency_address: record.emergencyAddress || null,
  emergency_contact: record.emergencyContact || null,

  // Vaccinations
  vax1: record.vax1 || null,
  vax1_date: record.vax1Date || null,
  vax1_remarks: record.vax1Remarks || null,
  vax2: record.vax2 || null,
  vax2_date: record.vax2Date || null,
  vax2_remarks: record.vax2Remarks || null,
  booster1: record.booster1 || null,
  booster1_date: record.booster1Date || null,
  booster1_remarks: record.booster1Remarks || null,
  booster2: record.booster2 || null,
  booster2_date: record.booster2Date || null,
  booster2_remarks: record.booster2Remarks || null,

  // Medical History
  covid_history: record.covidHistory || null,
  other_medical_history: record.otherMedicalHistory || null,
  other_family_history: record.otherFamilyHistory || null,
  smoking: record.smoking || null,
  smoking_details: record.smokingDetails || null,
  alcohol: record.alcohol || null,
  alcohol_details: record.alcoholDetails || null,
  drugs: record.drugs || null,
  drugs_details: record.drugsDetails || null,

  // Questionnaire (dynamic fields)
  questionnaire: {
    q1: record.q1 || null,
    q2: record.q2 || null,
    q2Details: record.q2Details || null,
    q3: record.q3 || null,
    q3Details: record.q3Details || null,
    q4: record.q4 || null,
    q4Details: record.q4Details || null,
    q5: record.q5 || null,
    q5b: record.q5b || null,
  },

  // Vital Signs
  height: record.height || null,
  weight: record.weight || null,
  bmi: record.bmi || null,
  waist: record.waist || null,
  lmp: record.lmp || null,

  // Lab Results
  lab_cbc: record.labCbc || null,
  lab_cbc_facility: record.labCbcFacility || null,
  lab_cbc_date: record.labCbcDate || null,
  lab_ua: record.labUa || null,
  lab_ua_facility: record.labUaFacility || null,
  lab_ua_date: record.labUaDate || null,
  lab_xray: record.labXray || null,
  lab_xray_facility: record.labXrayFacility || null,
  lab_xray_date: record.labXrayDate || null,

  // Exam Details
  physician: record.physician || null,
  exam_date: record.examDate || null,
  nurse_on_duty: record.nurseOnDuty || null,

  // Dynamic Arrays
  checked_medical: record.checkedMedical || [],
  checked_family: record.checkedFamily || [],
  checked_health: record.checkedHealth || [],
  vital_records: record.vitalRecords || [],

  // Status
  status: record.status || 'pending',
  is_approved: record.isApproved || false,
  student_signature: record.studentSignature || null,
  date_signed: record.dateSigned || null,

  created_at: convertTimestamp(record.createdAt),
  updated_at: new Date().toISOString(),
});

const mapDentalRecord = (record, userId) => ({
  user_id: userId,

  // Personal Info
  university_id: record.dStudentId || null,
  last_name: record.dLastName || null,
  first_name: record.dFirstName || null,
  middle_name: record.dMiddle || null,
  sex: record.dSex || null,
  age: record.dAge ? parseInt(record.dAge) : null,
  birthday: record.dBirthday || null,
  address: record.dAddress || null,
  cellphone: record.dCellphone || null,
  course_year: record.dCourseYear || null,
  office_address: record.dOfficeAddress || null,
  tel_no: record.dTelNo || null,
  nationality: record.dNationality || null,

  // Dental History
  last_visit: record.dLastVisit || null,
  prev_dentist: record.dPrevDentist || null,
  physician: record.dPhysician || null,

  // Vaccination
  vax1_date: record.dVax1Date || null,
  vax2_date: record.dVax2Date || null,
  booster_date: record.dBoosterDate || null,

  // Teeth Chart
  teeth_upper: record.dTeethUpper || null,
  teeth_lower: record.dTeethLower || null,
  tooth_data: record.toothData || {},

  // Dental History Questionnaire
  dental_history: record.dentalHistory || {},

  // Intraoral Exam
  intraoral: record.intraoral || {},

  // Exam Details
  examined_by: record.dExaminedBy || null,
  exam_date: record.dExaminedDate || null,

  // Status
  status: record.status || 'pending',
  is_approved: record.isApproved || false,
  patient_signature: record.dPatientSig || null,
  sig_date: record.dSigDate || null,

  created_at: convertTimestamp(record.createdAt),
  approved_at: convertTimestamp(record.approvedAt),
});

async function migrateMedicalRecords() {
  console.log('\n📦 Migrating medical records...');

  // Get all users with their Supabase IDs
  const { data: supabaseUsers } = await supabase.from('users').select('uid, id');
  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  // Get all Firestore users
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid);

  let totalMigrated = 0;

  for (const user of users) {
    try {
      const userUuid = uidToUuid[user.uid];
      if (!userUuid) {
        console.log(`  ⚠️ No Supabase ID for user: ${user.uid}`);
        continue;
      }

      const medSnap = await db.collection('users').doc(user.uid).collection('medical_records').get();
      const medRecords = medSnap.docs.map(d => d.data());

      if (medRecords.length > 0) {
        const mapped = medRecords.map(r => mapMedicalRecord(r, userUuid));
        const { error } = await supabase.from('medical_records').insert(mapped);

        if (error) {
          console.log(`  ❌ Error for ${user.firstName} ${user.lastName}: ${error.message}`);
        } else {
          console.log(`  ✅ ${user.firstName} ${user.lastName}: ${medRecords.length} records`);
          totalMigrated += medRecords.length;
        }
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  console.log(`\n   Total medical records migrated: ${totalMigrated}`);
  return totalMigrated;
}

async function migrateDentalRecords() {
  console.log('\n📦 Migrating dental records...');

  // Get all users with their Supabase IDs
  const { data: supabaseUsers } = await supabase.from('users').select('uid, id');
  const uidToUuid = {};
  supabaseUsers.forEach(u => { uidToUuid[u.uid] = u.id; });

  // Get all Firestore users
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid);

  let totalMigrated = 0;

  for (const user of users) {
    try {
      const userUuid = uidToUuid[user.uid];
      if (!userUuid) continue;

      const dentalSnap = await db.collection('users').doc(user.uid).collection('dental_records').get();
      const dentalRecords = dentalSnap.docs.map(d => d.data());

      if (dentalRecords.length > 0) {
        const mapped = dentalRecords.map(r => mapDentalRecord(r, userUuid));
        const { error } = await supabase.from('dental_records').insert(mapped);

        if (error) {
          console.log(`  ❌ Error for ${user.firstName} ${user.lastName}: ${error.message}`);
        } else {
          console.log(`  ✅ ${user.firstName} ${user.lastName}: ${dentalRecords.length} records`);
          totalMigrated += dentalRecords.length;
        }
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  console.log(`\n   Total dental records migrated: ${totalMigrated}`);
  return totalMigrated;
}

async function runMigration() {
  console.log('\n🚀 Starting medical/dental records migration...');

  try {
    const medicalCount = await migrateMedicalRecords();
    const dentalCount = await migrateDentalRecords();

    console.log('\n📊 Migration Summary:');
    console.log(`   Medical records: ${medicalCount}`);
    console.log(`   Dental records: ${dentalCount}`);
    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
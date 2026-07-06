# Firebase Firestore to Supabase Migration Guide

This document outlines the steps to migrate from Firebase Firestore (NoSQL) to Supabase (PostgreSQL) for the MediTrack project.

***

## 1. Data Model Analysis

### Current Firestore Collections

| Collection      | Description                 | Key Fields                                                                                        |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| `users`         | User profiles               | uid, firstName, lastName, email, universityId, role, profile data, emergencyContact, vaccinations |
| `appointments`  | Appointment requests        | day, month, year, time, patientName, studentName, userId, serviceType, reason, status             |
| `examinations`  | Medical/Dental examinations | userId, type, data, logs\[], createdAt, updatedAt                                                 |
| `announcements` | System announcements        | title, content, image (URL), createdAt                                                            |
| `notifications` | User notifications          | type, title, message, userId, referenceId, referenceType, isRead, createdAt                       |

***

## 2. PostgreSQL Schema Design

### 2.1 Users Table

```SQL
-- Users table (replaces 'users' collection)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(128) UNIQUE, -- Firebase Auth UID
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- For email/password auth
  first_name VARCHAR(100) NOT NULL,
  middle_initial VARCHAR(10),
  last_name VARCHAR(100) NOT NULL,
  suffix VARCHAR(20),
  university_id VARCHAR(50) UNIQUE,
  role VARCHAR(50) DEFAULT 'student',
  is_verified BOOLEAN DEFAULT false,
  is_profile_setup BOOLEAN DEFAULT false,
  profile_complete BOOLEAN DEFAULT false,

  -- Personal Information
  birthday DATE,
  age INTEGER,
  sex VARCHAR(20),
  blood_type VARCHAR(10),
  home_address TEXT,
  religion VARCHAR(100),
  nationality VARCHAR(100),
  civil_status VARCHAR(50),

  -- Academic/Work Information
  department VARCHAR(100),
  program VARCHAR(100),
  year_level VARCHAR(20), -- Can be "1st Year", "2nd Year", etc.
  section VARCHAR(20),
  student_classification VARCHAR(50),
  classification VARCHAR(100),
  job_title VARCHAR(100),

  -- Contact Information
  phone_number VARCHAR(20),

  -- Emergency Contact (JSON or separate table)
  emergency_contact JSONB DEFAULT '{}',

  -- Vaccinations (JSONB for flexible structure)
  vaccinations JSONB DEFAULT '{"dose1":{},"dose2":{},"booster1":{},"booster2":{}}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

### 2.2 Appointments Table

```SQL
-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_name VARCHAR(100),
  student_name VARCHAR(100),
  day INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  time VARCHAR(20) NOT NULL,
  service_type VARCHAR(100),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by date
CREATE INDEX idx_appointments_date ON appointments(year, month, day);

-- Index for user appointments
CREATE INDEX idx_appointments_user ON appointments(user_id);
```

### 2.3 Examinations Table (Legacy)

```SQL
-- Examinations table (kept for compatibility)
CREATE TABLE examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  examination_type VARCHAR(50), -- 'medical' or 'dental'
  examination_data JSONB DEFAULT '{}',
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_examinations_user ON examinations(user_id);
CREATE INDEX idx_examinations_type ON examinations(examination_type);
```

### 2.3b Medical Records Table

```SQL
-- Medical records (subcollection under users in Firestore)
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(50),
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_name VARCHAR(50),
  sex VARCHAR(20),
  birthday DATE,
  age INTEGER,
  address TEXT,
  contact_no VARCHAR(20),
  religion VARCHAR(100),
  nationality VARCHAR(100),
  civil_status VARCHAR(50),

  -- Emergency Contact
  emergency_name VARCHAR(100),
  emergency_relation VARCHAR(50),
  emergency_address TEXT,
  emergency_contact VARCHAR(20),

  -- Vaccination Records
  vax1 VARCHAR(50),
  vax1_date DATE,
  vax1_remarks TEXT,
  vax2 VARCHAR(50),
  vax2_date DATE,
  vax2_remarks TEXT,
  booster1 VARCHAR(50),
  booster1_date DATE,
  booster1_remarks TEXT,
  booster2 VARCHAR(50),
  booster2_date DATE,
  booster2_remarks TEXT,

  -- Medical History
  covid_history TEXT,
  other_medical_history TEXT,
  other_family_history TEXT,
  smoking VARCHAR(10),
  smoking_details TEXT,
  alcohol VARCHAR(10),
  alcohol_details TEXT,
  drugs VARCHAR(10),
  drugs_details TEXT,

  -- Health Questionnaire (JSONB for dynamic fields)
  questionnaire JSONB DEFAULT '{}',

  -- Vital Signs
  height VARCHAR(20),
  weight VARCHAR(20),
  bmi VARCHAR(20),
  waist VARCHAR(20),
  lmp VARCHAR(20),

  -- Lab Results
  lab_cbc VARCHAR(50),
  lab_cbc_facility VARCHAR(100),
  lab_cbc_date DATE,
  lab_ua VARCHAR(50),
  lab_ua_facility VARCHAR(100),
  lab_ua_date DATE,
  lab_xray VARCHAR(50),
  lab_xray_facility VARCHAR(100),
  lab_xray_date DATE,

  -- Exam Details
  physician VARCHAR(100),
  exam_date DATE,
  nurse_on_duty VARCHAR(100),

  -- Dynamic Arrays (checked items, vital records)
  checked_medical JSONB DEFAULT '[]',
  checked_family JSONB DEFAULT '[]',
  checked_health JSONB DEFAULT '[]',
  vital_records JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  is_approved BOOLEAN DEFAULT false,
  student_signature VARCHAR(255),
  date_signed DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medical_records_user ON medical_records(user_id);
CREATE INDEX idx_medical_records_student_id ON medical_records(student_id);
CREATE INDEX idx_medical_records_status ON medical_records(status);
```

### 2.3c Dental Records Table

```SQL
-- Dental records (subcollection under users in Firestore)
CREATE TABLE dental_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Personal Info
  student_id VARCHAR(50),
  last_name VARCHAR(100),
  first_name VARCHAR(100),
  middle_name VARCHAR(50),
  sex VARCHAR(20),
  age INTEGER,
  birthday DATE,
  address TEXT,
  cellphone VARCHAR(20),
  course_year VARCHAR(100),
  office_address TEXT,
  tel_no VARCHAR(20),
  nationality VARCHAR(100),

  -- Dental History
  last_visit DATE,
  prev_dentist VARCHAR(100),
  physician VARCHAR(100),

  -- Vaccination
  vax1_date DATE,
  vax2_date DATE,
  booster_date DATE,

  -- Teeth Chart
  teeth_upper TEXT,
  teeth_lower TEXT,
  tooth_data JSONB DEFAULT '{}',

  -- Dental History Questionnaire
  dental_history JSONB DEFAULT '{}',

  -- Intraoral Exam
  intraoral JSONB DEFAULT '{}',

  -- Exam Details
  examined_by VARCHAR(100),
  exam_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  is_approved BOOLEAN DEFAULT false,
  patient_signature VARCHAR(255),
  sig_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dental_records_user ON dental_records(user_id);
CREATE INDEX idx_dental_records_student_id ON dental_records(student_id);
CREATE INDEX idx_dental_records_status ON dental_records(status);
```

### 2.4 Announcements Table

```SQL
-- Announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Notifications Table

```SQL
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  reference_id UUID,
  reference_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;
```

### 2.6 Audit Logs Table (Existing)

```SQL
-- Audit logs (if needed)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.7 Consultations Table (Replaces Firebase RTDB)

```SQL
-- Consultations table (realtime chat sessions)
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_type VARCHAR(20) NOT NULL, -- 'medical' or 'dental'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_type ON consultations(consultation_type);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
```

### 2.8 Consultation Messages Table (Realtime)

```SQL
-- Consultation messages (realtime chat messages)
CREATE TABLE consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name VARCHAR(100),
  sender_role VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_consultation ON consultation_messages(consultation_id);

-- Enable Realtime for consultation_messages
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_messages;
```

### 2.9 Presence Table (Online Status)

```SQL
-- Presence tracking (replaces Firebase RTDB presence)
CREATE TABLE presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  status VARCHAR(20) DEFAULT 'online',
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for presence
ALTER PUBLICATION supabase_realtime ADD TABLE presence;
```

***

## 3. Migration Steps

### Phase 1: Setup Supabase

1. **Create Supabase Project**
   * Go to [supabase.com](https://supabase.com) and create a new project
   * Note your project URL and anon/public keys

2. **Configure Environment Variables**
   ```env
   # .env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run SQL Schema**
   * Use the Supabase SQL Editor to run the table definitions above

### Phase 2: Data Migration Script

Create a migration script to export Firestore data and import into Supabase:

```JavaScript
// scripts/migrate-firestore-to-supabase.js
const { db } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateUsers() {
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  for (const user of users) {
    await supabase.from('users').upsert({
      uid: user.uid,
      email: user.email,
      first_name: user.firstName,
      middle_initial: user.middleInitial,
      last_name: user.lastName,
      suffix: user.suffix,
      university_id: user.universityId,
      role: user.role,
      is_verified: user.isVerified,
      is_profile_setup: user.isProfileSetup,
      profile_complete: user.profileComplete,
      birthday: user.birthday,
      age: user.age,
      sex: user.sex,
      blood_type: user.bloodType,
      home_address: user.homeAddress,
      religion: user.religion,
      nationality: user.nationality,
      civil_status: user.civilStatus,
      department: user.department,
      program: user.program,
      year_level: user.yearLevel,
      section: user.section,
      student_classification: user.studentClassification,
      classification: user.classification,
      job_title: user.jobTitle,
      phone_number: user.phoneNumber,
      emergency_contact: user.emergencyContact,
      vaccinations: user.vaccinations,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    });
  }
  console.log(`Migrated ${users.length} users`);
}

async function migrateAppointments() {
  const snapshot = await db.collection('appointments').get();
  const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Map userId to Supabase user IDs
  for (const apt of appointments) {
    await supabase.from('appointments').insert({
      user_id: apt.userId, // Need to map Firestore UID to Supabase UUID
      patient_name: apt.patientName,
      student_name: apt.studentName,
      day: apt.day,
      month: apt.month,
      year: apt.year,
      time: apt.time,
      service_type: apt.serviceType,
      reason: apt.reason,
      status: apt.status,
      created_at: apt.createdAt,
    });
  }
  console.log(`Migrated ${appointments.length} appointments`);
}

// Run migrations
(async () => {
  await migrateUsers();
  await migrateAppointments();
  // Add other collections...
})();
```

### Phase 3: Backend Updates

1. **Install Supabase Client**
   ```Shell
   npm install @supabase/supabase-js
   ```

2. **Create Supabase Configuration**
   ```JavaScript
   // configs/supabase.js
   const { createClient } = require('@supabase/supabase-js');

   const supabaseUrl = process.env.SUPABASE_URL;
   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

   const supabase = createClient(supabaseUrl, supabaseKey);

   module.exports = supabase;
   ```

3. **Update Service Files**
   * Replace Firestore queries with Supabase queries
   * Example for users:
   ```JavaScript
   // Before (Firestore)
   const usersRef = db.collection('users');
   const snapshot = await usersRef.where('universityId', '==', universityId).get();

   // After (Supabase)
   const { data, error } = await supabase
     .from('users')
     .select('*')
     .eq('university_id', universityId);
   ```

4. **Authentication Options**
   * Option A: Keep Firebase Auth (simpler, gradual migration)
   * Option B: Switch to Supabase Auth (recommended for full migration)
   * i've alreayd migrated and is using supabase auth.

### Phase 4: Frontend Updates

1. **Update Firebase Config**
   ```JavaScript
   // Remove Firebase config from frontend
   ```

2. **Add Supabase Client**
   ```JavaScript
   // frontend/src/supabase.js
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. **Update API Service**
   * Update auth.service.js to use Supabase Auth instead of Firebase

### Phase 5: Storage Migration

For images stored in Firebase Storage:

1. **Setup Supabase Storage**
   * Create buckets in Supabase Dashboard: `announcements`, `avatars`, `id-images`

2. **Migrate Existing Files**
   * Download from Firebase Storage
   * Upload to Supabase Storage

3. **Update Image Handling**
   ```JavaScript
   // Update announcements service
   const { data, error } = await supabase.storage
     .from('announcements')
     .upload(`${Date.now()}_${filename}`, fileBuffer);
   ```

***

## 4. Environment Variables

Update your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Keep for now (if using Firebase Auth)
FIREBASE_API_KEY=your-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OCR_SERVICE_URL=http://localhost:5001/ocr
PORT=5000
```

***

## 5. Rollback Plan

1. Keep Firebase project active during migration
2. Test thoroughly in staging environment
3. Use feature flags to switch between databases
4. Maintain backup of Firestore data

***

## 6. Post-Migration Tasks

* [ ] Remove Firebase dependencies from package.json
* [ ] Update CI/CD pipelines
* [ ] Update documentation
* [ ] Monitor for issues in production

***

## Quick Start: Supabase Setup Commands

```Shell
# Install Supabase client
npm install @supabase/supabase-js

# Create tables via SQL Editor in Supabase Dashboard
# Use the SQL from Section 2 above
```

***

## Notes

* PostgreSQL uses `snake_case` while Firestore used `camelCase`
* Supabase Auth provides built-in JWT handling
* Consider using Supabase Realtime for notifications
* JSONB columns offer flexibility similar to Firestore documents

***

## 7. Medical & Dental Records Status

**Current State (2026-05-26):**

| Firestore Collection | Documents | Supabase Table     | Status         |
| -------------------- | --------- | ------------------ | -------------- |
| users                | 16        | users              | Migrated       |
| appointments         | 16        | appointments       | Migrated       |
| examinations         | 0         | examinations       | Ready, no data |
| medical\_records     | 0         | (use examinations) | Schema ready   |
| dental\_records      | 0         | (use examinations) | Schema ready   |
| announcements        | 2         | announcements      | Migrated       |

**Explanation:**

* The `examinations` table (section 2.3) already has `examination_type` to store 'medical' or 'dental'
* There is currently **no data** in Firestore's `examinations`, `medical_records`, or `dental_records` collections
* Medical/dental records will be created through the application going forward

***

## 8. Firebase Auth Migration

To migrate Firebase Auth users to Supabase Auth:

```JavaScript
// scripts/migrate-firebase-auth.js
require('dotenv').config();
const { auth } = require('../configs/firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateFirebaseAuth() {
  let users = [];
  let nextPageToken;

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users = [...users, ...result.users];
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(`Found ${users.length} Firebase Auth users`);

  for (const user of users) {
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.passwordHash, // Note: Firebase hash format is different
        email_confirm: true,
        user_metadata: { uid: user.uid, displayName: user.displayName }
      });

      if (error) console.log(`  ⚠️ ${user.email}: ${error.message}`);
      else console.log(`  ✅ ${user.email}`);
    } catch (e) {
      console.log(`  ❌ ${user.email}: ${e.message}`);
    }
  }
}

migrateFirebaseAuth();
```

**Note:** Firebase uses its own password hashing algorithm. Supabase Auth will need to handle this differently:

* Option A: Import users to Supabase Auth (recommended)
* Option B: Reset passwords after migration

***

## 9. Current Migration Status

**Completed:**

* [x] Supabase tables created
* [x] Data migrated (users, appointments, announcements)
* [x] Medical/dental records schema ready (medical\_records, dental\_records tables)
* [x] Firebase Auth migrated to Supabase Auth (17 users, password: 1234567890)
* [x] Backend updated to use Supabase (all service files)
* [x] Frontend updated to use Supabase client (all files complete)
* [x] Migrated from Firebase Storage to Supabase Storage for announcements

**All migrations complete!**

***

## 10. Frontend Migration Checklist (Updated 2026-05-28)

### Completed Frontend Updates ✅

| File                                                | Status | Notes                                   |
| --------------------------------------------------- | ------ | --------------------------------------- |
| `src/supabase.js`                                   | ✅ Done | Supabase client setup                   |
| `src/services/auth.service.js`                      | ✅ Done | Supabase Auth                           |
| `src/services/announcements.service.js`             | ✅ Done | Uses Supabase directly                  |
| `src/services/consultations.service.js`             | ✅ Done | New file for Supabase                   |
| `src/context/AppointmentContext.jsx`                | ✅ Done |                                         |
| `src/features/LoginForm.jsx`                        | ✅ Done |                                         |
| `src/features/admin-clinic/Appointments.jsx`        | ✅ Done |                                         |
| `src/features/admin-clinic/Records.jsx`             | ✅ Done |                                         |
| `src/features/admin-clinic/Dashboard.jsx`           | ✅ Done |                                         |
| `src/features/admin-clinic/Consultations.jsx`       | ✅ Done | Migrated from Firebase RTDB to Supabase |
| `src/features/admin-clinic/Announcements.jsx`       | ✅ Done | Uses updated announcements.service.js   |
| `src/features/admin-clinic/User-Management.jsx`     | ✅ Done | Uses Supabase queries                   |
| `src/features/admin-clinic/Examinations.jsx`        | ✅ Done | Uses Supabase queries                   |
| `src/features/admin-clinic/AuditLogs.jsx`           | ✅ Done | Uses Supabase queries                   |
| `src/features/admin-clinic/Approvals.jsx`           | ✅ Done | Uses Supabase queries                   |
| `src/features/admin-clinic/Examination/Medical.jsx` | ✅ Done | Uses Supabase insert                    |
| `src/features/admin-clinic/Examination/Dental.jsx`  | ✅ Done | Uses Supabase insert                    |
| `src/features/admin-clinic/Record-Management.jsx`   | ✅ Done | Already using Supabase                  |
| `src/features/users/Records-users.jsx`              | ✅ Done | Uses Supabase Auth + queries            |
| `src/features/users/Profile-users.jsx`              | ✅ Done | Uses Supabase Auth + queries            |
| `src/features/users/Consultation-users.jsx`         | ✅ Done | Uses Supabase Realtime for chat         |
| `src/components/Headers.jsx`                        | ✅ Done | Uses Supabase Auth + queries            |

### All Frontend Updates Complete ✅

### Backend Updates Completed ✅

| File                                              | Status |
| ------------------------------------------------- | ------ |
| `configs/database.js`                             | ✅ Done |
| `middleware/authorized.js`                        | ✅ Done |
| `features/user/user.service.js`                   | ✅ Done |
| `features/Records/records.service.js`             | ✅ Done |
| `features/appointments/appointments.service.js`   | ✅ Done |
| `features/announcements/announcements.service.js` | ✅ Done |
| `features/examinations/examinations.service.js`   | ✅ Done |
| `features/notifications/notifications.service.js` | ✅ Done |
| `controllers/auth.controller.js`                  | ✅ Done |

***

## 11. Supabase Realtime Setup

For consultations and presence to work in real-time, enable realtime:

```SQL
-- Enable realtime for chat and presence
ALTER PUBLICATION supabase_realtime ADD TABLE consultations;
ALTER PUBLICATION supabase_realtime ADD TABLE consultation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE presence;

-- RLS policies for public access (testing only - tighten in production)
CREATE POLICY "Allow all consultations" ON consultations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all messages" ON consultation_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all presence" ON presence FOR ALL USING (true) WITH CHECK (true);
```

***

## 12. Storage Bucket Setup

Images (announcements, avatars, etc.) are stored in Supabase Storage:

```SQL
-- Storage buckets should be created in Supabase Dashboard:
-- - announcements (for announcement images)
-- - avatars (for user profile pictures)
-- - id-images (for student ID uploads)
```

The `announcements.service.js` uploads images to `meditrack-files` bucket.

***

*Last updated: 2026-05-28*

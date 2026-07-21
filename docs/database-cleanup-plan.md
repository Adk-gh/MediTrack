# Medical Records Database Cleanup Plan

## Current Problem

The `medical_records` table has redundant columns that duplicate data already stored in the `users` table. This creates:

* Data duplication and potential inconsistency
* Wasted storage space
* Complex queries when updating user info

***

## Proposed New Structure

### Columns to REMOVE (move to JSONB):

| Current Column      | New JSONB Field                   |
| ------------------- | --------------------------------- |
| sex                 | patient\_info.sex                 |
| birthday            | patient\_info.birthday            |
| age                 | patient\_info.age                 |
| address             | patient\_info.address             |
| contact\_no         | patient\_info.contact\_no         |
| religion            | patient\_info.religion            |
| nationality         | patient\_info.nationality         |
| civil\_status       | patient\_info.civil\_status       |
| emergency\_name     | patient\_info.emergency\_name     |
| emergency\_relation | patient\_info.emergency\_relation |
| emergency\_address  | patient\_info.emergency\_address  |
| emergency\_contact  | patient\_info.emergency\_contact  |

### COVID Vaccine Columns to MERGE:

| Current Columns                             | New JSONB Field         |
| ------------------------------------------- | ----------------------- |
| vax1, vax1\_date, vax1\_remarks             | covid\_history.dose1    |
| vax2, vax2\_date, vax2\_remarks             | covid\_history.dose2    |
| booster1, booster1\_date, booster1\_remarks | covid\_history.booster1 |
| booster2, booster2\_date, booster2\_remarks | covid\_history.booster2 |
| covid\_history                              | covid\_history.history  |

***

## New medical\_records Table Schema

```SQL
CREATE TABLE public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  university_id character varying(50) NULL,
  last_name character varying(100) NULL,
  first_name character varying(100) NULL,
  middle_name character varying(50) NULL,

  -- NEW: Patient demographic info (JSONB)
  patient_info jsonb NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   sex: "Male",
  --   birthday: "2000-01-01",
  --   age: 24,
  --   address: "123 Main St",
  --   contact_no: "09123456789",
  --   religion: "Catholic",
  --   nationality: "Filipino",
  --   civil_status: "Single",
  --   emergency_name: "Jane Doe",
  --   emergency_relation: "Mother",
  --   emergency_address: "456 Secondary St",
  --   emergency_contact: "09987654321"
  -- }

  -- NEW: COVID-19 Vaccine History (JSONB)
  covid_history jsonb NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   dose1: { vaccineName: "Pfizer", date: "2021-03-01", remarks: "" },
  --   dose2: { vaccineName: "Pfizer", date: "2021-04-01", remarks: "" },
  --   booster1: { vaccineName: "Moderna", date: "2022-01-15", remarks: "" },
  --   booster2: { vaccineName: "", date: "", remarks: "" },
  --   history: "Infected in Dec 2022, mild symptoms"
  -- }

  -- Keep: Medical history questions (these are asked by doctor)
  other_medical_history text NULL,
  other_family_history text NULL,
  smoking character varying(10) NULL,
  smoking_details text NULL,
  alcohol character varying(10) NULL,
  alcohol_details text NULL,
  drugs character varying(10) NULL,
  drugs_details text NULL,

  -- Keep: Questionnaire results
  questionnaire jsonb NULL DEFAULT '{}'::jsonb,

  -- Keep: Vital Signs including Anthropometric (JSONB)
  vital_records jsonb NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   bp: "120/80",
  --   pr: "72",
  --   rr: "18",
  --   temp: "36.5",
  --   remarks: "Patient appears healthy",
  --   height: "170",
  --   weight: "65",
  --   bmi: "22.5",
  --   waist: "32",
  --   lmp: "2024-01-01"
  -- }

  -- NEW: Laboratory Results (JSONB)
  laboratory_results jsonb NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   cbc: { result: "Normal", facility: "Quest Diagnostics", date: "2024-01-15" },
  --   ua: { result: "Normal", facility: "Quest Diagnostics", date: "2024-01-15" },
  --   xray: { result: "Clear", facility: "St. Luke's Hospital", date: "2024-01-15" }
  -- }

  -- Keep: Examination details
  physician character varying(100) NULL,
  exam_date timestamp with time zone NULL,
  nurse_on_duty character varying(100) NULL,

  -- Keep: Checkbox arrays
  checked_medical jsonb NULL DEFAULT '[]'::jsonb,
  checked_family jsonb NULL DEFAULT '[]'::jsonb,
  checked_health jsonb NULL DEFAULT '[]'::jsonb,

  -- Keep: Status & timestamps
  status character varying(20) NULL DEFAULT 'pending',
  is_approved boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  approved_at timestamp with time zone NULL,
  finding1 text NULL,
  remarks text NULL,
  is_fit boolean NULL DEFAULT true,
  is_normal_findings boolean NULL DEFAULT true,
  school_year character varying(50) NOT NULL DEFAULT '',
  is_archived boolean NULL DEFAULT false,
  deleted_by text NULL,
  issue_cert boolean NULL DEFAULT false,

  CONSTRAINT medical_records_pkey PRIMARY KEY (id),
  CONSTRAINT medical_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

***

## Migration Steps

### Step 1: Create New Columns (with NULL to allow migration)

```SQL
-- Add new JSONB columns
ALTER TABLE medical_records ADD COLUMN patient_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE medical_records ADD COLUMN covid_history jsonb DEFAULT '{}'::jsonb;
ALTER TABLE medical_records ADD COLUMN laboratory_results jsonb DEFAULT '{}'::jsonb;
```

### Step 2: Migrate Existing Data

```SQL
-- Migrate patient_info
UPDATE medical_records SET patient_info = jsonb_build_object(
  'sex', sex,
  'birthday', birthday,
  'age', age,
  'address', address,
  'contact_no', contact_no,
  'religion', religion,
  'nationality', nationality,
  'civil_status', civil_status,
  'emergency_name', emergency_name,
  'emergency_relation', emergency_relation,
  'emergency_address', emergency_address,
  'emergency_contact', emergency_contact
);

-- Migrate covid_history
UPDATE medical_records SET covid_history = jsonb_build_object(
  'dose1', jsonb_build_object(
    'vaccineName', vax1,
    'date', vax1_date,
    'remarks', vax1_remarks
  ),
  'dose2', jsonb_build_object(
    'vaccineName', vax2,
    'date', vax2_date,
    'remarks', vax2_remarks
  ),
  'booster1', jsonb_build_object(
    'vaccineName', booster1,
    'date', booster1_date,
    'remarks', booster1_remarks
  ),
  'booster2', jsonb_build_object(
    'vaccineName', booster2,
    'date', booster2_date,
    'remarks', booster2_remarks
  ),
  'history', covid_history
);

-- Migrate laboratory_results
UPDATE medical_records SET laboratory_results = jsonb_build_object(
  'cbc', jsonb_build_object(
    'result', lab_cbc,
    'facility', lab_cbc_facility,
    'date', lab_cbc_date
  ),
  'ua', jsonb_build_object(
    'result', lab_ua,
    'facility', lab_ua_facility,
    'date', lab_ua_date
  ),
  'xray', jsonb_build_object(
    'result', lab_xray,
    'facility', lab_xray_facility,
    'date', lab_xray_date
  )
);

-- Migrate vital_records (combine existing vital signs with anthropometric data)
UPDATE medical_records SET vital_records = jsonb_build_object(
  'bp', (vital_records->0->>'bp'),
  'pr', (vital_records->0->>'pr'),
  'rr', (vital_records->0->>'rr'),
  'temp', (vital_records->0->>'temp'),
  'remarks', (vital_records->0->>'remarks'),
  'height', height,
  'weight', weight,
  'bmi', bmi,
  'waist', waist,
  'lmp', lmp
);
```

### Step 3: Drop Old Columns (after verification)

```SQL
-- Drop migrated columns
ALTER TABLE medical_records DROP COLUMN sex;
ALTER TABLE medical_records DROP COLUMN birthday;
ALTER TABLE medical_records DROP COLUMN age;
ALTER TABLE medical_records DROP COLUMN address;
ALTER TABLE medical_records DROP COLUMN contact_no;
ALTER TABLE medical_records DROP COLUMN religion;
ALTER TABLE medical_records DROP COLUMN nationality;
ALTER TABLE medical_records DROP COLUMN civil_status;
ALTER TABLE medical_records DROP COLUMN emergency_name;
ALTER TABLE medical_records DROP COLUMN emergency_relation;
ALTER TABLE medical_records DROP COLUMN emergency_address;
ALTER TABLE medical_records DROP COLUMN emergency_contact;

ALTER TABLE medical_records DROP COLUMN vax1;
ALTER TABLE medical_records DROP COLUMN vax1_date;
ALTER TABLE medical_records DROP COLUMN vax1_remarks;
ALTER TABLE medical_records DROP COLUMN vax2;
ALTER TABLE medical_records DROP COLUMN vax2_date;
ALTER TABLE medical_records DROP COLUMN vax2_remarks;
ALTER TABLE medical_records DROP COLUMN booster1;
ALTER TABLE medical_records DROP COLUMN booster1_date;
ALTER TABLE medical_records DROP COLUMN booster1_remarks;
ALTER TABLE medical_records DROP COLUMN booster2;
ALTER TABLE medical_records DROP COLUMN booster2_date;
ALTER TABLE medical_records DROP COLUMN booster2_remarks;
ALTER TABLE medical_records DROP COLUMN covid_history;

ALTER TABLE medical_records DROP COLUMN lab_cbc;
ALTER TABLE medical_records DROP COLUMN lab_cbc_facility;
ALTER TABLE medical_records DROP COLUMN lab_cbc_date;
ALTER TABLE medical_records DROP COLUMN lab_ua;
ALTER TABLE medical_records DROP COLUMN lab_ua_facility;
ALTER TABLE medical_records DROP COLUMN lab_ua_date;
ALTER TABLE medical_records DROP COLUMN lab_xray;
ALTER TABLE medical_records DROP COLUMN lab_xray_facility;
ALTER TABLE medical_records DROP COLUMN lab_xray_date;

ALTER TABLE medical_records DROP COLUMN height;
ALTER TABLE medical_records DROP COLUMN weight;
ALTER TABLE medical_records DROP COLUMN bmi;
ALTER TABLE medical_records DROP COLUMN waist;
ALTER TABLE medical_records DROP COLUMN lmp;
```

***

## Frontend Updates Required

### Medical.jsx - Update formData structure:

```JavaScript
// Before: separate fields
const formData = {
  sex: '',
  birthday: '',
  emergencyName: '',
  vax1: '',
  vax1Date: '',
  ...
}

// After: nested in patient_info and covid_history
const formData = {
  patientInfo: {
    sex: '',
    birthday: '',
    emergencyName: '',
    ...
  },
  covidHistory: {
    dose1: { vaccineName: '', date: '', remarks: '' },
    dose2: { ... },
    booster1: { ... },
    booster2: { ... },
    history: ''
  },
  ...
}
```

### Summary of Column Reduction:

* **Before:** 80+ columns
* **After:** ~35 columns
* **Reduction:** ~45 columns consolidated into 4 JSONB fields (patient_info, covid_history, laboratory_results, vital_records)

***

## Benefits:

1. **Less storage** - Reduced database size
2. **Data integrity** - Single source of truth for patient info
3. **Easier updates** - Update user profile, automatically reflects in new records
4. **Flexible schema** - Easy to add new fields without migrations
5. **Cleaner queries** - Simple SELECT for examination-specific data


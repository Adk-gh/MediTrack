# Frontend Update Plan - Medical Records JSONB Schema

## Overview

This document outlines the phases to update all 8 frontend files that interact with `medical_records` table to use the new JSONB schema structure.

### New Schema Structure

```JavaScript
// patient_info JSONB - stores patient demographics
{
  sex: "Male",
  birthday: "2000-01-01",
  age: 24,
  address: "123 Main St",
  contact_no: "09123456789",
  religion: "Catholic",
  nationality: "Filipino",
  civil_status: "Single",
  emergency_name: "Jane Doe",
  emergency_relation: "Mother",
  emergency_address: "456 Secondary St",
  emergency_contact: "09987654321",
  covid: {
    dose1: { vaccineName: "Pfizer", date: "2021-03-01", remarks: "" },
    dose2: { vaccineName: "Pfizer", date: "2021-04-01", remarks: "" },
    booster1: { vaccineName: "Moderna", date: "2022-01-15", remarks: "" },
    booster2: { vaccineName: "", date: "", remarks: "" },
    history: "Infected in Dec 2022"
  }
}

// laboratory_results JSONB
{
  cbc: { result: "Normal", facility: "Quest Diagnostics", date: "2024-01-15" },
  ua: { result: "Normal", facility: "Quest Diagnostics", date: "2024-01-15" },
  xray: { result: "Clear", facility: "St. Luke's Hospital", date: "2024-01-15" }
}

// vital_records JSONB (includes anthropometric)
{
  bp: "120/80",
  pr: "72",
  rr: "18",
  temp: "36.5",
  remarks: "Patient appears healthy",
  height: "170",
  weight: "65",
  bmi: "22.5",
  waist: "32",
  lmp: "2024-01-01"
}
```

***

## Files to Update

| # | File Path                                                    | Purpose                    |
| - | ------------------------------------------------------------ | -------------------------- |
| 1 | `frontend/src/features/admin-clinic/Examination/Medical.jsx` | Create new medical records |
| 2 | `frontend/src/features/admin-clinic/Records.jsx`             | View medical records       |
| 3 | `frontend/src/features/admin-clinic/Approvals.jsx`           | Approve/reject records     |
| 4 | `frontend/src/features/admin-clinic/ApprovalManagement.jsx`  | Manage approvals           |
| 5 | `frontend/src/features/users/Records-users.jsx`              | User view of their records |
| 6 | `frontend/src/features/admin-clinic/Archives.jsx`            | Archive management         |
| 7 | `frontend/src/features/admin-clinic/Record-Management.jsx`   | Record CRUD operations     |
| 8 | `frontend/src/features/admin-clinic/Dashboard.jsx`           | Dashboard statistics       |

***

## Phase 1: Add Helper Functions (All Files)

### Helper Functions to Add

```JavaScript
// Helper to extract patient_info from medical_records
const getPatientInfo = (record) => {
  if (!record) return {};
  if (record.patient_info) return record.patient_info;
  // Fallback to old columns
  return {
    sex: record.sex,
    birthday: record.birthday,
    age: record.age,
    address: record.address,
    contact_no: record.contact_no,
    religion: record.religion,
    nationality: record.nationality,
    civil_status: record.civil_status,
    emergency_name: record.emergency_name,
    emergency_relation: record.emergency_relation,
    emergency_address: record.emergency_address,
    emergency_contact: record.emergency_contact,
  };
};

// Helper to extract laboratory_results
const getLabResults = (record) => {
  if (!record) return {};
  if (record.laboratory_results) return record.laboratory_results;
  // Fallback to old columns
  return {
    cbc: { result: record.lab_cbc, facility: record.lab_cbc_facility, date: record.lab_cbc_date },
    ua: { result: record.lab_ua, facility: record.lab_ua_facility, date: record.lab_ua_date },
    xray: { result: record.lab_xray, facility: record.lab_xray_facility, date: record.lab_xray_date },
  };
};

// Helper to extract vital_records (includes anthropometric)
const getVitalRecords = (record) => {
  if (!record) return {};
  if (record.vital_records) {
    // Check if it's an array (old format) or object (new format)
    if (Array.isArray(record.vital_records) && record.vital_records.length > 0) {
      return record.vital_records[0];
    }
    return record.vital_records;
  }
  // Fallback to old columns
  return {
    bp: record.bp,
    pr: record.pr,
    rr: record.rr,
    temp: record.temp,
    remarks: record.remarks,
    height: record.height,
    weight: record.weight,
    bmi: record.bmi,
    waist: record.waist,
    lmp: record.lmp,
  };
};
```

***

## Phase 2: Update Display/Read Functions

### Areas to Update for Display:

1. **Personal Information Section**
   * Gender → `getPatientInfo(record).sex`
   * Birthdate → `getPatientInfo(record).birthday`
   * Age → `getPatientInfo(record).age`
   * Address → `getPatientInfo(record).address`
   * Contact No → `getPatientInfo(record).contact_no`
   * Religion → `getPatientInfo(record).religion`
   * Nationality → `getPatientInfo(record).nationality`
   * Civil Status → `getPatientInfo(record).civil_status`

2. **Emergency Contact Section**
   * Name → `getPatientInfo(record).emergency_name`
   * Relationship → `getPatientInfo(record).emergency_relation`
   * Address → `getPatientInfo(record).emergency_address`
   * Contact → `getPatientInfo(record).emergency_contact`

3. **COVID-19 Vaccine Section**
   * Dose 1 → `getPatientInfo(record).covid?.dose1`
   * Dose 2 → `getPatientInfo(record).covid?.dose2`
   * Booster 1 → `getPatientInfo(record).covid?.booster1`
   * Booster 2 → `getPatientInfo(record).covid?.booster2`
   * History → `getPatientInfo(record).covid?.history`

4. **Laboratory Results Section**
   * CBC → `getLabResults(record).cbc`
   * Urinalysis → `getLabResults(record).ua`
   * Chest X-Ray → `getLabResults(record).xray`

5. **Vital Signs & Anthropometric Section**
   * BP → `getVitalRecords(record).bp`
   * PR → `getVitalRecords(record).pr`
   * RR → `getVitalRecords(record).rr`
   * Temp → `getVitalRecords(record).temp`
   * Remarks → `getVitalRecords(record).remarks`
   * Height → `getVitalRecords(record).height`
   * Weight → `getVitalRecords(record).weight`
   * BMI → `getVitalRecords(record).bmi`
   * Waist → `getVitalRecords(record).waist`
   * LMP → `getVitalRecords(record).lmp`

***

## Phase 3: Update Write/Save Functions

### For Medical.jsx (Creating Records):

1. **Update** **`buildInitialForm`** **function:**
   * Read from `patient_info` JSONB instead of individual columns
   * Read from `laboratory_results` JSONB
   * Read from `vital_records` JSONB

2. **Update** **`handleFinalSubmit`** **function:**
   * Save to `patient_info` JSONB
   * Save to `laboratory_results` JSONB
   * Save to `vital_records` JSONB (including anthropometric)

### Example Save Structure:

```JavaScript
const supabasePayload = {
  // ... basic fields (last_name, first_name, university_id, etc.)

  // Patient Info JSONB
  patient_info: {
    sex: formData.sex,
    birthday: formData.birthday,
    age: parseInt(formData.age) || null,
    address: formData.address,
    contact_no: formData.contactNo,
    religion: formData.religion,
    nationality: formData.nationality,
    civil_status: formData.civilStatus,
    emergency_name: formData.emergencyName,
    emergency_relation: formData.emergencyRelation,
    emergency_address: formData.emergencyAddress,
    emergency_contact: formData.emergencyContact,
    covid: {
      dose1: { vaccineName: formData.vax1, date: formData.vax1Date, remarks: formData.vax1Remarks },
      dose2: { vaccineName: formData.vax2, date: formData.vax2Date, remarks: formData.vax2Remarks },
      booster1: { vaccineName: formData.booster1, date: formData.booster1Date, remarks: formData.booster1Remarks },
      booster2: { vaccineName: formData.booster2, date: formData.booster2Date, remarks: formData.booster2Remarks },
      history: formData.covidHistory,
    },
  },

  // Laboratory Results JSONB
  laboratory_results: {
    cbc: { result: formData.labCbc, facility: formData.labCbcFacility, date: formData.labCbcDate },
    ua: { result: formData.labUa, facility: formData.labUaFacility, date: formData.labUaDate },
    xray: { result: formData.labXray, facility: formData.labXrayFacility, date: formData.labXrayDate },
  },

  // Vital Records JSONB (includes anthropometric)
  vital_records: {
    bp: vitalRecords.bp,
    pr: vitalRecords.pr,
    rr: vitalRecords.rr,
    temp: vitalRecords.temp,
    remarks: vitalRecords.remarks,
    height: formData.height,
    weight: formData.weight,
    bmi: formData.bmi,
    waist: formData.waist,
    lmp: formData.lmp,
  },
};
```

***

## Phase 4: Update Edit Functions

### For files that allow editing medical records:

* Read current values using helper functions
* Populate form with JSONB data
* On save, update JSONB structure

***

## File-Specific Tasks

### 1. Medical.jsx ✅ IN PROGRESS

* [x] Add helper functions
* [x] Update buildInitialForm to read from JSONB
* [x] Update handleFinalSubmit to save to JSONB
* [ ] Test the form

### 2. Records.jsx

* [x] Add helper functions (getPatientInfo, getLabResults, getVitalRecords)
* [ ] Update display sections to use helper functions
* [ ] Test viewing records

### 3. Approvals.jsx

* [ ] Add helper functions
* [ ] Update approval display to use helper functions
* [ ] Test approval workflow

### 4. ApprovalManagement.jsx

* [ ] Add helper functions
* [ ] Update management display
* [ ] Test management functions

### 5. Records-users.jsx

* [ ] Add helper functions
* [ ] Update user-facing record display
* [ ] Test user view

### 6. Archives.jsx

* [ ] Add helper functions
* [ ] Update archive display
* [ ] Test archive functions

### 7. Record-Management.jsx

* [ ] Add helper functions
* [ ] Update CRUD operations
* [ ] Test record management

### 8. Dashboard.jsx

* [ ] Add helper functions
* [ ] Update statistics display
* [ ] Test dashboard

***

## Backward Compatibility

All helper functions should support both:

1. **New JSONB format** - `record.patient_info`, `record.laboratory_results`, `record.vital_records`
2. **Old column format** - `record.sex`, `record.lab_cbc`, etc.

This ensures existing records continue to work while new records use the JSONB format.

***

## Testing Checklist

* [ ] Create new medical record → saves to JSONB correctly
* [ ] View existing record (old format) → displays correctly
* [ ] View existing record (new JSONB format) → displays correctly
* [ ] Edit record → updates JSONB correctly
* [ ] Approve/reject record → works correctly
* [ ] Archive/unarchive record → works correctly
* [ ] Dashboard statistics → accurate count

***

## Notes

* Run `npm run build` after updates to check for errors
* Test on both new and old records to verify backward compatibility
* Update any TypeScript types if using TypeScript


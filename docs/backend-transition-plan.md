# Backend Migration Plan: Hybrid Approach

## Overview

Transition examination components to use the backend API for **write operations** (create/update) while keeping direct Supabase access for **read operations**. This provides security for data modifications while maintaining simplicity for data retrieval.

***

## Table of Contents

1. [Hybrid Architecture](#hybrid-architecture)
2. [Implementation Steps](#implementation-steps)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Testing Checklist](#testing-checklist)
6. [Quick Rollback](#quick-rollback)

***

## Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                      │
│                                                                         │
│   Medical.jsx / Dental.jsx                                             │
│         │                                                               │
│         ├──► WRITE ──► Backend API (POST/PUT/DELETE)                  │
│         │              │                                               │
│         │              ▼                                               │
│         │        Node.js Backend                                        │
│         │              │                                               │
│         │              ▼                                               │
│         │        Supabase (service role) ──► medical_records          │
│         │                                      dental_records          │
│         │                                                               │
│         └──► READ ──► Supabase Client (anon key) ──► users            │
│                                      medical_records                    │
│                                      dental_records                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### What Goes Through Backend (Writes)

| Operation             | Method | Why                     |
| --------------------- | ------ | ----------------------- |
| Create medical record | POST   | Audit trail, validation |
| Create dental record  | POST   | Audit trail, validation |
| Update medical record | PUT    | Audit trail, validation |
| Update dental record  | PUT    | Audit trail, validation |
| Delete medical record | DELETE | Audit trail             |
| Delete dental record  | DELETE | Audit trail             |

### What Stays Direct (Reads)

| Operation             | Method | Why                  |
| --------------------- | ------ | -------------------- |
| Fetch patient profile | SELECT | Real-time, faster    |
| Fetch medical history | SELECT | Real-time, less risk |
| Fetch dental history  | SELECT | Real-time, less risk |
| Fetch all records     | SELECT | Aggregation          |

***

## Implementation Steps

### Phase 1: Backend (Add Write APIs)

* [ ] **Step 1:** Extend `examinations.service.js` with create/update methods
* [ ] **Step 2:** Add validation schemas
* [ ] **Step 3:** Add controller methods
* [ ] **Step 4:** Add routes
* [ ] **Step 5:** Test with Postman/cURL

### Phase 2: Frontend (Use API for Writes)

* [ ] **Step 1:** Create API service for writes only
* [ ] **Step 2:** Update Medical.jsx to use API for create
* [ ] **Step 3:** Update Dental.jsx to use API for create
* [ ] **Step 4:** Test end-to-end

***

## Backend Implementation

### Step 1: Extend Service Layer

**File:** `features/examinations/examinations.service.js`

Add these methods to the existing service:

```JavaScript
// Add at the end of existing file

// ─── CREATE Medical Record ───────────────────────────────────────────
exports.createMedicalRecord = async (data, userId) => {
  const { data: record, error } = await supabase
    .from('medical_records')
    .insert({
      ...data,
      user_id: userId,
      created_at: new Date().toISOString(),
      status: 'pending',
      is_approved: false
    })
    .select()
    .single();

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 400;
    throw err;
  }

  // Log to audit (optional)
  await logAudit('CREATE', 'medical_record', record.id, userId);

  return record;
};

// ─── CREATE Dental Record ────────────────────────────────────────────
exports.createDentalRecord = async (data, userId) => {
  const { data: record, error } = await supabase
    .from('dental_records')
    .insert({
      ...data,
      user_id: userId,
      created_at: new Date().toISOString(),
      status: 'pending',
      is_approved: false
    })
    .select()
    .single();

  if (error) {
    const err = new Error(error.message);
    err.statusCode = 400;
    throw err;
  }

  await logAudit('CREATE', 'dental_record', record.id, userId);
  return record;
};

// ─── UPDATE Medical Record ───────────────────────────────────────────
exports.updateMedicalRecord = async (id, data, userId) => {
  const { data: record, error } = await supabase
    .from('medical_records')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAudit('UPDATE', 'medical_record', id, userId);
  return record;
};

// ─── UPDATE Dental Record ───────────────────────────────────────────
exports.updateDentalRecord = async (id, data, userId) => {
  const { data: record, error } = await supabase
    .from('dental_records')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logAudit('UPDATE', 'dental_record', id, userId);
  return record;
};

// ─── DELETE Medical Record ───────────────────────────────────────────
exports.deleteMedicalRecord = async (id, userId) => {
  const { error } = await supabase
    .from('medical_records')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await logAudit('DELETE', 'medical_record', id, userId);
  return { id };
};

// ─── DELETE Dental Record ───────────────────────────────────────────
exports.deleteDentalRecord = async (id, userId) => {
  const { error } = await supabase
    .from('dental_records')
    .delete()
    .eq('id', id);

  if (error) throw error;

  await logAudit('DELETE', 'dental_record', id, userId);
  return { id };
};

// ─── Helper: Audit Logger ───────────────────────────────────────────
const logAudit = async (action, table, recordId, userId) => {
  try {
    await supabase.from('audit_logs').insert({
      action,
      table_name: table,
      record_id: recordId,
      user_id: userId,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};
```

***

### Step 2: Validation Schemas

**File:** `features/examinations/examinations.validation.js`

Add at the end of existing file:

```JavaScript
// ─── Medical Record Create Schema ────────────────────────────────────
const createMedicalRecordSchema = z.object({
  university_id: z.string().max(50).optional(),
  last_name: z.string().max(100).optional(),
  first_name: z.string().max(100).optional(),
  middle_name: z.string().max(50).optional(),
  sex: z.enum(['Male', 'Female']).optional(),
  birthday: z.string().optional(),
  age: z.number().int().min(0).max(150).optional(),
  address: z.string().optional(),
  contact_no: z.string().max(20).optional(),
  religion: z.string().max(100).optional(),
  nationality: z.string().max(100).optional(),
  civil_status: z.enum(['Single', 'Married', 'Widowed', 'Separated']).optional(),
  emergency_name: z.string().max(100).optional(),
  emergency_relation: z.string().max(50).optional(),
  emergency_address: z.string().optional(),
  emergency_contact: z.string().max(20).optional(),
  vax1: z.string().max(50).optional(),
  vax1_date: z.string().optional(),
  vax2: z.string().max(50).optional(),
  vax2_date: z.string().optional(),
  booster1: z.string().max(50).optional(),
  booster1_date: z.string().optional(),
  booster2: z.string().max(50).optional(),
  booster2_date: z.string().optional(),
  covid_history: z.string().optional(),
  other_medical_history: z.string().optional(),
  other_family_history: z.string().optional(),
  smoking: z.enum(['Yes', 'No']).optional(),
  smoking_details: z.string().optional(),
  alcohol: z.enum(['Yes', 'No']).optional(),
  alcohol_details: z.string().optional(),
  drugs: z.enum(['Yes', 'No']).optional(),
  drugs_details: z.string().optional(),
  height: z.string().max(20).optional(),
  weight: z.string().max(20).optional(),
  bmi: z.string().max(20).optional(),
  waist: z.string().max(20).optional(),
  lmp: z.string().max(20).optional(),
  lab_cbc: z.string().max(50).optional(),
  lab_cbc_facility: z.string().max(100).optional(),
  lab_cbc_date: z.string().optional(),
  lab_ua: z.string().max(50).optional(),
  lab_ua_facility: z.string().max(100).optional(),
  lab_ua_date: z.string().optional(),
  lab_xray: z.string().max(50).optional(),
  lab_xray_facility: z.string().max(100).optional(),
  lab_xray_date: z.string().optional(),
  physician: z.string().max(100).optional(),
  exam_date: z.string().optional(),
  nurse_on_duty: z.string().max(100).optional(),
  checked_medical: z.array(z.string()).optional(),
  checked_family: z.array(z.string()).optional(),
  checked_health: z.array(z.string()).optional(),
  vital_records: z.array(z.any()).optional(),
});

// ─── Dental Record Create Schema ─────────────────────────────────────
const createDentalRecordSchema = z.object({
  university_id: z.string().max(50).optional(),
  last_name: z.string().max(100).optional(),
  first_name: z.string().max(100).optional(),
  middle_name: z.string().max(50).optional(),
  sex: z.enum(['Male', 'Female']).optional(),
  age: z.number().int().min(0).max(150).optional(),
  birthday: z.string().optional(),
  address: z.string().optional(),
  cellphone: z.string().max(20).optional(),
  course_year: z.string().max(100).optional(),
  office_address: z.string().optional(),
  tel_no: z.string().max(20).optional(),
  nationality: z.string().max(100).optional(),
  last_visit: z.string().optional(),
  prev_dentist: z.string().max(100).optional(),
  physician: z.string().max(100).optional(),
  vax1_date: z.string().optional(),
  vax2_date: z.string().optional(),
  booster_date: z.string().optional(),
  teeth_upper: z.string().optional(),
  teeth_lower: z.string().optional(),
  tooth_data: z.record(z.any()).optional(),
  dental_history: z.record(z.string()).optional(),
  intraoral: z.record(z.string()).optional(),
  examined_by: z.string().max(100).optional(),
  exam_date: z.string().optional(),
  patient_signature: z.string().max(255).optional(),
  sig_date: z.string().optional(),
});

// Export both schemas
module.exports = {
  ...existingExports,
  createMedicalRecordSchema,
  createDentalRecordSchema,
};
```

***

### Step 3: Controller Methods

**File:** `features/examinations/examinations.controller.js`

Add these new exports at the end of existing file:

```JavaScript
// ─── CREATE Medical Record ───────────────────────────────────────────
const createMedicalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const record = await examinationsService.createMedicalRecord(req.body, userId);
    res.status(201).json({
      success: true,
      data: record,
      message: 'Medical record created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE Dental Record ─────────────────────────────────────────────
const createDentalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const record = await examinationsService.createDentalRecord(req.body, userId);
    res.status(201).json({
      success: true,
      data: record,
      message: 'Dental record created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE Medical Record ───────────────────────────────────────────
const updateMedicalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const record = await examinationsService.updateMedicalRecord(
      req.params.id,
      req.body,
      userId
    );
    res.status(200).json({
      success: true,
      data: record,
      message: 'Medical record updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE Dental Record ─────────────────────────────────────────────
const updateDentalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const record = await examinationsService.updateDentalRecord(
      req.params.id,
      req.body,
      userId
    );
    res.status(200).json({
      success: true,
      data: record,
      message: 'Dental record updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE Medical Record ───────────────────────────────────────────
const deleteMedicalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    await examinationsService.deleteMedicalRecord(req.params.id, userId);
    res.status(200).json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE Dental Record ─────────────────────────────────────────────
const deleteDentalRecord = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body.userId;
    await examinationsService.deleteDentalRecord(req.params.id, userId);
    res.status(200).json({
      success: true,
      message: 'Dental record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Add to module.exports
module.exports = {
  ...existingExports,
  createMedicalRecord,
  createDentalRecord,
  updateMedicalRecord,
  updateDentalRecord,
  deleteMedicalRecord,
  deleteDentalRecord,
};
```

***

### Step 4: Route Definitions

**File:** `features/examinations/examinations.route.js`

Add these routes BEFORE the general `/:id` route:

```JavaScript
// Add these imports at the top
const validateData = require("../../validation/validate-data");
const {
  createMedicalRecordSchema,
  createDentalRecordSchema
} = require("./examinations.validation");

// Add these routes - place BEFORE router.get("/:id", ...)
router.post("/medical", validateData(createMedicalRecordSchema), examinationsController.createMedicalRecord);
router.put("/medical/:id", examinationsController.updateMedicalRecord);
router.delete("/medical/:id", authorized, examinationsController.deleteMedicalRecord);

router.post("/dental", validateData(createDentalRecordSchema), examinationsController.createDentalRecord);
router.put("/dental/:id", examinationsController.updateDentalRecord);
router.delete("/dental/:id", authorized, examinationsController.deleteDentalRecord);
```

***

## Frontend Implementation

### Step 1: Create Write API Service

**File:** `frontend/src/services/examinationWrites.js`

```JavaScript
import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL;

// Helper to get auth token
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
  };
};

// ─── Medical Record Writes ────────────────────────────────────────────
export const createMedicalRecord = async (data) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/medical`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create medical record');
  return result;
};

export const updateMedicalRecord = async (id, data) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/medical/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update medical record');
  return result;
};

export const deleteMedicalRecord = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/medical/${id}`, {
    method: 'DELETE',
    headers
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete medical record');
  return result;
};

// ─── Dental Record Writes ────────────────────────────────────────────
export const createDentalRecord = async (data) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/dental`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to create dental record');
  return result;
};

export const updateDentalRecord = async (id, data) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/dental/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to update dental record');
  return result;
};

export const deleteDentalRecord = async (id) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/examinations/dental/${id}`, {
    method: 'DELETE',
    headers
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Failed to delete dental record');
  return result;
};
```

***

### Step 2: Update Medical.jsx

**File:** `frontend/src/features/admin-clinic/Examination/Medical.jsx`

Find the `handleFinalSubmit` function and REPLACE the Supabase call:

```JavaScript
// ADD this import at the top with other imports
import { createMedicalRecord } from '../../../services/examinationWrites';

// REPLACE lines ~535-547 (the Supabase insert) with:
const handleFinalSubmit = async () => {
  if (!selectedPatient?.uid) {
    alert("Error: No patient selected. Cannot save record.");
    return;
  }

  setIsSubmitting(true);

  try {
    // Transform form data to match expected format
    const payload = {
      ...formData,
      checked_medical: checkedMedical,
      checked_family: checkedFamily,
      checked_health: checkedHealth,
      vital_records: vitalRecords,
    };

    // Use Backend API instead of direct Supabase
    await createMedicalRecord(payload);

    setShowSummary(false);
    showMessage('Medical record saved successfully! Waiting for approval.');

  } catch (error) {
    console.error("Error saving medical record: ", error);
    alert("Failed to save the record to the database. Check console for details.");
  } finally {
    setIsSubmitting(false);
  }
};
```

***

### Step 3: Update Dental.jsx

**File:** `frontend/src/features/admin-clinic/Examination/Dental.jsx`

Find the `handleFinalSubmit` function and REPLACE the Supabase call:

```JavaScript
// ADD this import at the top with other imports
import { createDentalRecord } from '../../../services/examinationWrites';

// REPLACE lines ~535-547 (the Supabase insert) with:
const handleFinalSubmit = async () => {
  if (!selectedPatient?.uid) {
    alert("Error: No patient selected. Cannot save record.");
    return;
  }

  setIsSubmitting(true);

  try {
    // Transform form data to match expected format
    const payload = {
      ...dentalFormData,
      tooth_data: toothData,
      dental_history: dentalHistory,
      intraoral: intraoral,
      exam_date: combineDateTime(dentalFormData.dExamDate, dentalFormData.dExamTime),
      sig_date: dentalFormData.dSigDate ? `${dentalFormData.dSigDate}T00:00:00` : null,
    };

    // Use Backend API instead of direct Supabase
    await createDentalRecord(payload);

    setShowSummary(false);
    showMessage('Dental record saved successfully! Waiting for approval.');

  } catch (error) {
    console.error("Error saving dental record: ", error);
    alert("Failed to save the record to the database. Check console for details.");
  } finally {
    setIsSubmitting(false);
  }
};
```

***

## Testing Checklist

### Backend Tests (Postman/cURL)

* [ ] `POST /api/examinations/medical` - Create medical record
* [ ] `POST /api/examinations/dental` - Create dental record
* [ ] `PUT /api/examinations/medical/:id` - Update medical record
* [ ] `PUT /api/examinations/dental/:id` - Update dental record
* [ ] `DELETE /api/examinations/medical/:id` - Delete medical record
* [ ] `DELETE /api/examinations/dental/:id` - Delete dental record

### Frontend Tests (Browser)

* [ ] Create new medical record via form
* [ ] Create new dental record via form
* [ ] View medical visit history (should still work - direct Supabase)
* [ ] View dental visit history (should still work - direct Supabase)
* [ ] Error handling - network failure shows proper message
* [ ] Success message appears after save

***

## Quick Rollback

If issues occur, simply revert the import and function call in both files:

```JavaScript
// REVERT: Medical.jsx
// Remove: import { createMedicalRecord } from '../../../services/examinationWrites';
// Add back: import { supabase } from '../../../supabase';

// Replace: await createMedicalRecord(payload);
// With:
// const { error } = await supabase.from('medical_records').insert(supabasePayload);
// if (error) throw error;
```

Same for Dental.jsx.

***

## Summary

| Item                | What Changes                                            |
| ------------------- | ------------------------------------------------------- |
| **Backend**         | New POST/PUT/DELETE routes for medical & dental records |
| **Frontend Writes** | Use API service instead of direct Supabase              |
| **Frontend Reads**  | Keep existing Supabase calls (unchanged)                |
| **Security**        | Database credentials hidden for writes                  |
| **Audit**           | Creates/updates logged in audit\_logs table             |
| **Effort**          | \~2-3 hours to implement                                |

***

**Plan Updated:** 2026-07-18
**Approach:** Hybrid (Backend for writes, Supabase for reads)

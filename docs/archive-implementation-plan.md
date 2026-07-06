# MediTrack Archive Function Implementation Plan

## Overview

This document outlines the phased implementation to integrate the archive function across all admin pages in MediTrack. Currently, the project has:

* **Database**: Archives table already defined in `sql/archives_table.sql`
* **Backend**: Archive service/controller/route already implemented in `features/archives/`
* **Frontend Archives Page**: `Archives.jsx` exists with view/restore/permanent-delete functionality

## Current Architecture

### Database Schema (archives table)

```SQL
-- archives table fields:
- id (UUID, PK)
- type (VARCHAR) - e.g., 'record', 'announcement', 'user', 'consultation', 'appointment', 'examination'
- original_id (UUID)
- data (JSONB) - stores the deleted item's complete data
- deleted_by (VARCHAR) - user who deleted
- archived_at (TIMESTAMP)
- permanent_delete_at (TIMESTAMP) - auto-delete after 2 years
- is_permanently_deleted (BOOLEAN)
- restored_at (TIMESTAMP)
```

### Backend Services Already Available

* `features/archives/archives.service.js` - contains:
  * `moveToArchives({ type, originalId, data, deletedBy })`
  * `getArchives({ type, search, page, limit })`
  * `restoreFromArchives(id)`
  * `permanentDelete(id)`
  * `getArchiveStats()`

***

## Phase 1: Backend API Enhancements

### 1.1 Add Archive API Endpoints (if not fully exposed)

**File**: `features/archives/archives.route.js`

* Ensure POST `/api/archives` for archiving items
* Ensure POST `/api/archives/:id/restore` for restoration
* Ensure GET `/api/archives/stats` for dashboard stats

### 1.2 Create Archive Helper Utility

**File**: `features/archives/archiveHelper.js`
Create a centralized helper function to be used by all delete operations:

```JavaScript
// archiveHelper.js
const archiveService = require('./archives.service');

/**
 * Archive an item before permanent deletion
 * @param {string} type - archive type (record, announcement, user, etc.)
 * @param {string} originalId - the ID of the item being deleted
 * @param {object} data - complete data of the item
 * @param {string} deletedBy - user ID or name who deleted
 */
exports.archiveBeforeDelete = async ({ type, originalId, data, deletedBy }) => {
  return await archiveService.moveToArchives({ type, originalId, data, deletedBy });
};
```

***

## Phase 2: Frontend Service Layer

### 2.1 Create Archive Service

**File**: `frontend/src/services/archive.service.js`

```JavaScript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default {
  async archiveItem(type, originalId, data) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const response = await axios.post(`${API_URL}/archives`, {
      type,
      originalId,
      data,
      deletedBy: user.name || user.email || 'Admin'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async getArchives(params) {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/archives`, {
      params,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async restoreItem(id) {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/archives/${id}/restore`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async permanentDelete(id) {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/archives/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
```

***

## Phase 3: Modify Admin Pages

### 3.1 Announcements Page

**File**: `frontend/src/features/admin-clinic/Announcements.jsx`

**Current**: Lines 362-384 (handleDelete)

```JavaScript
// Current code - deletes directly
const handleDelete = async (id) => {
  if (!window.confirm('Delete this announcement?')) return;
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    // ...
  }
};
```

**Change to**:

1. First fetch the full announcement data before delete
2. Call archive service to store the data
3. Then delete from announcements table

### 3.2 Appointments Page

**File**: `frontend/src/features/admin-clinic/Appointments.jsx`

Find and modify the delete appointment function to:

1. Fetch appointment data
2. Archive to archives table
3. Delete from appointments table

### 3.3 Consultations Page

**File**: `frontend/src/features/admin-clinic/Consultations.jsx`

Find and modify:

* `handleEndConsultation` or any delete function
* Archive consultation thread data before deletion

### 3.4 Records Page

**File**: `frontend/src/features/admin-clinic/Records.jsx`

Find delete functionality and modify to archive user records

### 3.5 User Management Page

**File**: `frontend/src/features/admin-clinic/User-Management.jsx`

**Current**: Lines 747-756 (confirmDelete)

```JavaScript
const confirmDelete = async () => {
  const { error } = await supabase.from('users').delete().eq('uid', deleteTarget.uid);
  // ...
};
```

**Change to**:

1. Fetch full user data including profile
2. Archive to archives table with type 'user'
3. Delete from users table

### 3.6 Approvals Page

**File**: `frontend/src/features/admin-clinic/Approvals.jsx`

Find delete functionality and modify to archive approval records

***

## Phase 4: Update Delete Confirmation UX

### 4.1 Modify Confirmation Messages

All admin pages should update their delete confirmation to:

```JavaScript
// Before
if (!window.confirm('Delete this announcement?')) return;

// After
if (!window.confirm('Are you sure you want to archive this announcement? It can be restored later from the Archives page.')) return;
```

### 4.2 Add Archive Success Notification

After successful archiving, show a message:

```JavaScript
showSnackbar('Item archived successfully. You can restore it from the Archives page.', 'success');
```

***

## Phase 5: Testing & Verification

### 5.1 Test Each Admin Page

* [ ] Announcements - delete and verify in Archives
* [ ] Appointments - delete and verify in Archives
* [ ] Consultations - delete and verify in Archives
* [ ] Records - delete and verify in Archives
* [ ] User Management - delete and verify in Archives
* [ ] Approvals - delete and verify in Archives

### 5.2 Test Restore Functionality

* [ ] Restore each archived item type
* [ ] Verify data is restored correctly

***

## Implementation Checklist

| Phase | Task                            | File(s) to Modify                                        | Status |
| ----- | ------------------------------- | -------------------------------------------------------- | ------ |
| 1.1   | Verify archive API endpoints    | `features/archives/archives.route.js`                    | -      |
| 1.2   | Create archive helper           | `features/archives/archiveHelper.js`                     | -      |
| 2.1   | Create frontend archive service | `frontend/src/services/archive.service.js`               | -      |
| 3.1   | Update Announcements delete     | `frontend/src/features/admin-clinic/Announcements.jsx`   | -      |
| 3.2   | Update Appointments delete      | `frontend/src/features/admin-clinic/Appointments.jsx`    | -      |
| 3.3   | Update Consultations delete     | `frontend/src/features/admin-clinic/Consultations.jsx`   | -      |
| 3.4   | Update Records delete           | `frontend/src/features/admin-clinic/Records.jsx`         | -      |
| 3.5   | Update User Management delete   | `frontend/src/features/admin-clinic/User-Management.jsx` | -      |
| 3.6   | Update Approvals delete         | `frontend/src/features/admin-clinic/Approvals.jsx`       | -      |
| 4.1   | Update confirmation messages    | All admin pages                                          | -      |
| 4.2   | Add success notifications       | All admin pages                                          | -      |
| 5.1   | Test archive functionality      | All pages                                                | -      |
| 5.2   | Test restore functionality      | Archives page                                            | -      |

***

## Notes

1. **Archive Types**: Use these consistent types:
   * `record` - for user records
   * `announcement` - for announcements
   * `user` - for user accounts
   * `consultation` - for consultation threads
   * `appointment` - for appointments
   * `examination` - for medical/dental examinations
   * `approval` - for approval records

2. **Data to Archive**: Always archive the complete data object including all related fields

3. **2-Year Retention**: Items are automatically scheduled for permanent deletion after 2 years (already configured in archives.service.js)

4. **Audit Trail**: The `deleted_by` field tracks who archived each item

***

## Related Files

* Database: `sql/archives_table.sql`
* Backend: `features/archives/*`
* Frontend Archives: `frontend/src/features/admin-clinic/Archives.jsx`


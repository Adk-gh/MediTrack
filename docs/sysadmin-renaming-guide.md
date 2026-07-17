# SysAdmin vs School Administrator Renaming Guide

## Overview

This document outlines all the changes needed to rename "Admin" to "SysAdmin" (System Administrator) throughout the system to avoid confusion with "School Administrators".

## Current Classification Mapping

The current system uses "Administrator" classification which creates confusion between:

* **System Administrator (SysAdmin)** - Has full system access, manages users, settings, archives
* **School Administrator** - May be an admin staff in departments like Accounting, Registrar, etc.

## Changes Required

### 1. Classification Dropdowns (CLASSIFICATIONS array)

**Files:**

* `frontend/src/components/Headers.jsx` (lines 406-411)
* `frontend/src/features/users/Profile-users.jsx` (lines 111-117)

**Change:**

```JavaScript
// FROM:
const CLASSIFICATIONS = [
  'Teaching Personnel',
  'Nurse Personnel',
  'Physician / Doctor',
  'Administrator',  // <-- This should become "System Administrator"
  'Non-Teaching Personnel',
  'Security Personnel',
];

// TO:
const CLASSIFICATIONS = [
  'Teaching Personnel',
  'Nurse Personnel',
  'Physician / Doctor',
  'System Administrator',
  'Non-Teaching Personnel',
  'Security Personnel',
];
```

### 2. Role-based Configuration (ROLE\_NAV\_CONFIG, ROLE\_MOBILE\_NAV\_CONFIG)

**Files:**

* `frontend/src/components/Headers.jsx` (lines 1644, 1813)

**Change:**

* Replace all `'admin'` role references with `'sysadmin'`

### 3. ProtectedRoute and Role Checks

**Files:**

* `frontend/src/App.jsx` (lines 52, 65, 88, 228, 308, 313)
* `frontend/src/components/Headers.jsx` (lines 41, 1611, 1623, 1644, 1788, 1813)
* `frontend/src/layouts/DashboardLayout.jsx` (lines 40, 496, 532, 544, 549)
* `frontend/src/features/LoginForm.jsx` (line 60)
* `frontend/src/features/admin-clinic/Announcements.jsx` (line 296)
* `frontend/src/features/admin-clinic/AppointmentManagement.jsx` (line 334)
* `frontend/src/features/admin-clinic/ApprovalManagement.jsx` (line 325)
* `frontend/src/features/admin-clinic/ConsultationManagement.jsx` (line 286)
* `frontend/src/features/admin-clinic/Records.jsx` (lines 530, 531, 771, 772)
* `frontend/src/features/admin-clinic/Approvals.jsx` (lines 59, 67)
* `frontend/src/features/admin-clinic/Consultations.jsx` (lines 315, 332, 339, 426, 528)
* `frontend/src/features/admin-clinic/User-Management.jsx` (lines 35, 36, 44, 100, 242, 418, 421, 432, 779, 834)
* `frontend/src/features/users/Consultation-users.jsx` (line 920)
* `frontend/src/components/Settings.jsx` (lines 322, 420)
* `frontend/src/services/archive.service.js` (line 19)

**Change:** Replace all `'admin'` and `'administrator'` role checks with `'sysadmin'`

### 4. Display Labels

**Files:**

* `frontend/src/components/Headers.jsx` (line 1460)
* `frontend/src/features/admin-clinic/User-Management.jsx` (lines 100, 815, 834)

**Change:**

```JavaScript
// FROM:
const displayRole = fullProfile.role || 'Administrator';
// TO:
const displayRole = fullProfile.role || 'System Administrator';
```

### 5. ProfileSetup.jsx - Classification Mapping

**File:** `frontend/src/components/ProfileSetup.jsx` (lines 257-270, 277-278, 1016)

**Change:**

```JavaScript
// FROM:
'administrator': 'Administrator',
'admin':         'Administrator',

// TO:
'sysadmin':      'System Administrator',
'admin':         'System Administrator',
```

### 6. User-Management.jsx - Stats and Dropdowns

**File:** `frontend/src/features/admin-clinic/User-Management.jsx` (lines 35-44, 100, 436, 779, 815, 834)

**Changes:**

* Stats: Replace `'Administrators'` with `'System Administrators'`
* Dropdowns: Replace `'Administrator'` with `'System Administrator'`

### 7. Headers.jsx - Default Display

**File:** `frontend/src/components/Headers.jsx` (line 1460)

**Change:**

```JavaScript
// FROM:
const displayRole = fullProfile.role || 'Administrator';

// TO:
const displayRole = fullProfile.role || 'System Administrator';
```

***

## Summary TABLE

| #  | File                       | Lines                            | Change Type            | Old Value                | New Value                          |
| -- | -------------------------- | -------------------------------- | ---------------------- | ------------------------ | ---------------------------------- |
| 1  | Headers.jsx                | 406-411                          | Classification         | `Administrator`          | `System Administrator`             |
| 2  | Profile-users.jsx          | 111-117                          | Classification         | `Administrator`          | `System Administrator`             |
| 3  | Headers.jsx                | 41, 1611, 1623, 1644, 1788, 1813 | Role check             | `admin`                  | `sysadmin`                         |
| 4  | App.jsx                    | 52, 65, 88, 228, 308, 313        | Role check             | `admin`                  | `sysadmin`                         |
| 5  | DashboardLayout.jsx        | 40, 496, 532, 544, 549           | Role check             | `admin`                  | `sysadmin`                         |
| 6  | LoginForm.jsx              | 60                               | Role check             | `admin`                  | `sysadmin`                         |
| 7  | Announcements.jsx          | 296                              | Role check             | `admin`                  | `sysadmin`                         |
| 8  | AppointmentManagement.jsx  | 334                              | Role check             | `admin`                  | `sysadmin`                         |
| 9  | ApprovalManagement.jsx     | 325                              | Role check             | `admin`                  | `sysadmin`                         |
| 10 | ConsultationManagement.jsx | 286                              | Role check             | `admin`                  | `sysadmin`                         |
| 11 | Records.jsx                | 530, 531, 771, 772               | Role check             | `admin`                  | `sysadmin`                         |
| 12 | Approvals.jsx              | 59, 67                           | Role check             | `admin`                  | `sysadmin`                         |
| 13 | Consultations.jsx          | 315, 332, 339, 426, 528          | Role check             | `admin`                  | `sysadmin`                         |
| 14 | User-Management.jsx        | 35-44, 100, 436, 779, 815, 834   | Role check & Labels    | `admin`, `Administrator` | `sysadmin`, `System Administrator` |
| 15 | Consultation-users.jsx     | 920                              | Role check             | `admin`                  | `sysadmin`                         |
| 16 | Settings.jsx               | 322, 420                         | Role check             | `admin`                  | `sysadmin`                         |
| 17 | archive.service.js         | 19                               | Display label          | `Admin`                  | `System Admin`                     |
| 18 | ProfileSetup.jsx           | 257-270, 277-278, 1016           | Classification mapping | `Administrator`          | `System Administrator`             |
| 19 | Headers.jsx                | 1460                             | Display default        | `Administrator`          | `System Administrator`             |

***

## IMPORTANT NOTES

1. **Database Role**: The role stored in the database as `'admin'` will need to be migrated to `'sysadmin'` OR the code should handle both `'admin'` and `'sysadmin'`.

2. **Backward Compatibility**: Consider checking for both `'admin'` and `'sysadmin'` during the transition period.

3. **School Administrator Option**: If there's a need for a "School Administrator" classification (for department admins like Accounting, Registrar, etc.), it should be added as a separate option in the CLASSIFICATIONS array, e.g., `'School Administrator'`.


# MediTrack SQLite Offline Mode Implementation Guide

This guide provides step-by-step instructions for implementing SQLite-based offline storage in MediTrack. This will allow users (students, faculty, staff) to access their appointments and medical records even without internet connectivity, and maintain login sessions for at least 48 hours.

***

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Setup and Dependencies](#phase-1-setup-and-dependencies)
3. [Phase 2: Database Schema Design](#phase-2-database-schema-design)
4. [Phase 3: SQLite Service Implementation](#phase-3-sqlite-service-implementation)
5. [Phase 4: Offline Authentication with Session Management](#phase-4-offline-authentication-with-session-management)
6. [Phase 5: Offline Appointments Storage](#phase-5-offline-appointments-storage)
7. [Phase 6: Offline Records Storage](#phase-6-offline-records-storage)
8. [Phase 7: Sync Mechanism](#phase-7-sync-mechanism)
9. [Phase 8: UI Integration](#phase-8-ui-integration)
10. [Testing Checklist](#testing-checklist)

***

## Overview

### Goals

* **Offline Appointments**: Users can view their scheduled appointments without internet
* **Offline Records**: Users can access their medical records offline
* **Extended Session**: 48-hour minimum session persistence (no re-login required)
* **Seamless Sync**: Data syncs automatically when connectivity returns
* **Show to Clinic Staff**: Users can display their appointments offline to clinic personnel

### Technology Stack

* **SQLite**: Using `sql.js` (pure JavaScript SQLite implementation) for cross-platform compatibility
* **Capacitor**: For native mobile storage access
* **localStorage**: For session tokens and preferences

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  React Components                                            │
│       ↓                                                      │
│  OfflineService (SQLite + localStorage hybrid)               │
│       ↓                                                      │
│  SyncManager (handles online/offline transitions)            │
│       ↓                                                      │
│  API Layer (falls back to offline when network unavailable)  │
├─────────────────────────────────────────────────────────────┤
│                     SQLite Database                          │
│  (stored via Capacitor Filesystem or localStorage fallback)  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    (when online)
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND                                │
│                   (Supabase + Express)                       │
└─────────────────────────────────────────────────────────────┘
```

***

## Phase 1: Setup and Dependencies

### Step 1.1: Install Required Packages

Navigate to the frontend directory and install the necessary packages:

```Shell
cd frontend
npm install sql.js
npm install --save-dev @types/sql.js
```

> **Note**: For Capacitor mobile apps, we'll also use `@capacitor/preferences` for simple key-value storage and `@capacitor/filesystem` for SQLite database file storage.

```Shell
npm install @capacitor/preferences @capacitor/filesystem
```

### Step 1.2: Configure Vite for SQL.js

SQL.js requires access to its WebAssembly file. Update your `vite.config.js`:

```JavaScript
// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    compression()
  ],
  optimizeDeps: {
    exclude: ['sql.js']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

### Step 1.3: Copy SQL.js WASM File

Copy the SQL.js WASM file to your public folder:

```Shell
# From node_modules to public
cp node_modules/sql.js/dist/sql-wasm.wasm public/
```

Or create a script in `package.json`:

```JSON
"scripts": {
  "copy:sql": "cp node_modules/sql.js/dist/sql-wasm.wasm public/",
  "dev": "npm run copy:sql && vite",
  "build": "npm run copy:sql && vite build"
}
```

***

## Phase 2: Database Schema Design

### Step 2.1: Define the SQLite Schema

Create a schema that mirrors your Supabase tables but optimized for offline use:

```SQL
-- SQLite Database Schema for MediTrack Offline Mode

-- ============================================
-- USERS TABLE (Cached user profile)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    university_id TEXT,
    first_name TEXT,
    last_name TEXT,
    middle_name TEXT,
    suffix TEXT,
    role TEXT,
    department TEXT,
    program TEXT,
    section TEXT,
    vaccination_status TEXT,
    vaccination_history TEXT,
    emergency_contact TEXT,
    is_profile_setup INTEGER DEFAULT 0,
    created_at TEXT,
    updated_at TEXT,
    -- Sync metadata
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    patient_name TEXT,
    patient_email TEXT,
    patient_university_id TEXT,
    service_type TEXT,
    appointment_date TEXT,
    appointment_time TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_by TEXT,
    created_at TEXT,
    updated_at TEXT,
    -- Clinic staff assignment
    assigned_to TEXT,
    -- Archive flag
    is_archived INTEGER DEFAULT 0,
    deleted_by TEXT,
    -- Sync metadata
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- RECORDS TABLE (Medical Records)
-- ============================================
CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    record_type TEXT,
    title TEXT,
    description TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT,
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    -- Archive flag
    is_archived INTEGER DEFAULT 0,
    -- Sync metadata
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- CONSULTATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS consultations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    appointment_id TEXT,
    consultation_type TEXT,
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment TEXT,
    prescriptions TEXT,
    notes TEXT,
    created_at TEXT,
    created_by TEXT,
    updated_at TEXT,
    updated_by TEXT,
    -- Sync metadata
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    priority TEXT DEFAULT 'normal',
    target_roles TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    created_by TEXT,
    expires_at TEXT,
    -- Sync metadata
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT
);

-- ============================================
-- SESSION TABLE (For 48-hour login persistence)
-- ============================================
CREATE TABLE IF NOT EXISTS session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TEXT,
    session_started_at TEXT NOT NULL,
    last_active_at TEXT NOT NULL,
    is_valid INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- SYNC QUEUE TABLE (Pending changes to sync)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    data TEXT, -- JSON string of record data
    created_at TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
```

### Step 2.2: Version Management

Add a version table to track schema updates:

```SQL
CREATE TABLE IF NOT EXISTS db_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT
);

-- Initial version
INSERT INTO db_version (version, applied_at) VALUES (1, datetime('now'));
```

***

## Phase 3: SQLite Service Implementation

### Step 3.1: Create the Database Service

Create `frontend/src/services/sqlite.service.js`:

```JavaScript
// frontend/src/services/sqlite.service.js
import initSqlJs from 'sql.js';

const DB_NAME = 'meditrack.db';
const DB_VERSION = 1;

class SQLiteService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.SQL = null;
  }

  async initialize() {
    if (this.isInitialized) return this.db;

    try {
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: file => `/${file}`
      });

      // Try to load existing database from storage
      const savedDb = await this.loadDatabase();

      if (savedDb) {
        this.db = new this.SQL.Database(savedDb);
        console.log('[SQLite] Database loaded from storage');
      } else {
        this.db = new this.SQL.Database();
        console.log('[SQLite] New database created');
      }

      // Run migrations if needed
      await this.runMigrations();

      this.isInitialized = true;
      console.log('[SQLite] Database initialized successfully');

      return this.db;
    } catch (error) {
      console.error('[SQLite] Failed to initialize:', error);
      throw error;
    }
  }

  async loadDatabase() {
    try {
      // Try Capacitor Filesystem first (mobile)
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const file = await Filesystem.readFile({
          path: DB_NAME,
          directory: Directory.Database,
          encoding: 'utf8'
        }).catch(() => null);

        if (file && file.data) {
          // Convert base64 to Uint8Array
          const binaryString = atob(file.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        }
      }

      // Fallback to localStorage (web)
      const savedDb = localStorage.getItem(`sqlite_${DB_NAME}`);
      if (savedDb) {
        const binaryString = atob(savedDb);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }

      return null;
    } catch (error) {
      console.warn('[SQLite] Could not load saved database:', error);
      return null;
    }
  }

  async saveDatabase() {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const base64 = btoa(String.fromCharCode.apply(null, data));

      // Try Capacitor Filesystem first (mobile)
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        await Filesystem.writeFile({
          path: DB_NAME,
          data: base64,
          directory: Directory.Database,
          encoding: 'utf8'
        });
      }

      // Also save to localStorage as backup
      localStorage.setItem(`sqlite_${DB_NAME}`, base64);
      console.log('[SQLite] Database saved');
    } catch (error) {
      console.error('[SQLite] Failed to save database:', error);
      // Fallback: save to localStorage only
      const data = this.db.export();
      const base64 = btoa(String.fromCharCode.apply(null, data));
      localStorage.setItem(`sqlite_${DB_NAME}`, base64);
    }
  }

  async runMigrations() {
    // Check current version
    const versionResult = this.db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='db_version'"
    );

    if (versionResult.length === 0) {
      // Fresh install - create schema
      await this.createSchema();
    } else {
      // Check version and run migrations if needed
      const currentVersion = this.db.exec("SELECT MAX(version) as v FROM db_version");
      const version = currentVersion[0]?.values[0]?.[0] || 0;

      if (version < DB_VERSION) {
        console.log(`[SQLite] Running migrations from v${version} to v${DB_VERSION}`);
        // Add migration logic here for future versions
      }
    }
  }

  async createSchema() {
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          university_id TEXT,
          first_name TEXT,
          last_name TEXT,
          middle_name TEXT,
          suffix TEXT,
          role TEXT,
          department TEXT,
          program TEXT,
          section TEXT,
          vaccination_status TEXT,
          vaccination_history TEXT,
          emergency_contact TEXT,
          is_profile_setup INTEGER DEFAULT 0,
          created_at TEXT,
          updated_at TEXT,
          is_synced INTEGER DEFAULT 1,
          last_synced_at TEXT
      );

      -- Appointments table
      CREATE TABLE IF NOT EXISTS appointments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          patient_name TEXT,
          patient_email TEXT,
          patient_university_id TEXT,
          service_type TEXT,
          appointment_date TEXT,
          appointment_time TEXT,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_by TEXT,
          created_at TEXT,
          updated_at TEXT,
          assigned_to TEXT,
          is_archived INTEGER DEFAULT 0,
          deleted_by TEXT,
          is_synced INTEGER DEFAULT 1,
          last_synced_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Records table
      CREATE TABLE IF NOT EXISTS records (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          record_type TEXT,
          title TEXT,
          description TEXT,
          file_url TEXT,
          file_name TEXT,
          file_type TEXT,
          file_size INTEGER,
          created_at TEXT,
          created_by TEXT,
          updated_at TEXT,
          updated_by TEXT,
          is_archived INTEGER DEFAULT 0,
          is_synced INTEGER DEFAULT 1,
          last_synced_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Consultations table
      CREATE TABLE IF NOT EXISTS consultations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          appointment_id TEXT,
          consultation_type TEXT,
          chief_complaint TEXT,
          diagnosis TEXT,
          treatment TEXT,
          prescriptions TEXT,
          notes TEXT,
          created_at TEXT,
          created_by TEXT,
          updated_at TEXT,
          updated_by TEXT,
          is_synced INTEGER DEFAULT 1,
          last_synced_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Announcements table
      CREATE TABLE IF NOT EXISTS announcements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT,
          priority TEXT DEFAULT 'normal',
          target_roles TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT,
          created_by TEXT,
          expires_at TEXT,
          is_synced INTEGER DEFAULT 1,
          last_synced_at TEXT
      );

      -- Session table
      CREATE TABLE IF NOT EXISTS session (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          access_token TEXT NOT NULL,
          refresh_token TEXT,
          token_expires_at TEXT,
          session_started_at TEXT NOT NULL,
          last_active_at TEXT NOT NULL,
          is_valid INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Sync queue table
      CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          data TEXT,
          created_at TEXT NOT NULL,
          retry_count INTEGER DEFAULT 0,
          last_error TEXT
      );

      -- DB version table
      CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
      CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
    `;

    // Execute schema creation
    this.db.run(schema);

    // Insert initial version
    this.db.run("INSERT INTO db_version (version, applied_at) VALUES (?, datetime('now'))", [DB_VERSION]);

    console.log('[SQLite] Schema created');
    await this.saveDatabase();
  }

  // Generic query methods
  execute(sql, params = []) {
    try {
      this.db.run(sql, params);
      return { success: true };
    } catch (error) {
      console.error('[SQLite] Execute error:', error);
      return { success: false, error: error.message };
    }
  }

  query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      stmt.bind(params);

      const results = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(row);
      }
      stmt.free();

      return { success: true, data: results };
    } catch (error) {
      console.error('[SQLite] Query error:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  queryOne(sql, params = []) {
    const result = this.query(sql, params);
    if (result.success && result.data.length > 0) {
      return { success: true, data: result.data[0] };
    }
    return { success: false, data: null };
  }

  // Auto-save after write operations
  async executeAndSave(sql, params = []) {
    const result = this.execute(sql, params);
    if (result.success) {
      await this.saveDatabase();
    }
    return result;
  }

  async close() {
    if (this.db) {
      await this.saveDatabase();
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const sqliteService = new SQLiteService();
export default sqliteService;
```

***

## Phase 4: Offline Authentication with Session Management

### Step 4.1: Create Session Manager

Create `frontend/src/services/session-manager.js`:

```JavaScript
// frontend/src/services/session-manager.js
import { sqliteService } from './sqlite.service';
import { supabase } from '../supabase';

const SESSION_DURATION_MS = 48 * 60 * 60 * 1000; // 48 hours
const SESSION_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

class SessionManager {
  constructor() {
    this.checkInterval = null;
    this.sessionCheckCallback = null;
  }

  async initialize() {
    await sqliteService.initialize();
    await this.cleanupExpiredSessions();
    this.startSessionMonitoring();
  }

  startSessionMonitoring() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkSessionValidity();
    }, SESSION_CHECK_INTERVAL);
  }

  stopSessionMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async saveSession(user, tokens) {
    const now = new Date().toISOString();
    const expiresAt = tokens.expires_at ||
      new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    // Delete any existing sessions for this user
    sqliteService.execute(
      "DELETE FROM session WHERE user_id = ?",
      [user.id]
    );

    // Insert new session
    sqliteService.executeAndSave(
      `INSERT INTO session (
        user_id, access_token, refresh_token, token_expires_at,
        session_started_at, last_active_at, is_valid
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        user.id,
        tokens.access_token,
        tokens.refresh_token || '',
        expiresAt,
        now,
        now
      ]
    );

    // Also save user data
    await this.saveUserData(user);

    console.log('[Session] Session saved for 48 hours');
  }

  async saveUserData(user) {
    sqliteService.executeAndSave(
      `INSERT OR REPLACE INTO users (
        id, email, university_id, first_name, last_name, middle_name,
        suffix, role, department, program, section, vaccination_status,
        vaccination_history, emergency_contact, is_profile_setup,
        created_at, updated_at, is_synced, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [
        user.id,
        user.email,
        user.universityId || user.university_id || '',
        user.firstName || user.first_name || '',
        user.lastName || user.last_name || '',
        user.middleName || user.middle_name || '',
        user.suffix || '',
        user.role || 'student',
        user.department || '',
        user.program || '',
        user.section || '',
        user.vaccinationStatus || user.vaccination_status || '',
        user.vaccinationHistory || user.vaccination_history || '',
        user.emergencyContact || user.emergency_contact || '',
        user.isProfileSetup || user.is_profile_setup || false,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    );
  }

  async getValidSession() {
    const result = sqliteService.queryOne(
      `SELECT * FROM session WHERE is_valid = 1 ORDER BY last_active_at DESC LIMIT 1`
    );

    if (!result.success || !result.data) {
      return null;
    }

    const session = result.data;
    const now = new Date();
    const sessionStarted = new Date(session.session_started_at);
    const lastActive = new Date(session.last_active_at);
    const expiresAt = session.token_expires_at ? new Date(session.token_expires_at) :
      new Date(lastActive.getTime() + SESSION_DURATION_MS);

    // Check if session is still valid
    const timeSinceStart = now - sessionStarted;
    const timeSinceActive = now - lastActive;
    const isExpired = timeSinceStart > SESSION_DURATION_MS ||
      expiresAt < now ||
      timeSinceActive > (2 * 60 * 60 * 1000); // 2 hours inactivity

    if (isExpired) {
      await this.invalidateSession(session.user_id);
      return null;
    }

    // Update last active timestamp
    sqliteService.execute(
      "UPDATE session SET last_active_at = ? WHERE user_id = ?",
      [now.toISOString(), session.user_id]
    );
    await sqliteService.saveDatabase();

    return session;
  }

  async getStoredUser() {
    const session = await this.getValidSession();
    if (!session) return null;

    const result = sqliteService.queryOne(
      "SELECT * FROM users WHERE id = ?",
      [session.user_id]
    );

    return result.success ? result.data : null;
  }

  async restoreSession() {
    const session = await this.getValidSession();
    if (!session) {
      console.log('[Session] No valid session found');
      return { success: false, reason: 'no_session' };
    }

    // Try to restore Supabase session
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    if (error) {
      console.warn('[Session] Could not restore Supabase session:', error.message);
      // Still return local session for offline access
    }

    const user = await this.getStoredUser();

    return {
      success: true,
      user: user,
      session: session
    };
  }

  async invalidateSession(userId) {
    sqliteService.execute(
      "UPDATE session SET is_valid = 0 WHERE user_id = ?",
      [userId]
    );
    await sqliteService.saveDatabase();
  }

  async logout() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      await this.invalidateSession(user.id);
    }

    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Sign out from Supabase
    await supabase.auth.signOut();
  }

  async cleanupExpiredSessions() {
    const result = sqliteService.execute(
      `UPDATE session SET is_valid = 0
       WHERE datetime(session_started_at) < datetime('now', '-48 hours')
       OR datetime(token_expires_at) < datetime('now')`
    );

    if (result.success) {
      await sqliteService.saveDatabase();
    }
  }

  async checkSessionValidity() {
    const session = await this.getValidSession();

    if (this.sessionCheckCallback) {
      this.sessionCheckCallback(session);
    }

    return session !== null;
  }

  onSessionCheck(callback) {
    this.sessionCheckCallback = callback;
  }

  getSessionTimeRemaining() {
    return new Promise(async (resolve) => {
      const session = await this.getValidSession();
      if (!session) {
        resolve(0);
        return;
      }

      const sessionStarted = new Date(session.session_started_at);
      const expiresAt = new Date(sessionStarted.getTime() + SESSION_DURATION_MS);
      const remaining = expiresAt - new Date();

      resolve(Math.max(0, remaining));
    });
  }
}

export const sessionManager = new SessionManager();
export default sessionManager;
```

### Step 4.2: Update Auth Service

Modify `frontend/src/services/auth.service.js` to use the session manager:

```JavaScript
// Updated auth.service.js with offline support
import { supabase } from '../supabase';
import { sessionManager } from './session-manager';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = async () => {
  // Try to get session from Supabase first
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error fetching Supabase session:", error.message);
  }

  // Fallback to stored session if no Supabase session
  const token = session?.access_token || localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const register = async (formData) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return data;
};

const login = async ({ email, password }) => {
  // 1. Authenticate via your custom backend first
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  console.log('Login response:', res.status, data);
  if (!res.ok) throw new Error(data.message);

  if (data.success && data.data) {
    const user = data.data;

    // Safely extract names supporting both Supabase snake_case and old camelCase
    const firstName = user.first_name || user.firstName || '';
    const lastName = user.last_name || user.lastName || '';
    const middleName = user.middle_name || user.middleName || '';
    const suffix = user.suffix || '';
    const name = user.name || `${firstName} ${lastName}`.trim();

    // 2. Establish the Supabase session on the frontend
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: user.token || user.access_token,
      refresh_token: user.refreshToken || user.refresh_token
    });

    if (sessionError) {
      console.error("Failed to set Supabase session on frontend:", sessionError.message);
    }

    // 3. Save purely UI-related user data to localStorage
    const userData = {
      uid:                user.id || user.uid,
      name:               name,
      firstName:          firstName,
      lastName:           lastName,
      middleName:         middleName,
      suffix:             suffix,
      role:               user.role,
      email:              user.email,
      universityId:       user.university_id || user.universityId || '',
      department:         user.department || user.dept || '',
      program:            user.program || user.classification || '',
      section:            user.section || user.year_level || '',
      vaccinationStatus:  user.vaccination_status || user.vaccinationStatus,
      vaccinationHistory: user.vaccination_history || user.vaccinationHistory,
      emergencyContact:   user.emergency_contact || user.emergencyContact,
      isProfileSetup:     user.is_profile_setup || user.isProfileSetup || false,
    };

    localStorage.setItem("user", JSON.stringify(userData));

    // 4. Save session for offline access (48-hour persistence)
    await sessionManager.saveSession(userData, {
      access_token: user.token || user.access_token,
      refresh_token: user.refreshToken || user.refresh_token,
      expires_at: user.expires_at
    });
  }
  return data;
};

const getProfile = async () => {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/profile`, {
    headers: headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch profile");

  // Update stored user data
  if (data.data) {
    await sessionManager.saveUserData(data.data);
  }

  return data.data;
};

const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (userStr) return JSON.parse(userStr);
  return null;
};

// New method: Get user from offline storage
const getOfflineUser = async () => {
  await sessionManager.initialize();
  return await sessionManager.getStoredUser();
};

// New method: Try to restore session from offline storage
const restoreOfflineSession = async () => {
  await sessionManager.initialize();
  return await sessionManager.restoreSession();
};

const logout = async () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  // Clear offline session
  await sessionManager.logout();

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out of Supabase:", error.message);
  }
};

const checkIdExists = async (universityId) => {
  try {
    const response = await fetch(`${API_URL}/user/check-id?universityId=${universityId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error("Error checking ID:", error);
    throw new Error("Failed to verify University ID with the server.");
  }
};

const forgotPassword = async (email) => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to send reset email");
  return data;
};

export default {
  register,
  login,
  getProfile,
  getCurrentUser,
  getOfflineUser,
  restoreOfflineSession,
  logout,
  checkIdExists,
  getAuthHeaders,
  forgotPassword,
};
```

***

## Phase 5: Offline Appointments Storage

### Step 5.1: Create Offline Appointments Service

Create `frontend/src/services/offline-appointments.service.js`:

```JavaScript
// frontend/src/services/offline-appointments.service.js
import { sqliteService } from './sqlite.service';
import { isOnline } from './network-status.service';

const TABLE_NAME = 'appointments';

class OfflineAppointmentsService {
  // Initialize with data from API
  async syncFromServer(appointments) {
    if (!appointments || !Array.isArray(appointments)) return;

    for (const apt of appointments) {
      await this.saveAppointment(apt, true); // true = mark as synced
    }
  }

  async saveAppointment(appointment, isSynced = false) {
    const now = new Date().toISOString();

    sqliteService.executeAndSave(
      `INSERT OR REPLACE INTO appointments (
        id, user_id, patient_name, patient_email, patient_university_id,
        service_type, appointment_date, appointment_time, status, notes,
        created_by, created_at, updated_at, assigned_to, is_archived, deleted_by,
        is_synced, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointment.id,
        appointment.user_id || appointment.userId || '',
        appointment.patient_name || appointment.patientName || '',
        appointment.patient_email || appointment.patientEmail || '',
        appointment.patient_university_id || appointment.patientUniversityId || '',
        appointment.service_type || appointment.serviceType || '',
        appointment.appointment_date || appointment.appointmentDate || '',
        appointment.appointment_time || appointment.appointmentTime || '',
        appointment.status || 'pending',
        appointment.notes || '',
        appointment.created_by || appointment.createdBy || '',
        appointment.created_at || appointment.createdAt || now,
        appointment.updated_at || appointment.updatedAt || now,
        appointment.assigned_to || appointment.assignedTo || '',
        appointment.is_archived || appointment.isArchived || 0,
        appointment.deleted_by || appointment.deletedBy || '',
        isSynced ? 1 : 0,
        now
      ]
    );
  }

  async getAllAppointments() {
    const result = sqliteService.query(
      `SELECT * FROM appointments
       WHERE is_archived = 0
       ORDER BY appointment_date ASC, appointment_time ASC`
    );
    return result.success ? result.data : [];
  }

  async getAppointmentsByDate(date) {
    const result = sqliteService.query(
      `SELECT * FROM appointments
       WHERE appointment_date = ? AND is_archived = 0
       ORDER BY appointment_time ASC`,
      [date]
    );
    return result.success ? result.data : [];
  }

  async getAppointmentsByUserId(userId) {
    const result = sqliteService.query(
      `SELECT * FROM appointments
       WHERE user_id = ? AND is_archived = 0
       ORDER BY appointment_date ASC, appointment_time ASC`,
      [userId]
    );
    return result.success ? result.data : [];
  }

  async getUpcomingAppointments(userId, limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const result = sqliteService.query(
      `SELECT * FROM appointments
       WHERE user_id = ?
       AND is_archived = 0
       AND (appointment_date > ? OR (appointment_date = ? AND appointment_time > ?))
       ORDER BY appointment_date ASC, appointment_time ASC
       LIMIT ?`,
      [userId, today, today, now.substring(11, 16), limit]
    );
    return result.success ? result.data : [];
  }

  async getAppointmentById(id) {
    const result = sqliteService.queryOne(
      "SELECT * FROM appointments WHERE id = ?",
      [id]
    );
    return result.success ? result.data : null;
  }

  async createAppointment(appointment) {
    // Save locally first
    await this.saveAppointment(appointment, false); // Not synced yet

    // Add to sync queue
    await this.addToSyncQueue('INSERT', appointment.id, appointment);

    // Try to sync immediately if online
    if (await isOnline()) {
      await this.syncPendingChanges();
    }
  }

  async updateAppointment(id, updates) {
    const existing = await this.getAppointmentById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };

    // Update locally
    await this.saveAppointment(updated, false);

    // Add to sync queue
    await this.addToSyncQueue('UPDATE', id, updated);

    if (await isOnline()) {
      await this.syncPendingChanges();
    }

    return updated;
  }

  async deleteAppointment(id) {
    // Mark as archived locally
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const name = localStorage.getItem('name') || '';

    sqliteService.executeAndSave(
      `UPDATE appointments SET is_archived = 1, deleted_by = ?, updated_at = ?, is_synced = 0 WHERE id = ?`,
      [name || user.email || 'User', new Date().toISOString(), id]
    );

    // Add to sync queue
    await this.addToSyncQueue('DELETE', id, { id });

    if (await isOnline()) {
      await this.syncPendingChanges();
    }
  }

  async addToSyncQueue(operation, recordId, data) {
    sqliteService.executeAndSave(
      `INSERT INTO sync_queue (table_name, record_id, operation, data, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [TABLE_NAME, recordId, operation, JSON.stringify(data), new Date().toISOString()]
    );
  }

  async getUnsyncedChanges() {
    const result = sqliteService.query(
      "SELECT * FROM sync_queue WHERE table_name = ? ORDER BY created_at ASC",
      [TABLE_NAME]
    );
    return result.success ? result.data : [];
  }

  async markAsSynced(recordId) {
    sqliteService.executeAndSave(
      "UPDATE appointments SET is_synced = 1, last_synced_at = ? WHERE id = ?",
      [new Date().toISOString(), recordId]
    );
  }

  async removeFromSyncQueue(id) {
    sqliteService.executeAndSave("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  async syncPendingChanges() {
    if (!await isOnline()) return;

    const changes = await this.getUnsyncedChanges();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");

    for (const change of changes) {
      try {
        const endpoint = `${API_URL}/appointments`;
        let method = 'POST';
        let url = endpoint;

        if (change.operation === 'UPDATE') {
          method = 'PUT';
          url = `${endpoint}/${change.record_id}`;
        } else if (change.operation === 'DELETE') {
          method = 'DELETE';
          url = `${endpoint}/${change.record_id}`;
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: change.operation !== 'DELETE' ? change.data : undefined
        });

        if (res.ok) {
          await this.markAsSynced(change.record_id);
          await this.removeFromSyncQueue(change.id);
          console.log(`[Offline Appointments] Synced ${change.operation} for ${change.record_id}`);
        }
      } catch (error) {
        console.error(`[Offline Appointments] Failed to sync ${change.id}:`, error);
        sqliteService.execute(
          "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?",
          [error.message, change.id]
        );
        await sqliteService.saveDatabase();
      }
    }
  }
}

export const offlineAppointments = new OfflineAppointmentsService();
export default offlineAppointments;
```

***

## Phase 6: Offline Records Storage

### Step 6.1: Create Offline Records Service

Create `frontend/src/services/offline-records.service.js`:

```JavaScript
// frontend/src/services/offline-records.service.js
import { sqliteService } from './sqlite.service';
import { isOnline } from './network-status.service';

const TABLE_NAME = 'records';

class OfflineRecordsService {
  async syncFromServer(records) {
    if (!records || !Array.isArray(records)) return;

    for (const record of records) {
      await this.saveRecord(record, true);
    }
  }

  async saveRecord(record, isSynced = false) {
    const now = new Date().toISOString();

    sqliteService.executeAndSave(
      `INSERT OR REPLACE INTO records (
        id, user_id, record_type, title, description, file_url, file_name,
        file_type, file_size, created_at, created_by, updated_at, updated_by,
        is_archived, is_synced, last_synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.user_id || record.userId || '',
        record.record_type || record.recordType || '',
        record.title || '',
        record.description || '',
        record.file_url || record.fileUrl || '',
        record.file_name || record.fileName || '',
        record.file_type || record.fileType || '',
        record.file_size || record.fileSize || 0,
        record.created_at || record.createdAt || now,
        record.created_by || record.createdBy || '',
        record.updated_at || record.updatedAt || now,
        record.updated_by || record.updatedBy || '',
        record.is_archived || record.isArchived || 0,
        isSynced ? 1 : 0,
        now
      ]
    );
  }

  async getAllRecords(userId) {
    const result = sqliteService.query(
      `SELECT * FROM records
       WHERE user_id = ? AND is_archived = 0
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.success ? result.data : [];
  }

  async getRecordById(id) {
    const result = sqliteService.queryOne(
      "SELECT * FROM records WHERE id = ?",
      [id]
    );
    return result.success ? result.data : null;
  }

  async getRecordsByType(userId, recordType) {
    const result = sqliteService.query(
      `SELECT * FROM records
       WHERE user_id = ? AND record_type = ? AND is_archived = 0
       ORDER BY created_at DESC`,
      [userId, recordType]
    );
    return result.success ? result.data : [];
  }

  async createRecord(record) {
    await this.saveRecord(record, false);
    await this.addToSyncQueue('INSERT', record.id, record);

    if (await isOnline()) {
      await this.syncPendingChanges();
    }
  }

  async updateRecord(id, updates) {
    const existing = await this.getRecordById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await this.saveRecord(updated, false);
    await this.addToSyncQueue('UPDATE', id, updated);

    if (await isOnline()) {
      await this.syncPendingChanges();
    }

    return updated;
  }

  async deleteRecord(id) {
    sqliteService.executeAndSave(
      "UPDATE records SET is_archived = 1, updated_at = ?, is_synced = 0 WHERE id = ?",
      [new Date().toISOString(), id]
    );
    await this.addToSyncQueue('DELETE', id, { id });

    if (await isOnline()) {
      await this.syncPendingChanges();
    }
  }

  async addToSyncQueue(operation, recordId, data) {
    sqliteService.executeAndSave(
      `INSERT INTO sync_queue (table_name, record_id, operation, data, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [TABLE_NAME, recordId, operation, JSON.stringify(data), new Date().toISOString()]
    );
  }

  async getUnsyncedChanges() {
    const result = sqliteService.query(
      "SELECT * FROM sync_queue WHERE table_name = ? ORDER BY created_at ASC",
      [TABLE_NAME]
    );
    return result.success ? result.data : [];
  }

  async markAsSynced(recordId) {
    sqliteService.executeAndSave(
      "UPDATE records SET is_synced = 1, last_synced_at = ? WHERE id = ?",
      [new Date().toISOString(), recordId]
    );
  }

  async removeFromSyncQueue(id) {
    sqliteService.executeAndSave("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  async syncPendingChanges() {
    if (!await isOnline()) return;

    const changes = await this.getUnsyncedChanges();
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const token = localStorage.getItem("token");

    for (const change of changes) {
      try {
        const endpoint = `${API_URL}/records`;
        let method = 'POST';
        let url = endpoint;

        if (change.operation === 'UPDATE') {
          method = 'PUT';
          url = `${endpoint}/${change.record_id}`;
        } else if (change.operation === 'DELETE') {
          method = 'DELETE';
          url = `${endpoint}/${change.record_id}`;
        }

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: change.operation !== 'DELETE' ? change.data : undefined
        });

        if (res.ok) {
          await this.markAsSynced(change.record_id);
          await this.removeFromSyncQueue(change.id);
        }
      } catch (error) {
        console.error(`[Offline Records] Failed to sync ${change.id}:`, error);
        sqliteService.execute(
          "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?",
          [error.message, change.id]
        );
        await sqliteService.saveDatabase();
      }
    }
  }
}

export const offlineRecords = new OfflineRecordsService();
export default offlineRecords;
```

***

## Phase 7: Sync Mechanism

### Step 7.1: Create Network Status Service

Create `frontend/src/services/network-status.service.js`:

```JavaScript
// frontend/src/services/network-status.service.js

class NetworkStatusService {
  constructor() {
    this.isConnected = true;
    this.listeners = [];
    this.checkInterval = null;
  }

  async initialize() {
    // Set up online/offline listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      // Set initial status
      this.isConnected = navigator.onLine;

      // Start periodic connectivity check
      this.startConnectivityCheck();
    }
  }

  startConnectivityCheck() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      const wasOnline = this.isConnected;
      const nowOnline = await this.checkConnectivity();

      if (wasOnline !== nowOnline) {
        this.isConnected = nowOnline;
        this.notifyListeners();
      }
    }, 30000); // Check every 30 seconds
  }

  async checkConnectivity() {
    try {
      // Try to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_URL}/health`, {
        method: 'HEAD',
        signal: controller.signal
      }).catch(() => ({ ok: false }));

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  handleOnline() {
    console.log('[Network] Back online!');
    this.isConnected = true;
    this.notifyListeners();
    this.triggerSync();
  }

  handleOffline() {
    console.log('[Network] Gone offline');
    this.isConnected = false;
    this.notifyListeners();
  }

  async isOnline() {
    return this.isConnected && await this.checkConnectivity();
  }

  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.isConnected));
  }

  async triggerSync() {
    // Import sync services and trigger sync
    try {
      const { offlineAppointments } = await import('./offline-appointments.service');
      const { offlineRecords } = await import('./offline-records.service');
      const { offlineAnnouncements } = await import('./offline-announcements.service').catch(() => ({ default: null }));

      await offlineAppointments.syncPendingChanges();
      await offlineRecords.syncPendingChanges();

      if (offlineAnnouncements) {
        await offlineAnnouncements.syncPendingChanges();
      }

      console.log('[Network] Sync triggered on reconnection');
    } catch (error) {
      console.error('[Network] Sync failed:', error);
    }
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleOnline());
      window.removeEventListener('offline', () => this.handleOffline());
    }
  }
}

export const networkStatus = new NetworkStatusService();
export const isOnline = () => networkStatus.isOnline();
export default networkStatus;
```

### Step 7.2: Create Sync Manager

Create `frontend/src/services/sync-manager.js`:

```JavaScript
// frontend/src/services/sync-manager.js
import { networkStatus, isOnline } from './network-status.service';
import { sqliteService } from './sqlite.service';
import { offlineAppointments } from './offline-appointments.service';
import { offlineRecords } from './offline-records.service';
import { supabase } from '../supabase';

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

class SyncManager {
  constructor() {
    this.syncInterval = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.listeners = [];
  }

  async initialize() {
    await networkStatus.initialize();

    // Listen for network status changes
    networkStatus.onStatusChange(async (online) => {
      if (online) {
        console.log('[SyncManager] Network restored, starting sync...');
        await this.syncAll();
      }
    });

    // Start auto-sync
    this.startAutoSync();
  }

  startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (await isOnline() && !this.isSyncing) {
        await this.syncAll();
      }
    }, AUTO_SYNC_INTERVAL);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll() {
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('started');

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      // 1. Push pending local changes
      await offlineAppointments.syncPendingChanges();
      await offlineRecords.syncPendingChanges();

      // 2. Pull fresh data from server if online
      if (await isOnline() && token) {
        // Sync appointments
        const aptRes = await fetch(`${API_URL}/appointments`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (aptRes.ok) {
          const aptData = await aptRes.json();
          if (aptData.data) {
            await offlineAppointments.syncFromServer(aptData.data);
          }
        }

        // Sync records
        const recRes = await fetch(`${API_URL}/records`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (recRes.ok) {
          const recData = await recRes.json();
          if (recData.data) {
            await offlineRecords.syncFromServer(recData.data);
          }
        }

        // Sync announcements (for all users)
        const annRes = await fetch(`${API_URL}/announcements/active`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (annRes.ok) {
          const annData = await annRes.json();
          if (annData.data) {
            // Sync announcements if service exists
            try {
              const { offlineAnnouncements } = await import('./offline-announcements.service');
              await offlineAnnouncements.syncFromServer(annData.data);
            } catch (e) {
              // Service might not exist yet
            }
          }
        }
      }

      this.lastSyncTime = new Date();
      localStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());

      console.log('[SyncManager] Full sync completed');
      this.notifyListeners('completed');

    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      this.notifyListeners('error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncAppointments() {
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    if (!(await isOnline()) || !token) return;

    const res = await fetch(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        await offlineAppointments.syncFromServer(data.data);
      }
    }
  }

  async syncRecords() {
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    if (!(await isOnline()) || !token) return;

    const res = await fetch(`${API_URL}/records`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        await offlineRecords.syncFromServer(data.data);
      }
    }
  }

  getLastSyncTime() {
    const lastSync = localStorage.getItem('lastSyncTime');
    return lastSync ? new Date(lastSync) : null;
  }

  isCurrentlySyncing() {
    return this.isSyncing;
  }

  onSyncStatusChange(callback) {
    this.listeners.push(callback);
  }

  removeSyncListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(status, error = null) {
    this.listeners.forEach(callback => callback(status, error));
  }
}

export const syncManager = new SyncManager();
export default syncManager;
```

***

## Phase 8: UI Integration

### Step 8.1: Update App.jsx for Offline Support

Update `frontend/src/App.jsx` to handle offline sessions:

```JavaScript
// frontend/src/App.jsx - Updated with offline support
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Loading from './components/loading.jsx';
import authService from './services/auth.service.js';
import { sessionManager } from './services/session-manager.js';
import { syncManager } from './services/sync-manager.js';
import { networkStatus } from './services/network-status.service.js';
import './index.css';

// ... (keep existing imports and code)

// ── Protected route guard ─────────────────────────────────────────────────────
const ProtectedRoute = ({ children, adminOnly = false, allowedRoles = [] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Initialize session manager
        await sessionManager.initialize();

        // Check for valid session (local or Supabase)
        const session = await sessionManager.getValidSession();

        if (session) {
          // Try to restore Supabase session
          await sessionManager.restoreSession();
        }

        const token = localStorage.getItem('token');
        const rawUser = localStorage.getItem('user');

        setHasSession(!!(token && rawUser));
      } catch (error) {
        console.error('Session check error:', error);
        setHasSession(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#466460]"></div>
      </div>
    );
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  const token = localStorage.getItem('token');
  const rawUser = localStorage.getItem('user');
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (user.isProfileSetup === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // ... (keep existing role checking code)

  return children;
};

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize network status
        await networkStatus.initialize();

        // Initialize sync manager (will also initialize sqlite)
        await syncManager.initialize();

        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setIsInitialized(true); // Continue anyway
      }
    };

    initializeApp();

    // Listen for network changes
    networkStatus.onStatusChange((online) => {
      setIsOnline(online);
    });

    return () => {
      syncManager.stopAutoSync();
      networkStatus.stop();
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#466460]"></div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <AppointmentProvider>
        {/* Offline indicator */}
        {!isOnline && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 text-center py-1 text-sm z-50">
            📴 You're offline. Some features may be unavailable.
          </div>
        )}

        <RouteChangeHandler />
        <GlobalLoading />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ... (keep existing routes) */}
          </Routes>
        </Suspense>
      </AppointmentProvider>
    </LoadingProvider>
  );
}

export default App;
```

### Step 8.2: Update Login Form for Offline Sessions

Update `frontend/src/features/LoginForm.jsx`:

```JavaScript
// Updated LoginForm.jsx with offline session restoration
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/auth.service.js';
import { sessionManager } from '../services/session-manager.js';
import { syncManager } from '../services/sync-manager.js';

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        await sessionManager.initialize();

        // Try to restore session from SQLite
        const result = await authService.restoreOfflineSession();

        if (result.success && result.user) {
          // Session restored - navigate based on role
          const user = result.user;
          const role = user.role?.toLowerCase() || '';
          const isStaffRole = ['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role);

          // Trigger initial sync
          if (await navigator.onLine) {
            syncManager.syncAll();
          }

          navigate(isStaffRole ? '/dashboard' : '/student/meditrack');
          return;
        }

        // Get remaining session time for display
        const time = await sessionManager.getSessionTimeRemaining();
        if (time > 0) {
          setRemainingTime(time);
        }
      } catch (error) {
        console.error('Session restore error:', error);
      } finally {
        setIsRestoringSession(false);
      }
    };

    tryRestoreSession();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login({ email, password });

      if (result.success) {
        // Get user from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const role = user.role?.toLowerCase() || '';
        const isStaffRole = ['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role);

        // Trigger initial sync
        await syncManager.syncAll();

        navigate(isStaffRole ? '/dashboard' : '/student/meditrack');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineLogin = () => {
    // Allow login with stored session even if offline
    navigate('/student/meditrack');
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#466460] mx-auto mb-4"></div>
          <p className="text-gray-600">Restoring your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* ... existing form UI ... */}

        {/* Offline session indicator */}
        {remainingTime && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 text-sm">
              ✓ You're logged in. Session expires in{' '}
              {Math.round(remainingTime / (1000 * 60 * 60))} hours.
            </p>
            <button
              onClick={handleOfflineLogin}
              className="mt-2 text-green-700 text-sm hover:underline"
            >
              Continue to app →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginForm;
```

### Step 8.3: Update User Appointments Page

Update `frontend/src/features/users/Appointment-users.jsx` to use offline data:

```JavaScript
// Updated Appointment-users.jsx with offline support
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentsService from '../../services/appointments.service';
import { offlineAppointments } from '../../services/offline-appointments.service';
import { isOnline } from '../../services/network-status.service';
import { syncManager } from '../../services/sync-manager.js';

const AppointmentUsers = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError('');

    const online = await isOnline();
    setIsOffline(!online);

    try {
      if (online) {
        // Try online first
        const data = await appointmentsService.getAllAppointments();
        setAppointments(data || []);

        // Also sync to offline storage
        await offlineAppointments.syncFromServer(data || []);

        const lastSync = syncManager.getLastSyncTime();
        if (lastSync) setLastSynced(lastSync);
      } else {
        // Use offline data
        console.log('[Appointments] Loading from offline storage...');
        const offlineData = await offlineAppointments.getAppointmentsByUserId(user.uid || user.id);
        setAppointments(offlineData || []);
      }
    } catch (err) {
      console.error('Error loading appointments:', err);

      // Fallback to offline data on error
      try {
        const offlineData = await offlineAppointments.getAppointmentsByUserId(user.uid || user.id);
        setAppointments(offlineData || []);
        setIsOffline(true);
      } catch (offlineErr) {
        setError('Failed to load appointments');
      }
    } finally {
      setLoading(false);
    }
  }, [user.uid, user.id]);

  useEffect(() => {
    loadAppointments();

    // Listen for network changes
    const handleOnline = async () => {
      setIsOffline(false);
      await loadAppointments();
    };

    const handleOffline = () => {
      setIsOffline(true);
      loadAppointments();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadAppointments]);

  const handleManualSync = async () => {
    setLoading(true);
    await syncManager.syncAll();
    await loadAppointments();
  };

  return (
    <div className="p-4">
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg mb-4 flex items-center">
          <span className="mr-2">📴</span>
          <span>Offline Mode - Showing cached appointments</span>
        </div>
      )}

      {/* Last synced info */}
      {lastSynced && (
        <div className="text-xs text-gray-500 mb-2">
          Last synced: {lastSynced.toLocaleString()}
        </div>
      )}

      {/* Manual sync button */}
      {!isOffline && (
        <button
          onClick={handleManualSync}
          className="text-sm text-blue-600 hover:underline mb-4"
          disabled={loading}
        >
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      )}

      {/* Appointments list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#466460] mx-auto"></div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <AppointmentCard key={apt.id} appointment={apt} />
          ))}
        </div>
      )}
    </div>
  );
};

// Appointment card component
const AppointmentCard = ({ appointment }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{appointment.service_type || appointment.serviceType}</h3>
        <span className={`px-2 py-1 rounded-full text-xs ${statusColors[appointment.status] || 'bg-gray-100'}`}>
          {appointment.status}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>📅 {appointment.appointment_date} at {appointment.appointment_time}</p>
        {appointment.notes && <p>📝 {appointment.notes}</p>}
      </div>
    </div>
  );
};

export default AppointmentUsers;
```

***

## Testing Checklist

### Phase 1: Setup

* [ ] SQL.js installed correctly
* [ ] WASM file accessible in public folder
* [ ] Vite configuration updated

### Phase 2: Database

* [ ] SQLite database created successfully
* [ ] Schema tables created
* [ ] Indexes created for performance

### Phase 3: Services

* [ ] SQLite service initializes without errors
* [ ] Database saves to localStorage/Capacitor Filesystem
* [ ] Database loads on app restart

### Phase 4: Authentication

* [ ] Login saves session to SQLite
* [ ] Session persists after app restart
* [ ] 48-hour session expiry works
* [ ] Logout clears session

### Phase 5: Appointments

* [ ] Appointments sync from server to offline storage
* [ ] Appointments display when offline
* [ ] New appointments save locally when offline
* [ ] Pending changes sync when back online

### Phase 6: Records

* [ ] Records sync from server to offline storage
* [ ] Records display when offline
* [ ] Offline changes sync when back online

### Phase 7: Sync

* [ ] Online/offline detection works
* [ ] Auto-sync triggers on reconnection
* [ ] Sync status visible to user

### Phase 8: UI

* [ ] Login form handles offline session
* [ ] Offline indicator shows when disconnected
* [ ] Appointments page works offline
* [ ] Manual sync button works

### Integration Tests

* [ ] Log in with internet → disconnect → app still works
* [ ] Create appointment offline → reconnect → syncs correctly
* [ ] Close app → reopen after 24 hours → still logged in
* [ ] Close app → reopen after 48+ hours → redirected to login

***

## Troubleshooting

### Common Issues

1. **SQL.js WASM not found**
   * Ensure `sql-wasm.wasm` is in the `public/` folder
   * Check Vite config paths

2. **Database not saving**
   * Check localStorage quota (5MB limit)
   * For larger apps, use Capacitor Filesystem

3. **Sync not working**
   * Check network connectivity
   * Verify API endpoints
   * Check token validity

4. **Session expired too early**
   * Check device time is correct
   * Verify SESSION\_DURATION\_MS setting

***

## File Structure Summary

```
frontend/src/
├── services/
│   ├── sqlite.service.js          # SQLite database management
│   ├── session-manager.js         # 48-hour session handling
│   ├── network-status.service.js # Online/offline detection
│   ├── sync-manager.js            # Data synchronization
│   ├── offline-appointments.service.js  # Offline appointments
│   └── offline-records.service.js      # Offline records
```

***

## Next Steps

1. **Testing**: Thoroughly test all offline scenarios
2. **Announcements**: Create similar offline service for announcements
3. **Consultations**: Add offline support for consultation records
4. **Notifications**: Handle offline notification queue
5. **Error Handling**: Improve error messages for offline operations

***

*Last Updated: July 2026*

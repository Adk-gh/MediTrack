// C:\Users\HP\MediTrack\frontend\src\components\clinic\generalSettings.jsx

import React, { useEffect, useState } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

const DEFAULT_PREFERENCES = {
  language: 'English',
  dateFormat: 'MM/DD/YYYY',
};

// ─── Local UI Helpers ────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} style={{
    width: 44, height: 24, border: 'none', padding: 2, borderRadius: 12,
    flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative',
    background: checked ? '#466460' : '#d1d5db', transition: 'background 0.2s',
    opacity: disabled ? 0.6 : 1,
  }}>
    <span style={{
      position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
      borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      transition: 'left 0.2s',
    }} />
  </button>
);

const SectionCard = ({ children }) => (
  <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2ebe8', overflow: 'hidden' }}>
    {children}
  </div>
);

const Row = ({ label, sub, right, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', borderBottom: last ? 'none' : '1px solid #eef3f1', gap: 12,
  }}>
    <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>}
    </div>
    {right}
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460', textTransform: 'uppercase',
    letterSpacing: 1, margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

// ─── Main Component ────────────────────────────────────────────────

export default function GeneralSettings({ isMobile, activeRole }) {
  const [notifyProfileUpdate, setNotifyProfileUpdate] = useState(false);
  const [academicUpdateVersion, setAcademicUpdateVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingAcademicPrompt, setSavingAcademicPrompt] = useState(false);

  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState('');

  const [clearingCache, setClearingCache] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const isStaffOrAdmin = [
    'sysadmin', 'administrator', 'nurse', 'doctor',
    'dentist', 'staff', 'registrar',
  ].includes(activeRole?.toLowerCase());

  // ─────────────────────────────────────────────────────────────────────────
  // Toast
  // ─────────────────────────────────────────────────────────────────────────

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Load System Config
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isStaffOrAdmin) {
      setLoading(false);
      return;
    }

    fetchSystemConfig();
  }, [isStaffOrAdmin]);

  const fetchSystemConfig = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/system-config`, {
        method: 'GET',
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to load system configuration.');
      }

      const data = result.data || {};

      setNotifyProfileUpdate(Boolean(data.prompt_student_academic_update));
      setAcademicUpdateVersion(Number(data.academic_update_version || 1));
    } catch (err) {
      console.error('[GeneralSettings] Failed to fetch system config:', err);
      setError('Failed to load system preferences.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Load User Preferences
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchUserPreferences();
  }, []);

  const fetchUserPreferences = async () => {
    setPreferencesLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to load user preferences.');
      }

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(result?.data?.preferences || {}),
      });
    } catch (err) {
      console.error('[GeneralSettings] Failed to fetch user preferences:', err);
      showToast('Failed to load your appearance preferences.', 'error');
    } finally {
      setPreferencesLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Academic Update Prompt
  // ─────────────────────────────────────────────────────────────────────────

  const handleAcademicPromptToggle = async (nextValue) => {
    if (savingAcademicPrompt) return;

    setSavingAcademicPrompt(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/system-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_student_academic_update: nextValue,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to update academic information prompt.');
      }

      const savedValue = result?.data?.prompt_student_academic_update !== undefined
        ? Boolean(result.data.prompt_student_academic_update)
        : nextValue;

      const savedVersion = result?.data?.academic_update_version !== undefined
        ? Number(result.data.academic_update_version)
        : academicUpdateVersion;

      setNotifyProfileUpdate(savedValue);
      setAcademicUpdateVersion(savedVersion);

      showToast(
        savedValue
          ? `Student academic information update prompt enabled. Update version ${savedVersion} is now active.`
          : 'Student academic information update prompt disabled.'
      );
    } catch (err) {
      console.error('[GeneralSettings] Failed to update academic prompt:', err);
      showToast(err.message || 'Failed to update academic information prompt.', 'error');
    } finally {
      setSavingAcademicPrompt(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save Language / Date Format
  // ─────────────────────────────────────────────────────────────────────────

  const handlePreferenceChange = async (key, value) => {
    if (savingPreference) return;

    const previousPreferences = { ...preferences };
    const updatedPreferences = { ...preferences, [key]: value };

    setPreferences(updatedPreferences);
    setSavingPreference(key);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: { [key]: value },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to save preference.');
      }

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(result?.data?.preferences || updatedPreferences),
      });

      showToast(
        key === 'language'
          ? `Language changed to ${value}.`
          : `Date format changed to ${value}.`
      );
    } catch (err) {
      console.error('[GeneralSettings] Failed to save preference:', err);
      setPreferences(previousPreferences);
      showToast(err.message || 'Failed to save preference.', 'error');
    } finally {
      setSavingPreference('');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Clear Cache
  // ─────────────────────────────────────────────────────────────────────────

  const handleClearCache = async () => {
    if (clearingCache) return;

    setClearingCache(true);
    setShowClearCacheModal(false);

    try {
      sessionStorage.clear();

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      showToast('Local cache cleared successfully.');
    } catch (err) {
      console.error('[GeneralSettings] Failed to clear cache:', err);
      showToast('Failed to clear local cache.', 'error');
    } finally {
      setClearingCache(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      padding: isMobile ? '16px 12px' : '24px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      position: 'relative',
    }}>
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 99999,
          fontSize: 13,
          fontWeight: 600,
          maxWidth: 'calc(100vw - 40px)',
          textAlign: 'center',
        }}>
          {toast.message}
        </div>
      )}

      {/* ── Confirmation Modal for Clear Cache ── */}
      {showClearCacheModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '24px 28px',
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            border: '1px solid #e2ebe8',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2e22', margin: '0 0 6px' }}>
                Clear Local Cache?
              </p>
              <p style={{ fontSize: 13, color: '#7a9e8e', margin: 0, lineHeight: 1.5 }}>
                This will clear temporary browser cache and session data. Your login session will remain active.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowClearCacheModal(false)}
                disabled={clearingCache}
                style={{
                  background: '#f4f8f6',
                  color: '#466460',
                  border: '1px solid #e2ebe8',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache}
                style={{
                  background: '#466460',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: clearingCache ? 0.6 : 1,
                }}
              >
                {clearingCache ? 'Clearing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── System Preferences ── */}
      {isStaffOrAdmin && (
        <>
          <SectionLabel>System Preferences</SectionLabel>

          <SectionCard>
            <Row
              label="Prompt Student Academic Info Update"
              sub="Require students to review and update their current year level and section."
              right={
                loading ? (
                  <div style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: '#e5e7eb',
                  }} />
                ) : (
                  <Toggle
                    checked={notifyProfileUpdate}
                    disabled={savingAcademicPrompt}
                    onChange={handleAcademicPromptToggle}
                  />
                )
              }
            />

            <Row
              label="Academic Update Version"
              sub={
                notifyProfileUpdate
                  ? 'Students with an older acknowledged version must review their academic information.'
                  : 'The version increases automatically when a new academic update cycle is enabled.'
              }
              last
              right={
                <div style={{
                  minWidth: 42,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 10px',
                  borderRadius: 10,
                  background: '#f4f8f6',
                  border: '1px solid #e2ebe8',
                  color: '#466460',
                  fontSize: 13,
                  fontWeight: 800,
                }}>
                  {loading ? '—' : academicUpdateVersion}
                </div>
              }
            />
          </SectionCard>

          {error && (
            <div style={{
              marginTop: -10,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 12,
              fontWeight: 600,
            }}>
              {error}
            </div>
          )}
        </>
      )}

      {/* ── Appearance & Formatting ── */}
      <SectionLabel>Appearance & Formatting</SectionLabel>

      <SectionCard>
        <Row
          label="Language"
          sub="Choose your preferred language"
          right={
            <select
              value={preferences.language}
              disabled={preferencesLoading || savingPreference === 'language'}
              onChange={(e) => handlePreferenceChange('language', e.target.value)}
              style={{
                background: '#f4f8f6',
                border: '1px solid #e2ebe8',
                borderRadius: 10,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1a2e22',
                cursor: preferencesLoading ? 'wait' : 'pointer',
                outline: 'none',
                opacity: savingPreference === 'language' ? 0.6 : 1,
              }}
            >
              <option value="English">English</option>
              <option value="Filipino">Filipino</option>
            </select>
          }
        />

        <Row
          label="Date Format"
          sub="How dates are displayed across the app"
          last
          right={
            <select
              value={preferences.dateFormat}
              disabled={preferencesLoading || savingPreference === 'dateFormat'}
              onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
              style={{
                background: '#f4f8f6',
                border: '1px solid #e2ebe8',
                borderRadius: 10,
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 600,
                color: '#1a2e22',
                cursor: preferencesLoading ? 'wait' : 'pointer',
                outline: 'none',
                opacity: savingPreference === 'dateFormat' ? 0.6 : 1,
              }}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          }
        />
      </SectionCard>

      {/* ── Storage ── */}
      <SectionLabel>Storage</SectionLabel>

      <SectionCard>
        <Row
          label="Clear Cache"
          sub="Clear temporary local browser/app cache without removing your login session."
          last
          right={
            <button
              type="button"
              onClick={() => setShowClearCacheModal(true)}
              disabled={clearingCache}
              style={{
                background: '#f4f8f6',
                color: '#466460',
                border: '1px solid #e2ebe8',
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: clearingCache ? 'not-allowed' : 'pointer',
                opacity: clearingCache ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {clearingCache ? 'Clearing...' : 'Clear'}
            </button>
          }
        />
      </SectionCard>
    </div>
  );
}
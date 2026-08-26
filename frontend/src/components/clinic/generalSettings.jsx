// C:\Users\HP\MediTrack\frontend\src\components\clinic\generalSettings.jsx

import React, { useEffect, useRef, useState } from 'react';

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
  <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2ebe8', overflow: 'visible' }}>
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

const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#7a9e8e" strokeWidth="3"
    style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Custom dropdown — replaces native <select> so mobile browsers don't fall back
// to the OS-level picker UI (which ignores our styling).
const CustomSelect = ({ value, onChange, options, disabled }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const current = options.find(o => o.value === value) || options[0];

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10,
          padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22',
          cursor: disabled ? 'wait' : 'pointer', outline: 'none',
          opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
        }}
      >
        <span>{current?.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 140,
          background: '#fff', border: '1px solid #e2ebe8', borderRadius: 12,
          boxShadow: '0 10px 28px rgba(42,72,68,0.16)', overflow: 'hidden',
          zIndex: 50, maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(opt => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: active ? '#eef6f4' : 'transparent',
                  color: active ? '#2d5c52' : '#1a2e22',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f6faf9'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};


// ─── Reusable Confirmation Modal ──────────────────────────────────────────────
const ActionConfirmModal = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  loadingText = 'Please wait...',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #e2ebe8',
          padding: '24px 28px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <p
            id="settings-confirm-title"
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#1a2e22',
              margin: '0 0 6px',
            }}
          >
            {title}
          </p>

          <p
            style={{
              fontSize: 13,
              color: '#7a9e8e',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              background: '#f4f8f6',
              color: '#466460',
              border: '1px solid #e2ebe8',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: '#466460',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmableRemoveButton = ({
  label = 'Remove',
  itemLabel = 'this item',
  onConfirm,
  style,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={style}>
        {label}
      </button>

<ActionConfirmModal
  open={Boolean(pendingAction)}
  title={pendingAction?.title || 'Confirm Change'}
  message={pendingAction?.message || ''}
  confirmText={pendingAction?.confirmText || 'Confirm'}
  loadingText={pendingAction?.loadingText || 'Please wait...'}
  loading={
    savingAcademicPrompt ||
    Boolean(savingPreference) ||
    clearingCache
  }
  onCancel={() => {
    if (
      !savingAcademicPrompt &&
      !savingPreference &&
      !clearingCache
    ) {
      setPendingAction(null);
    }
  }}
  onConfirm={confirmPendingAction}
/>
    </>
  );
};

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


  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [pendingAction, setPendingAction] = useState(null);

const normalizedRole = String(activeRole || '')
  .trim()
  .toLowerCase();

const isSysadmin = normalizedRole === 'sysadmin';

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
  if (!isSysadmin) {
    setLoading(false);
    setError('');
    return;
  }

  fetchSystemConfig();
}, [isSysadmin]);

const fetchSystemConfig = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Grab the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_URL}/system-config`, {
        method: 'GET',
        cache: 'no-store',
        // 2. Attach the token to the headers
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

const performAcademicPromptToggle = async (nextValue) => {
    if (savingAcademicPrompt) return;

    setSavingAcademicPrompt(true);
    setError('');

    try {
      // 1. Grab the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_URL}/system-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 2. Attach the Authorization header
          Authorization: `Bearer ${token}`
        },
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

  const performPreferenceChange = async (key, value) => {
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

 const requestAcademicPromptToggle = (nextValue) => {
  setPendingAction({
    type: 'academic',
    nextValue,
    title: nextValue
      ? 'Enable Academic Update Prompt?'
      : 'Disable Academic Update Prompt?',
    message: nextValue
      ? 'Students will be required to review and acknowledge their academic information.'
      : 'Students will no longer be prompted to review their academic information.',
    confirmText: nextValue ? 'Enable' : 'Disable',
  });
};

const requestPreferenceChange = (key, value) => {
  const label =
    key === 'language'
      ? 'language'
      : 'date format';

  setPendingAction({
    type: 'preference',
    key,
    value,
    title: `Change ${
      key === 'language'
        ? 'Language'
        : 'Date Format'
    }?`,
    message: `This will change your ${label} to "${value}" across MediTrack.`,
    confirmText: 'Apply Change',
  });
};

  const requestClearCache = () => {
  if (clearingCache) return;

  setPendingAction({
    type: 'clear-cache',
    title: 'Clear Local Cache?',
    message:
      'This will clear temporary browser cache and session data. Your login session will remain active.',
    confirmText: 'Confirm',
    loadingText: 'Clearing...',
  });
};

const confirmPendingAction = async () => {
  const action = pendingAction;

  if (!action) return;

  if (action.type === 'academic') {
    setPendingAction(null);
    await performAcademicPromptToggle(action.nextValue);
    return;
  }

  if (action.type === 'preference') {
    setPendingAction(null);
    await performPreferenceChange(action.key, action.value);
    return;
  }

  if (action.type === 'clear-cache') {
    await handleClearCache();
    setPendingAction(null);
  }
};

  // ─────────────────────────────────────────────────────────────────────────
  // Clear Cache
  // ─────────────────────────────────────────────────────────────────────────

const handleClearCache = async () => {
  if (clearingCache) return;

  setClearingCache(true);

  try {
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }

    showToast('Local cache cleared successfully.');
  } catch (err) {
    console.error(
      '[GeneralSettings] Failed to clear cache:',
      err
    );

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

      <ActionConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title || 'Confirm Change'}
        message={pendingAction?.message || ''}
        confirmText={pendingAction?.confirmText || 'Confirm'}
        tone={pendingAction?.tone || 'edit'}
        loading={savingAcademicPrompt || Boolean(savingPreference)}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />


{/* ── System Preferences — Sysadmin Only ── */}
{isSysadmin && (
  <>
    <SectionLabel>System Preferences</SectionLabel>

    <SectionCard>
      <Row
        label="Prompt Student Academic Info Update"
        sub="Require students to review and update their current year level and section."
        right={
          loading ? (
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: '#e5e7eb',
              }}
            />
          ) : (
            <Toggle
              checked={notifyProfileUpdate}
              disabled={savingAcademicPrompt}
              onChange={requestAcademicPromptToggle}
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
          <div
            style={{
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
            }}
          >
            {loading ? '—' : academicUpdateVersion}
          </div>
        }
      />
    </SectionCard>

    {error && (
      <div
        style={{
          marginTop: -10,
          padding: '10px 14px',
          borderRadius: 10,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#b91c1c',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
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
            <CustomSelect
              value={preferences.language}
              disabled={preferencesLoading || savingPreference === 'language'}
              onChange={(value) => requestPreferenceChange('language', value)}
              options={[
                { value: 'English', label: 'English' },
                { value: 'Filipino', label: 'Filipino' },
              ]}
            />
          }
        />

        <Row
          label="Date Format"
          sub="How dates are displayed across the app"
          last
          right={
            <CustomSelect
              value={preferences.dateFormat}
              disabled={preferencesLoading || savingPreference === 'dateFormat'}
              onChange={(value) => requestPreferenceChange('dateFormat', value)}
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
            />
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
  onClick={requestClearCache}
  disabled={clearingCache}
  style={{
    background: '#f4f8f6',
    color: '#466460',
    border: '1px solid #e2ebe8',
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    cursor: clearingCache
      ? 'not-allowed'
      : 'pointer',
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
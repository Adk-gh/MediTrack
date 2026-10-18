// C:\Users\HP\MediTrack\frontend\src\components\admin\DentistSettings.jsx

import React, { useState, useEffect, useRef } from 'react';

import { getAuthHeaders } from '../../services/token.service';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// ─── Local UI Helpers (matches securitySettings.jsx) ─────────────────────────

const Snackbar = ({ message, type, onClose }) => {

  if (!message) return null;

  return (

    <div style={{

      position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',

      background: type === 'error' ? '#ef4444' : '#10b981', color: '#fff',

      padding: '14px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,

      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', zIndex: 9999,

      fontFamily: 'helvetica, sans-serif', fontSize: 14, fontWeight: 600,

    }}>

      <span>{message}</span>

      <button

        onClick={onClose}

        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: 20, lineHeight: 1 }}

      >

        ×

      </button>

    </div>

  );

};

const SectionCard = ({ children }) => (

  <div style={{

    background: '#fff',

    borderRadius: 20,

    border: '1px solid #e2ebe8',

    overflow: 'hidden',

  }}>

    {children}

  </div>

);

const SectionLabel = ({ children }) => (

  <p style={{

    fontSize: 11, fontWeight: 800, color: '#466460',

    textTransform: 'uppercase', letterSpacing: 1,

    margin: '0 0 8px 4px',

  }}>

    {children}

  </p>

);

const Row = ({ label, sub, right, last }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
    padding: '16px 18px',
    minWidth: 0,
    borderBottom: last ? 'none' : '1px solid #eef3f1',
  }}>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0, lineHeight: 1.4 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>}
    </div>
    <div style={{ width: '100%', minWidth: 0 }}>
      {right}
    </div>
  </div>
);

const fieldInputStyle = (isMobile) => ({

  width: '100%',

  border: '1px solid #cbd5e1',

  borderRadius: 8,

  padding: '9px 12px',

  fontSize: 13,

  outline: 'none',

  boxSizing: 'border-box',

});

// ─── Reusable Confirmation Modal ──────────────────────────────────────────────

const ActionConfirmModal = ({

  open,

  title,

  message,

  confirmText = 'Confirm',

  cancelText = 'Cancel',

  tone = 'save',

  loading = false,

  onConfirm,

  onCancel,

}) => {

  useEffect(() => {

    if (!open) return undefined;

    const handleKeyDown = (event) => {

      if (event.key === 'Escape' && !loading) onCancel?.();

    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);

  }, [open, loading, onCancel]);

  if (!open) return null;

  const palette = {

    save: { accent: '#466460', soft: '#e8f5ee', icon: '✓' },

    edit: { accent: '#2563eb', soft: '#dbeafe', icon: '✎' },

    delete: { accent: '#e5262d', soft: '#fee2e2', icon: '↪' },

    warning: { accent: '#d97706', soft: '#fef3c7', icon: '!' },

  };

  const colors = palette[tone] || palette.save;

  return (

    <div

      role="dialog"

      aria-modal="true"

      aria-labelledby="settings-confirm-title"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget && !loading) onCancel?.();

      }}

      style={{

        position: 'fixed', inset: 0, zIndex: 20000,

        background: 'rgba(15, 23, 42, 0.54)', backdropFilter: 'blur(4px)',

        WebkitBackdropFilter: 'blur(4px)', display: 'flex',

        alignItems: 'center', justifyContent: 'center', padding: 20,

      }}

    >

      <div

        style={{

          width: '100%', maxWidth: 384, background: '#fff',

          borderRadius: 18, padding: '24px 24px 22px',

          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)', textAlign: 'center',

        }}

      >

        <div

          style={{

            width: 56, height: 56, borderRadius: '50%',

            margin: '0 auto 17px', display: 'flex', alignItems: 'center',

            justifyContent: 'center', background: colors.soft,

            color: colors.accent, fontSize: 26, fontWeight: 800,

          }}

        >

          {colors.icon}

        </div>

        <h3 id="settings-confirm-title" style={{ margin: 0, color: '#1e293b', fontSize: 18, fontWeight: 800 }}>

          {title}

        </h3>

        <p style={{ margin: '12px 0 22px', color: '#718096', fontSize: 13, lineHeight: 1.6 }}>

          {message}

        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          <button

            type="button" onClick={onCancel} disabled={loading}

            style={{

              height: 45, border: 'none', borderRadius: 12, background: '#f1f5f9',

              color: '#526277', fontSize: 13, fontWeight: 700,

              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,

            }}

          >

            {cancelText}

          </button>

          <button

            type="button" onClick={onConfirm} disabled={loading}

            style={{

              height: 45, border: 'none', borderRadius: 12, background: colors.accent,

              color: '#fff', fontSize: 13, fontWeight: 800,

              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,

            }}

          >

            {loading ? 'Please wait...' : confirmText}

          </button>

        </div>

      </div>

    </div>

  );

};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DentistSettings = ({ isMobile }) => {

  const [config, setConfig] = useState({ name: '', title: '' });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const hasFetched = useRef(false);

  const showToast = (text, type = 'success') => {

    setToast({ show: true, text, type });

    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);

  };

  useEffect(() => {

    if (hasFetched.current) return;

    hasFetched.current = true;

    fetchConfig();

  }, []);

  const fetchConfig = async () => {

    try {

      const headers = await getAuthHeaders();

      const res = await fetch(`${API_URL}/settings/dentist`, { headers });

      if (res.ok) {

        const data = await res.json();

        setConfig(prev => ({ ...prev, ...data }));

      }

    } catch (error) {

      console.error("Failed to fetch dentist config:", error);

    } finally {

      setLoading(false);

    }

  };

  const performSave = async () => {

    setShowSaveConfirm(false);

    setSaving(true);

    try {

      const jsonHeaders = await getAuthHeaders();

      const res = await fetch(`${API_URL}/settings/dentist`, {

        method: 'PUT',

        headers: jsonHeaders,

        body: JSON.stringify({

          name: config.name,

          title: config.title

        })

      });

      if (!res.ok) throw new Error("Server error saving details");

      showToast('School Dentist configuration saved successfully!', 'success');

    } catch (error) {

      console.error('Save error:', error);

      showToast('Failed to save config. Make sure your server is running.', 'error');

    }

    setSaving(false);

  };

  const containerStyle = { minWidth: 0, width: '100%', boxSizing: 'border-box', padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 };

  if (loading) {

    return (

      <div style={containerStyle}>

        <SectionLabel>Dentist Settings</SectionLabel>

        <p style={{ fontSize: 13, color: '#7a9e8e' }}>Loading settings...</p>

      </div>

    );

  }

  return (

    <div style={{ ...containerStyle, position: 'relative' }}>

      {toast.show && (

        <Snackbar

          message={toast.text} type={toast.type}

          onClose={() => setToast({ show: false, text: '', type: 'success' })}

        />

      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <SectionLabel>Dentist Settings</SectionLabel>

        <button

          onClick={() => setShowSaveConfirm(true)}

          disabled={saving}

          style={{

            background: '#466460', color: '#fff', border: 'none',

            padding: '8px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700,

            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,

          }}

        >

          {saving ? 'Saving...' : 'Save Changes'}

        </button>

      </div>

      <SectionCard>

        <Row

          label="Full Name (with Title)"

          sub="Shown on every generated dental report"


          right={

            <input

              type="text"

              value={config.name}

              onChange={e => setConfig({ ...config, name: e.target.value })}

              placeholder="e.g. DR. JOSELITO S. REYES"

              style={{ ...fieldInputStyle(isMobile), textTransform: 'uppercase' }}

            />

          }

        />

        <Row

          label="Position / Title"

          sub="Displayed directly under the name"

          last


          right={

            <input

              type="text"

              value={config.title}

              onChange={e => setConfig({ ...config, title: e.target.value })}

              placeholder="e.g. DENTIST II"

              style={fieldInputStyle(isMobile)}

            />

          }

        />

      </SectionCard>

      <ActionConfirmModal

        open={showSaveConfirm}

        title="Save Dentist Settings?"

        message="This will update the dentist name and position used on generated dental reports."

        confirmText="Save Changes"

        tone="save"

        loading={saving}

        onCancel={() => setShowSaveConfirm(false)}

        onConfirm={performSave}

      />

    </div>

  );

};

export default DentistSettings;
// C:\Users\HP\MediTrack\frontend\src\components\admin\DentistSettings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { getAuthHeaders, getValidToken } from '../../services/token.service';

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
        &times;
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
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20,
    padding: '14px 18px',
    borderBottom: last ? 'none' : '1px solid #eef3f1',
  }}>
    <div style={{ flex: 1, paddingRight: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0' }}>{sub}</p>}
    </div>
    {right}
  </div>
);

const fieldInputStyle = {
  width: 260, border: '1px solid #cbd5e1', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const DentistSettings = ({ isMobile }) => {
  const [config, setConfig] = useState({
    name: '', title: '', signatureUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const hasFetched = useRef(false);
  const sigFileInputRef = useRef(null);

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

      const res = await fetch(`${API_URL}/settings/dentist`, {
        headers: headers
      });

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

  const handleSignatureFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB.', 'error');
      return;
    }

    setSignatureFile(file);
    setSigPreview(URL.createObjectURL(file));
  };

const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update text info using getAuthHeaders()
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

      // 2. Upload signature if attached
      if (signatureFile) {
        const token = await getValidToken(); // Only get the token, not the JSON headers
        const body = new FormData();
        body.append('signature', signatureFile);

        const sigRes = await fetch(`${API_URL}/settings/dentist/signature`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
            // Notice we leave Content-Type empty so the browser handles it automatically
          },
          body
        });
        if (!sigRes.ok) throw new Error('Server error uploading signature');
        const sigResult = await sigRes.json();

        setConfig(prev => ({ ...prev, signatureUrl: sigResult.signatureUrl }));
        setSignatureFile(null);
        setSigPreview(null);
      }

      showToast('School Dentist configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save config. Make sure your server is running.', 'error');
    }
    setSaving(false);
  };
  const currentSigSrc = sigPreview || config.signatureUrl;
  const containerStyle = { padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 };

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
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}

      {/* Header row: label left, Save Changes right — mirrors Security pattern */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>Dentist Settings</SectionLabel>
        <button
          onClick={handleSave}
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
          sub="Shown above the signature on every generated dental report"
          right={
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g. DR. JOSELITO S. REYES"
              style={{ ...fieldInputStyle, textTransform: 'uppercase' }}
            />
          }
        />
        <Row
          label="Position / Title"
          sub="Displayed directly under the name"
          right={
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
              placeholder="e.g. DENTIST II"
              style={fieldInputStyle}
            />
          }
        />
        <Row
          label="Digital Signature"
          sub={
            <>
              Transparent PNG shown above the name on reports
              {signatureFile && (
                <span style={{ color: '#b45309', fontWeight: 600 }}> — not saved yet</span>
              )}
            </>
          }
          last
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 140, height: 64, border: '1px dashed #cbd5e1', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', overflow: 'hidden', flexShrink: 0,
              }}>
                {currentSigSrc ? (
                  <img src={currentSigSrc} alt="Signature preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>No signature</span>
                )}
              </div>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                ref={sigFileInputRef}
                onChange={handleSignatureFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => sigFileInputRef.current?.click()}
                disabled={saving}
                style={{
                  background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
                  padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {signatureFile ? 'Choose different' : (config.signatureUrl ? 'Replace' : 'Upload')}
              </button>
            </div>
          }
        />
      </SectionCard>
    </div>
  );
};

export default DentistSettings;
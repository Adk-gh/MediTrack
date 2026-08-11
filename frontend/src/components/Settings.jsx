// C:\Users\HP\MediTrack\frontend\src\components\Settings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

// ─── Environment Variables ────────────────────────────────────────────────────
const OCR_SERVICE_URL = (import.meta.env.VITE_OCR_SERVICE_URL || 'http://localhost:5001').replace(/\/$/, '');
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// ─── Icons ────────────────────────────────────────────────────────────────────
const GeneralIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const OcrIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3M9 12h6" />
  </svg>
);

const SystemIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const DataIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const DoctorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 22v-4M12 22a4 4 0 0 0 4-4V6M12 22a4 4 0 0 1-4-4V6M16 6a4 4 0 0 0-8 0M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

const DentistIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M8 3c-1.5 0-2.5 1-2.5 2.5 0 1 .5 2 1.5 3v6.5c0 2 1.5 3 2.5 3 .5 0 1-.5 1.5-1.5L12 14l1 2.5c.5 1 1 1.5 1.5 1.5 1 0 2.5-1 2.5-3V8.5c1-1 1.5-2 1.5-3C18.5 4 17.5 3 16 3c-1.5 0-2.5 1-2.5 2.5C13.5 4 12.5 3 12 3s-1.5 1-1.5 2.5C10.5 4 9.5 3 8 3z" />
  </svg>
);

const StorageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M3 10h18" />
  </svg>
);

const FolderGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

const FileGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

// ─── Format Helpers ────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

// ─── Shared UI Helpers ────────────────────────────────────────────────────────
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

const Toggle = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
      cursor: 'pointer', position: 'relative',
      background: checked ? '#466460' : '#d1d5db',
      transition: 'background 0.2s',
    }}
  >
    <span style={{
      position: 'absolute', top: 3,
      left: checked ? 23 : 3,
      width: 18, height: 18, borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      transition: 'left 0.2s',
    }} />
  </div>
);

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

const Row = ({ label, sub, right, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460',
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

// ─── OCR Settings Sub-Component ───────────────────────────────────────────────
function OcrSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInstKeyword, setNewInstKeyword] = useState('');
  const [newRoleKeywords, setNewRoleKeywords] = useState({});
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
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
      const res = await fetch(`${OCR_SERVICE_URL}/config`);
      const data = await res.json();
      setConfig(data);
    } catch (error) {
      console.error("Failed to fetch OCR config:", error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${OCR_SERVICE_URL}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error("Server error");
      showToast('OCR Configuration saved successfully!', 'success');
    } catch (error) {
      showToast('Failed to save config. Make sure the OCR server is running.', 'error');
    }
    setSaving(false);
  };

  const addInstitutionKeyword = () => {
    if (!newInstKeyword.trim()) return;
    setConfig(prev => ({
      ...prev,
      institution_keywords: [...prev.institution_keywords, newInstKeyword.toUpperCase().trim()]
    }));
    setNewInstKeyword('');
  };

  const removeInstitutionKeyword = (index) => {
    setConfig(prev => ({
      ...prev,
      institution_keywords: prev.institution_keywords.filter((_, i) => i !== index)
    }));
  };

  const addRoleKeyword = (mapIdx) => {
    const value = (newRoleKeywords[mapIdx] || '').trim();
    if (!value) return;
    setConfig(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.map((mapping, i) =>
        i !== mapIdx ? mapping : { ...mapping, keywords: [...mapping.keywords, value.toUpperCase()] }
      )
    }));
    setNewRoleKeywords(prev => ({ ...prev, [mapIdx]: '' }));
  };

  const removeRoleKeyword = (mapIdx, kwIdx) => {
    setConfig(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.map((mapping, i) =>
        i !== mapIdx ? mapping : { ...mapping, keywords: mapping.keywords.filter((_, j) => j !== kwIdx) }
      )
    }));
  };

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading OCR settings...</div>;

  if (!config) return (
    <div style={{ padding: '24px', color: '#ef4444' }}>
      Failed to connect to OCR Server at: <strong>{OCR_SERVICE_URL}</strong>
      <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>Make sure the OCR server is running and CORS is enabled.</p>
    </div>
  );

  return (
    <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2ebe8', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>OCR Scanner Configuration</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Teach the AI engine how to read ID cards by updating keywords.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#466460', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px',
              fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Institution Triggers</h3>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
            If the ID contains any of these words, the scanner will capture the rest of the line as the school/company name.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {config.institution_keywords.map((kw, idx) => (
              <span key={idx} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {kw}
                <button onClick={() => removeInstitutionKeyword(idx)} style={{ background: 'none', border: 'none', color: '#064e3b', cursor: 'pointer', padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
            <input
              type="text"
              value={newInstKeyword}
              onChange={e => setNewInstKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInstitutionKeyword()}
              placeholder="e.g. DALUBHASAAN"
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '14px', outline: 'none' }}
            />
            <button onClick={addInstitutionKeyword} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0' }} />

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Role Detection Keywords</h3>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Keywords used to assign a role to the scanned ID (e.g. "BSIT" = Student). Order matters — first match wins.
          </p>
          <div style={{ display: 'grid', gap: '16px' }}>
            {config.role_mappings.map((mapping, mapIdx) => (
              <div key={mapIdx} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#466460', fontSize: '14px' }}>
                    {mapping.name}
                    <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 'normal', color: '#94a3b8' }}>({mapping.id_type})</span>
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {mapping.keywords.map((kw, kwIdx) => (
                    <span key={kwIdx} style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {kw}
                      <button onClick={() => removeRoleKeyword(mapIdx, kwIdx)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>✕</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={newRoleKeywords[mapIdx] || ''}
                    onChange={e => setNewRoleKeywords(prev => ({ ...prev, [mapIdx]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addRoleKeyword(mapIdx)}
                    placeholder="+ Add Keyword"
                    style={{ background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', width: '112px', outline: 'none' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Settings Sub-Component ────────────────────────────────────────────
function DoctorSettings() {
  const [config, setConfig] = useState({
    name: '', title: '', licenseNo: '', ptrNo: '', signatureUrl: ''
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
      const res = await fetch(`${API_URL}/settings/doctor`);
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Failed to fetch doctor config:", error);
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
      const res = await fetch(`${API_URL}/settings/doctor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          title: config.title,
          licenseNo: config.licenseNo,
          ptrNo: config.ptrNo
        })
      });
      if (!res.ok) throw new Error('Server error saving details');

      if (signatureFile) {
        const body = new FormData();
        body.append('signature', signatureFile);

        const sigRes = await fetch(`${API_URL}/settings/doctor/signature`, {
          method: 'POST',
          body
        });
        if (!sigRes.ok) throw new Error('Server error uploading signature');
        const sigResult = await sigRes.json();

        setConfig(prev => ({ ...prev, signatureUrl: sigResult.signatureUrl }));
        setSignatureFile(null);
        setSigPreview(null);
      }

      showToast('Medical Officer configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save config. Make sure your server is running.', 'error');
    }
    setSaving(false);
  };

  const currentSigSrc = sigPreview || config.signatureUrl;

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading settings...</div>;

  return (
    <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2ebe8', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>Medical Officer Settings</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Update the doctor credentials displayed on the Medical Certificate.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#466460', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px',
              fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Full Name (with Title)
            </label>
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g. CAREN NAVATA JOSE M.D."
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Position / Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
              placeholder="e.g. Medical Officer III"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                License Number
              </label>
              <input
                type="text"
                value={config.licenseNo}
                onChange={e => setConfig({ ...config, licenseNo: e.target.value })}
                placeholder="e.g. 0114665"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
                PTR Number
              </label>
              <input
                type="text"
                value={config.ptrNo}
                onChange={e => setConfig({ ...config, ptrNo: e.target.value })}
                placeholder="e.g. 9978569"
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ paddingTop: '4px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Digital Signature
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
              Upload a transparent PNG of the doctor's signature. This appears above the name on every generated certificate.
              {signatureFile && (
                <span style={{ color: '#b45309', fontWeight: 600 }}> Not saved yet — click "Save Changes" to apply it.</span>
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: 160, height: 80, border: '1px dashed #cbd5e1', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', overflow: 'hidden'
              }}>
                {currentSigSrc ? (
                  <img src={currentSigSrc} alt="Signature preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No signature yet</span>
                )}
              </div>

              <div>
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
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1
                  }}
                >
                  {signatureFile ? 'Choose a different file' : (config.signatureUrl ? 'Replace signature' : 'Choose signature')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dentist Settings Sub-Component ───────────────────────────────────────────
function DentistSettings() {
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
      const res = await fetch(`${API_URL}/settings/dentist`);
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
      // 1. Update text info
      const res = await fetch(`${API_URL}/settings/dentist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          title: config.title
        })
      });
      if (!res.ok) throw new Error("Server error saving details");

      // 2. Upload signature if attached
      if (signatureFile) {
        const body = new FormData();
        body.append('signature', signatureFile);

        const sigRes = await fetch(`${API_URL}/settings/dentist/signature`, {
          method: 'POST',
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

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading settings...</div>;

  return (
    <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2ebe8', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>School Dentist Settings</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Update the dentist credentials displayed on the Dental Examination Report.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#466460', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px',
              fontSize: '14px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Full Name (with Title)
            </label>
            <input
              type="text"
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g. DR. JOSELITO S. REYES"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Position / Title
            </label>
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
              placeholder="e.g. DENTIST II"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ paddingTop: '4px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Digital Signature
            </label>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
              Upload a transparent PNG of the dentist's signature. This appears above the name on every generated dental report.
              {signatureFile && (
                <span style={{ color: '#b45309', fontWeight: 600 }}> Not saved yet — click "Save Changes" to apply it.</span>
              )}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: 160, height: 80, border: '1px dashed #cbd5e1', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', overflow: 'hidden'
              }}>
                {currentSigSrc ? (
                  <img src={currentSigSrc} alt="Signature preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>No signature yet</span>
                )}
              </div>

              <div>
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
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1
                  }}
                >
                  {signatureFile ? 'Choose a different file' : (config.signatureUrl ? 'Replace signature' : 'Choose signature')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Storage Manager Sub-Component ────────────────────────────────────────────
// Browses Supabase Storage buckets via the backend (service-role) endpoints
// defined in storage.routes.js, and lets admins delete files/folders.
//
// Note the "cache: 'no-store'" fetch option below is REQUIRED, not cosmetic:
// this endpoint was previously getting cached by the browser (a 304 replaying
// a stale empty-array response), which made the manager intermittently show
// "no buckets" even though buckets existed. See fetchBuckets() for details.
function StorageSettings() {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [pathParts, setPathParts] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [bucketsError, setBucketsError] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  const currentPrefix = pathParts.join('/');

  useEffect(() => {
    fetchBuckets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBucket) fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, currentPrefix]);

  const fetchBuckets = async () => {
    setLoadingBuckets(true);
    setBucketsError(null); // reset on every attempt so a retry can clear a stale error
    try {
      const res = await fetch(`${API_URL}/storage/buckets`, {
        cache: 'no-store' // <-- must live inside the fetch options object to do anything
      });

      if (!res.ok) {
        // Backend reached, but responded with an error status
        throw new Error(`Server responded ${res.status}`);
      }

      const data = await res.json();
      setBuckets(data.buckets || []);
      if (data.buckets?.length) setSelectedBucket(data.buckets[0].name);
    } catch (error) {
      // Network failure, CORS issue, backend down, bad JSON, etc.
      console.error('Failed to fetch buckets:', error);
      setBucketsError(error.message || 'Failed to reach backend');
      showToast('Failed to load storage buckets. Make sure your backend is running.', 'error');
    } finally {
      setLoadingBuckets(false);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setSelected(new Set());
    try {
      const query = currentPrefix ? `?prefix=${encodeURIComponent(currentPrefix)}` : '';
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/list${query}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItemsError(error.message || 'Failed to reach backend');
      showToast('Failed to load folder contents.', 'error');
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBucketChange = (name) => {
    setSelectedBucket(name);
    setPathParts([]);
  };

  const openFolder = (name) => setPathParts(prev => [...prev, name]);

  const goToBreadcrumb = (index) => setPathParts(prev => prev.slice(0, index + 1));

  const toggleSelect = (path) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => (prev.size === items.length ? new Set() : new Set(items.map(i => i.path))));
  };

  const deleteFile = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/objects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [item.path] })
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Deleted "${item.name}"`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Delete file error:', error);
      showToast('Failed to delete file.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteFolder = async (item) => {
    if (!window.confirm(`Delete folder "${item.name}" and everything inside it? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/folder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: item.path })
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Deleted folder "${item.name}"`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Delete folder error:', error);
      showToast('Failed to delete folder.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const selectedItems = items.filter(i => selected.has(i.path));
    const folderCount = selectedItems.filter(i => i.type === 'folder').length;
    const fileCount = selectedItems.length - folderCount;
    const label = [
      fileCount ? `${fileCount} file${fileCount > 1 ? 's' : ''}` : null,
      folderCount ? `${folderCount} folder${folderCount > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' and ');

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const filePaths = selectedItems.filter(i => i.type === 'file').map(i => i.path);
      const folderItems = selectedItems.filter(i => i.type === 'folder');

      if (filePaths.length) {
        const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/objects`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: filePaths })
        });
        if (!res.ok) throw new Error('Delete failed');
      }

      for (const folder of folderItems) {
        const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/folder`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: folder.path })
        });
        if (!res.ok) throw new Error('Delete failed');
      }

      showToast(`Deleted ${label}`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Some items failed to delete.', 'error');
      fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  if (loadingBuckets) return <div style={{ padding: '24px', color: '#64748b' }}>Loading storage buckets...</div>;

  if (bucketsError) return (
    <div style={{ padding: '24px', color: '#ef4444' }}>
      Couldn't reach the backend to load storage buckets.
      <p style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
        {bucketsError} — make sure `/api/storage/buckets` is mounted and the server is running.
      </p>
      <button
        onClick={fetchBuckets}
        style={{ marginTop: '12px', background: '#466460', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        Retry
      </button>
    </div>
  );

  if (!buckets.length) return (
    <div style={{ padding: '24px', color: '#94a3b8' }}>
      This project has no storage buckets yet.
    </div>
  );

  return (
    <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2ebe8', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' }}>Storage Manager</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Browse and clean up files stored in your Supabase buckets.</p>
          </div>
          <select
            value={selectedBucket}
            onChange={e => handleBucketChange(e.target.value)}
            style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}
          >
            {buckets.map(b => (
              <option key={b.id || b.name} value={b.name}>{b.name}{b.public ? ' (public)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 16, fontSize: 13 }}>
          <button
            onClick={() => goToBreadcrumb(-1)}
            style={{ background: 'none', border: 'none', color: pathParts.length ? '#466460' : '#1a2e22', fontWeight: 700, cursor: 'pointer', padding: '2px 4px' }}
          >
            {selectedBucket}
          </button>
          {pathParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <span style={{ color: '#b0c8be' }}>/</span>
              <button
                onClick={() => goToBreadcrumb(idx)}
                style={{ background: 'none', border: 'none', color: idx === pathParts.length - 1 ? '#1a2e22' : '#466460', fontWeight: 700, cursor: 'pointer', padding: '2px 4px' }}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', cursor: items.length ? 'pointer' : 'default' }}>
            <input
              type="checkbox"
              checked={items.length > 0 && selected.size === items.length}
              onChange={toggleSelectAll}
              disabled={!items.length}
            />
            Select all
          </label>
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ border: '1px solid #e2ebe8', borderRadius: 12, overflow: 'hidden' }}>
          {loadingItems ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
          ) : itemsError ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
              Couldn't load this folder.
              <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{itemsError}</div>
              <button
                onClick={fetchItems}
                style={{ marginTop: 10, background: '#466460', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>This folder is empty.</div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderBottom: idx === items.length - 1 ? 'none' : '1px solid #eef3f1',
                  background: selected.has(item.path) ? '#f4f8f6' : '#fff'
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.path)}
                  onChange={() => toggleSelect(item.path)}
                />
                <div style={{ width: 20, height: 20, color: item.type === 'folder' ? '#466460' : '#94a3b8', flexShrink: 0 }}>
                  {item.type === 'folder' ? <FolderGlyph /> : <FileGlyph />}
                </div>
                <div
                  style={{ flex: 1, minWidth: 0, cursor: item.type === 'folder' ? 'pointer' : 'default' }}
                  onClick={() => item.type === 'folder' && openFolder(item.name)}
                >
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 600, color: '#1a2e22',
                    textDecoration: item.type === 'folder' ? 'underline' : 'none',
                    textDecorationColor: '#d5e5df',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {item.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                    {item.type === 'folder' ? 'Folder' : formatBytes(item.size)}
                    {item.updated_at ? ` · ${formatDate(item.updated_at)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => (item.type === 'folder' ? deleteFolder(item) : deleteFile(item))}
                  disabled={deleting}
                  style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────
export default function Settings({ onLogout, onClose, userRole: propRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const activeRole = currentUser?.role || propRole || 'student';

  const getSectionsByRole = (role = '') => {
    const normalizedRole = role.toLowerCase();

    // Admin Settings
    if (normalizedRole === 'sysadmin' || normalizedRole === 'administrator') {
      return [
        { id: 'ocr', label: 'OCR Settings', icon: OcrIcon },
        { id: 'doctor', label: 'Doctor Settings', icon: DoctorIcon },
        { id: 'dentist', label: 'Dentist Settings', icon: DentistIcon },
        { id: 'storage', label: 'Storage Manager', icon: StorageIcon },
        { id: 'security', label: 'Security', icon: LockIcon },
        { id: 'system', label: 'System Config', icon: SystemIcon },
      ];
    }

    // Clinic Staff Settings
    if (['nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(normalizedRole)) {
      const staffSections = [];

      if (normalizedRole === 'doctor') {
        staffSections.push({ id: 'doctor', label: 'Doctor Settings', icon: DoctorIcon });
      }
      if (normalizedRole === 'dentist') {
        staffSections.push({ id: 'dentist', label: 'Dentist Settings', icon: DentistIcon });
      }

      staffSections.push(
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'data', label: 'Data & Privacy', icon: DataIcon },
        { id: 'general', label: 'General', icon: GeneralIcon },
      );

      return staffSections;
    }

    // Default / Student Settings
    return [
      { id: 'general', label: 'General', icon: GeneralIcon },
      { id: 'notifications', label: 'Notifications', icon: BellIcon },
      { id: 'support', label: 'Support', icon: SupportIcon },
      { id: 'about', label: 'About', icon: InfoIcon },
    ];
  };

  const sections = getSectionsByRole(activeRole);

  const initialTab = sections.some(s => s.id === location.state?.activeTab)
    ? location.state.activeTab
    : sections[0].id;

  const [activeSection, setActiveSection] = useState(initialTab);
  const [isMobile, setIsMobile] = useState(false);

  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [notifyProfileUpdate, setNotifyProfileUpdate] = useState(false);

  const [notifToggles, setNotifToggles] = useState({
    appointments: true,
    alerts: true,
    announcements: true,
  });

  useEffect(() => {
    if (location.state?.activeTab && sections.some(s => s.id === location.state.activeTab)) {
      setActiveSection(location.state.activeTab);
    }
  }, [location.state, sections]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleBack = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'ocr':
        return <OcrSettings />;

      case 'doctor':
        return <DoctorSettings />;

      case 'dentist':
        return <DentistSettings />;

      case 'storage':
        return <StorageSettings />;

      case 'security':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Admin Security</SectionLabel>
            <SectionCard>
              <Row label="Role-Based Access Policies" sub="Manage user permissions and roles" right={<button style={{ background: '#466460', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Manage</button>} />
              <Row label="Password Rules" sub="Configure complexity requirements" right={<button style={{ background: '#466460', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Configure</button>} />
              <Row label="Data Retention & Compliance" sub="View compliance logs and retention" last right={<button style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>View</button>} />
            </SectionCard>
          </div>
        );

      case 'system':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>System Configurations</SectionLabel>
            <SectionCard>
              <Row label="Backup Schedules" sub="Configure automated database backups" right={<button style={{ background: '#466460', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Schedule</button>} />
              <Row label="API Integrations" sub="Supabase, OCR Service, and Render hooks" right={<button style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Manage</button>} />
              <Row label="Audit & Logging" sub="Configure system tracking logs" last right={<button style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Configure</button>} />
            </SectionCard>
          </div>
        );

      case 'general':
        const isStaffOrAdmin = ['sysadmin', 'administrator', 'nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(activeRole.toLowerCase());

        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {isStaffOrAdmin && (
              <>
                <SectionLabel>System Preferences</SectionLabel>
                <SectionCard>
                  <Row
                    label="Active School Year"
                    sub="Set the current academic year for the entire clinic system"
                    right={
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={schoolYear}
                          onChange={(e) => setSchoolYear(e.target.value)}
                          style={{
                            background: '#f4f8f6', border: '1px solid #e2ebe8',
                            borderRadius: 10, padding: '6px 10px',
                            fontSize: 13, fontWeight: 600, color: '#1a2e22',
                            cursor: 'pointer', outline: 'none'
                          }}
                        >
                          <option value="2024-2025">2024-2025</option>
                          <option value="2025-2026">2025-2026</option>
                          <option value="2026-2027">2026-2027</option>
                          <option value="2027-2028">2027-2028</option>
                        </select>
                        <button
                          onClick={() => alert(`System School Year updated to ${schoolYear}`)}
                          style={{
                            background: '#466460', color: '#fff', border: 'none',
                            padding: '6px 12px', borderRadius: 10,
                            fontSize: 12, fontWeight: 700, cursor: 'pointer'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    }
                  />
                  <Row
                    label="Prompt Student Info Update"
                    sub="Notify students to update their section, year level, and details for the new school year"
                    last
                    right={
                      <Toggle
                        checked={notifyProfileUpdate}
                        onChange={() => {
                          const nextValue = !notifyProfileUpdate;
                          setNotifyProfileUpdate(nextValue);
                          if (nextValue) {
                            alert("Prompt turned ON: Students will be notified to update their year level and section on their next visit.");
                          }
                        }}
                      />
                    }
                  />
                </SectionCard>
              </>
            )}

            <SectionLabel>Appearance & Formatting</SectionLabel>
            <SectionCard>
              <Row label="Language" sub="Choose your preferred language" right={
                <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
                  <option>English</option>
                  <option>Filipino</option>
                </select>
              } />
              <Row label="Date Format" sub="How dates are displayed across the app" right={
                <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              } />
              <Row label="Theme" sub="Select light or dark mode" last right={
                <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              } />
            </SectionCard>
          </div>
        );

      case 'notifications':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Notification Preferences</SectionLabel>
            <SectionCard>
              <Row label="Appointment Reminders" sub="Get notified about upcoming appointments" right={<Toggle checked={notifToggles.appointments} onChange={() => setNotifToggles(p => ({ ...p, appointments: !p.appointments }))} />} />
              <Row label="System Alerts" sub="Critical system updates and notices" right={<Toggle checked={notifToggles.alerts} onChange={() => setNotifToggles(p => ({ ...p, alerts: !p.alerts }))} />} />
              <Row label="Announcement Push Settings" sub="General campus or clinic announcements" last right={<Toggle checked={notifToggles.announcements} onChange={() => setNotifToggles(p => ({ ...p, announcements: !p.announcements }))} />} />
            </SectionCard>
          </div>
        );

      case 'data':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Data & Privacy</SectionLabel>
            <SectionCard>
              <Row label="Data Sharing" sub="Allow anonymized data for health analytics" right={<Toggle checked={false} onChange={() => {}} />} />
              <Row label="Clear Cache" sub="Free up local storage used by the app" last right={<button style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Clear</button>} />
            </SectionCard>
          </div>
        );

      case 'support':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Get Help</SectionLabel>
            <SectionCard>
              <Row label="Help Center" sub="Browse FAQs and guides" right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Contact Support" sub="Reach out to the clinic team" right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Send Feedback" sub="Help us improve MediTrack" last right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
            </SectionCard>
          </div>
        );

      case 'about':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Application</SectionLabel>
            <SectionCard>
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <img src="./logo.jpg" alt="MediTrack Logo" style={{ height: 64, borderRadius: 16, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
                <h4 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e22', margin: '0 0 6px' }}>MediTrack</h4>
                <span style={{ display: 'inline-block', background: '#edf4f2', color: '#466460', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 40, marginBottom: 20 }}>Version 2.4.1</span>
                <p style={{ fontSize: 13, color: '#7a9e8e', lineHeight: 1.7, margin: '0 0 8px' }}>
                  A cross-platform student health record management system designed to make campus healthcare simple, secure, and accessible.
                </p>
                <p style={{ fontSize: 12, color: '#b0c8be', margin: 0 }}>© 2026 MediTrack. All rights reserved.</p>
              </div>
            </SectionCard>
            <SectionLabel>Team</SectionLabel>
            <SectionCard>
              <Row label="Contributors" sub="See the team behind MediTrack" last right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Mobile layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f8f6', overflow: 'hidden' }}>
        <div style={{ background: '#466460', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, height: 56, boxShadow: '0 2px 12px rgba(70,100,96,0.18)' }}>
          <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <BackIcon />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1 }}>Settings ({activeRole.charAt(0).toUpperCase() + activeRole.slice(1)})</span>
        </div>

        <div style={{ background: '#fff', borderBottom: '1px solid #e2ebe8', padding: '8px 8px 0', display: 'flex', justifyContent: 'space-around', flexShrink: 0, overflowX: 'auto' }}>
          {sections.map(({ id, label, icon: IconComponent }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{ flex: '1 0 auto', minWidth: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px 10px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: isActive ? `2.5px solid #466460` : '2.5px solid transparent', color: isActive ? '#466460' : '#94a3b8', transition: 'all 0.15s' }}
              >
                <div style={{ width: 20, height: 20 }}><IconComponent /></div>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f8f6', overflow: 'hidden' }}>
      <div style={{ background: '#466460', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, height: 60, boxShadow: '0 2px 16px rgba(70,100,96,0.2)' }}>
        <button
          onClick={handleBack}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <BackIcon />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Settings ({activeRole.charAt(0).toUpperCase() + activeRole.slice(1)})</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 220, background: '#fff', borderRight: '1px solid #e2ebe8', padding: '20px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sections.map(({ id, label, icon: IconComponent }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: isActive ? '#466460' : 'transparent', color: isActive ? '#fff' : '#6b8577', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 600, transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#edf4f2'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 18, height: 18, flexShrink: 0, color: isActive ? '#fff' : '#7a9e8e' }}>
                  <IconComponent />
                </div>
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\OcrSettings.jsx
import React, { useState, useEffect, useRef } from 'react';

const OCR_SERVICE_URL = (import.meta.env.VITE_OCR_SERVICE_URL || 'http://localhost:5001').replace(/\/$/, '');

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

const SectionCard = ({ children, style }) => (
  <div style={{
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #e2ebe8',
    overflow: 'hidden',
    ...style,
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

const Chip = ({ children, onRemove }) => (
  <span style={{
    background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
    padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 8,
  }}>
    {children}
    <button
      onClick={onRemove}
      style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}
      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
      onMouseLeave={e => e.currentTarget.style.color = '#047857'}
    >
      ✕
    </button>
  </span>
);

const RoleChip = ({ children, onRemove }) => (
  <span style={{
    background: '#fff', color: '#475569', border: '1px solid #cbd5e1',
    padding: '5px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }}>
    {children}
    <button
      onClick={onRemove}
      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: 0 }}
      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
      onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
    >
      ✕
    </button>
  </span>
);

export default function OcrSettings({ isMobile }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInstKeyword, setNewInstKeyword] = useState('');
  const [newRoleKeywords, setNewRoleKeywords] = useState({});
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const hasFetched = useRef(false);  // ← stops the fetch loop

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

  const containerStyle = { padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 };

  if (loading) {
    return (
      <div style={containerStyle}>
        <SectionLabel>OCR Settings</SectionLabel>
        <p style={{ fontSize: 13, color: '#7a9e8e' }}>Loading OCR settings...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={containerStyle}>
        <SectionLabel>OCR Settings</SectionLabel>
        <SectionCard style={{ padding: '18px 20px' }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, margin: 0 }}>
            Failed to connect to OCR Server at: <strong>{OCR_SERVICE_URL}</strong>
          </p>
          <p style={{ fontSize: 12, color: '#7a9e8e', margin: '8px 0 0' }}>
            Make sure the OCR server is running and CORS is enabled.
          </p>
        </SectionCard>
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
        <SectionLabel>OCR Settings</SectionLabel>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#466460', color: '#fff', border: 'none',
            padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Institution Triggers */}
      <SectionCard style={{ padding: isMobile ? '16px' : '20px 24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: 0 }}>Institution Triggers</p>
        <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 14px' }}>
          If the ID contains any of these words, the scanner will capture the rest of the line as the school/company name.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {config.institution_keywords.map((kw, idx) => (
            <Chip key={idx} onRemove={() => removeInstitutionKeyword(idx)}>{kw}</Chip>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
          <input
            type="text"
            value={newInstKeyword}
            onChange={e => setNewInstKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addInstitutionKeyword()}
            placeholder="e.g. DALUBHASAAN"
            style={{
              flex: 1, border: '1px solid #e2ebe8', borderRadius: 10,
              padding: '8px 12px', fontSize: 13, outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = '#466460'}
            onBlur={e => e.target.style.borderColor = '#e2ebe8'}
          />
          <button
            onClick={addInstitutionKeyword}
            style={{
              background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8',
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </SectionCard>

      {/* Role Detection Keywords */}
      <SectionCard style={{ padding: isMobile ? '16px' : '20px 24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: 0 }}>Role Detection Keywords</p>
        <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 14px' }}>
          Keywords used to assign a role to the scanned ID (e.g. "BSIT" = Student). Order matters — first match wins.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {config.role_mappings.map((mapping, mapIdx) => (
            <div
              key={mapIdx}
              style={{
                border: '1px solid #eef3f1', borderRadius: 14,
                padding: '14px 16px', background: '#f9fbfa',
              }}
            >
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 700, color: '#466460', fontSize: 13 }}>
                  {mapping.name}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>
                    ({mapping.id_type})
                  </span>
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {mapping.keywords.map((kw, kwIdx) => (
                  <RoleChip key={kwIdx} onRemove={() => removeRoleKeyword(mapIdx, kwIdx)}>{kw}</RoleChip>
                ))}
                <input
                  type="text"
                  value={newRoleKeywords[mapIdx] || ''}
                  onChange={e => setNewRoleKeywords(prev => ({ ...prev, [mapIdx]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addRoleKeyword(mapIdx)}
                  placeholder="+ Add Keyword"
                  style={{
                    background: 'transparent', border: '1px dashed #cbd5e1', borderRadius: 8,
                    padding: '5px 8px', fontSize: 11, width: 110, outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#466460'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
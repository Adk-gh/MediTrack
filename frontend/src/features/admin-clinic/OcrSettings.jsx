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


const ConfirmActionModal = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'save',
  busy = false,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  const isDelete = variant === 'delete';
  const accent = isDelete ? '#dc2626' : '#466460';
  const iconBackground = isDelete ? '#fee2e2' : '#e8f5ee';

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12000,
        background: 'rgba(15, 23, 42, 0.58)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ocr-confirm-title"
        style={{
          width: '100%',
          maxWidth: 385,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)',
          padding: '24px 24px 22px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: iconBackground,
            color: accent,
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          {isDelete ? '✕' : '✓'}
        </div>

        <h2
          id="ocr-confirm-title"
          style={{
            margin: 0,
            color: '#1e293b',
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: '12px 0 24px',
            color: '#64748b',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#475569',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.65 : 1,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              height: 44,
              border: 'none',
              borderRadius: 12,
              background: accent,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.72 : 1,
            }}
          >
            {busy ? (isDelete ? 'Removing...' : 'Saving...') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [confirmAction, setConfirmAction] = useState(null);
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
    const result = await res.json();

    if (!res.ok) {
      throw new Error(
        result.error ||
        result.message ||
        `Failed to load OCR configuration (${res.status})`
      );
    }

    const loadedConfig = result.config || result.data || result;

    setConfig({
      ...loadedConfig,
      institution_keywords: Array.isArray(loadedConfig.institution_keywords)
        ? loadedConfig.institution_keywords
        : [],
      role_mappings: Array.isArray(loadedConfig.role_mappings)
        ? loadedConfig.role_mappings
        : [],
    });
  } catch (error) {
    console.error('[OCR Settings] Failed to fetch config:', error);
    setConfig(null);
  } finally {
    setLoading(false);
  }
};

  const requestSave = () => {
    setConfirmAction({
      type: 'save',
      title: 'Save OCR Configuration?',
      message: 'This will apply the current institution and role-detection keyword changes to the OCR service.',
      confirmLabel: 'Save Changes',
      variant: 'save',
    });
  };

const handleSave = async () => {
  setConfirmAction(null);
  setSaving(true);

  try {
    /*
     * Include keywords that are still typed inside the input boxes.
     * This means the user no longer needs to press Enter before Save.
     */
    const roleMappingsToSave = (config.role_mappings || []).map(
      (mapping, mapIdx) => {
        const pendingKeyword = String(
          newRoleKeywords[mapIdx] || ''
        )
          .trim()
          .toUpperCase();

        const existingKeywords = Array.isArray(mapping.keywords)
          ? mapping.keywords
              .map(keyword =>
                String(keyword).trim().toUpperCase()
              )
              .filter(Boolean)
          : [];

        const mergedKeywords =
          pendingKeyword &&
          !existingKeywords.includes(pendingKeyword)
            ? [...existingKeywords, pendingKeyword]
            : existingKeywords;

        return {
          ...mapping,
          keywords: mergedKeywords,
        };
      }
    );

    /*
     * Also include an Institution Trigger that is still typed
     * inside its input when Save Changes is clicked.
     */
    const pendingInstitutionKeyword = String(
      newInstKeyword || ''
    )
      .trim()
      .toUpperCase();

    const existingInstitutionKeywords = Array.isArray(
      config.institution_keywords
    )
      ? config.institution_keywords
          .map(keyword =>
            String(keyword).trim().toUpperCase()
          )
          .filter(Boolean)
      : [];

    const institutionKeywordsToSave =
      pendingInstitutionKeyword &&
      !existingInstitutionKeywords.includes(
        pendingInstitutionKeyword
      )
        ? [
            ...existingInstitutionKeywords,
            pendingInstitutionKeyword,
          ]
        : existingInstitutionKeywords;

    const configToSave = {
      ...config,
      institution_keywords: institutionKeywordsToSave,
      role_mappings: roleMappingsToSave,
    };

    console.log(
      '[OCR Settings] Configuration being saved:',
      configToSave
    );

    const res = await fetch(`${OCR_SERVICE_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(configToSave),
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok || result.success === false) {
      throw new Error(
        result.error ||
          result.message ||
          `Failed to save OCR configuration (${res.status})`
      );
    }

    /*
     * Use the backend response when available.
     * Otherwise, use the exact configuration sent.
     */
    const savedConfig =
      result.config ||
      result.data ||
      configToSave;

    setConfig({
      ...savedConfig,
      institution_keywords: Array.isArray(
        savedConfig.institution_keywords
      )
        ? savedConfig.institution_keywords
        : [],
      role_mappings: Array.isArray(
        savedConfig.role_mappings
      )
        ? savedConfig.role_mappings
        : [],
    });

    // Clear all pending input boxes after saving.
    setNewInstKeyword('');
    setNewRoleKeywords({});

    showToast(
      'OCR Configuration saved successfully!',
      'success'
    );
  } catch (error) {
    console.error(
      '[OCR Settings] Failed to save configuration:',
      error
    );

    showToast(
      error.message ||
        'Failed to save OCR configuration.',
      'error'
    );
  } finally {
    setSaving(false);
  }
};

const addInstitutionKeyword = () => {
  const value = String(newInstKeyword || '')
    .trim()
    .toUpperCase();

  if (!value) return;

  setConfig(previous => {
    const currentKeywords = Array.isArray(
      previous.institution_keywords
    )
      ? previous.institution_keywords.map(keyword =>
          String(keyword).trim().toUpperCase()
        )
      : [];

    if (currentKeywords.includes(value)) {
      return previous;
    }

    return {
      ...previous,
      institution_keywords: [
        ...currentKeywords,
        value,
      ],
    };
  });

  setNewInstKeyword('');
};

  const requestRemoveInstitutionKeyword = (index) => {
    const keyword = config?.institution_keywords?.[index] || 'this keyword';

    setConfirmAction({
      type: 'removeInstitutionKeyword',
      index,
      title: 'Remove Institution Keyword?',
      message: `Are you sure you want to remove "${keyword}"? The change will take effect after you save the OCR configuration.`,
      confirmLabel: 'Remove',
      variant: 'delete',
    });
  };

  const removeInstitutionKeyword = (index) => {
    setConfig(prev => ({
      ...prev,
      institution_keywords: prev.institution_keywords.filter((_, i) => i !== index)
    }));
  };

const addRoleKeyword = mapIdx => {
  const value = String(
    newRoleKeywords[mapIdx] || ''
  )
    .trim()
    .toUpperCase();

  if (!value) return;

  setConfig(previous => ({
    ...previous,
    role_mappings: previous.role_mappings.map(
      (mapping, index) => {
        if (index !== mapIdx) return mapping;

        const currentKeywords = Array.isArray(
          mapping.keywords
        )
          ? mapping.keywords.map(keyword =>
              String(keyword).trim().toUpperCase()
            )
          : [];

        if (currentKeywords.includes(value)) {
          return mapping;
        }

        return {
          ...mapping,
          keywords: [...currentKeywords, value],
        };
      }
    ),
  }));

  setNewRoleKeywords(previous => ({
    ...previous,
    [mapIdx]: '',
  }));
};

  const requestRemoveRoleKeyword = (mapIdx, kwIdx) => {
    const mapping = config?.role_mappings?.[mapIdx];
    const keyword = mapping?.keywords?.[kwIdx] || 'this keyword';

    setConfirmAction({
      type: 'removeRoleKeyword',
      mapIdx,
      kwIdx,
      title: 'Remove Role Keyword?',
      message: `Are you sure you want to remove "${keyword}" from ${mapping?.name || 'this role'}? The change will take effect after you save.`,
      confirmLabel: 'Remove',
      variant: 'delete',
    });
  };

  const removeRoleKeyword = (mapIdx, kwIdx) => {
    setConfig(prev => ({
      ...prev,
      role_mappings: prev.role_mappings.map((mapping, i) =>
        i !== mapIdx ? mapping : { ...mapping, keywords: mapping.keywords.filter((_, j) => j !== kwIdx) }
      )
    }));
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'save') {
      handleSave();
      return;
    }

    if (confirmAction.type === 'removeInstitutionKeyword') {
      removeInstitutionKeyword(confirmAction.index);
    }

    if (confirmAction.type === 'removeRoleKeyword') {
      removeRoleKeyword(confirmAction.mapIdx, confirmAction.kwIdx);
    }

    setConfirmAction(null);
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

      <ConfirmActionModal
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant}
        busy={saving}
        onCancel={() => {
          if (!saving) setConfirmAction(null);
        }}
        onConfirm={handleConfirmAction}
      />

      {/* Header row: label left, Save Changes right — mirrors Security pattern */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>OCR Settings</SectionLabel>
        <button
          onClick={requestSave}
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
            <Chip key={idx} onRemove={() => requestRemoveInstitutionKeyword(idx)}>{kw}</Chip>
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
                  <RoleChip key={kwIdx} onRemove={() => requestRemoveRoleKeyword(mapIdx, kwIdx)}>{kw}</RoleChip>
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
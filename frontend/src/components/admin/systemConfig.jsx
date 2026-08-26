// C:\Users\HP\MediTrack\frontend\src\components\admin\SystemConfig.jsx

import React, { useState, useEffect, useRef } from 'react';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

// ─── Default Rules ──────────────────────────────────────────────────────────

const DEFAULT_PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: true,
};

// ─── Local UI Helpers ────────────────────────────────────────────────────────

const Snackbar = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ef4444' : '#10b981',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontFamily: 'helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none', border: 'none', color: '#fff',
          cursor: 'pointer', padding: '0 4px', fontSize: 20, lineHeight: 1,
        }}
      >
        &times;
      </button>
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
    save: {
      accent: '#466460',
      soft: '#e8f5ee',
      icon: '✓',
    },
    edit: {
      accent: '#2563eb',
      soft: '#dbeafe',
      icon: '✎',
    },
    delete: {
      accent: '#e5262d',
      soft: '#fee2e2',
      icon: '↪',
    },
    warning: {
      accent: '#d97706',
      soft: '#fef3c7',
      icon: '!',
    },
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
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(15, 23, 42, 0.54)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 384,
          background: '#fff',
          borderRadius: 18,
          padding: '24px 24px 22px',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            margin: '0 auto 17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.soft,
            color: colors.accent,
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          {colors.icon}
        </div>

        <h3
          id="settings-confirm-title"
          style={{
            margin: 0,
            color: '#1e293b',
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: '12px 0 22px',
            color: '#718096',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              height: 45,
              border: 'none',
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#526277',
              fontSize: 13,
              fontWeight: 700,
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
              height: 45,
              border: 'none',
              borderRadius: 12,
              background: colors.accent,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : confirmText}
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
        open={open}
        title="Delete Item?"
        message={`Are you sure you want to delete ${itemLabel}? This change will be applied when you save.`}
        confirmText="Delete"
        tone="delete"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm?.();
        }}
      />
    </>
  );
};

const SectionCard = ({ children }) => (
  <div
    style={{
      background: '#fff', borderRadius: 20, border: '1px solid #e2ebe8', overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const Row = ({ label, sub, right, last }) => (
  <div
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px', borderBottom: last ? 'none' : '1px solid #eef3f1', gap: 12,
    }}
  >
    <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && (
        <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>
      )}
    </div>
    {right}
  </div>
);

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11, fontWeight: 800, color: '#466460', textTransform: 'uppercase',
      letterSpacing: 1, margin: '0 0 8px 4px',
    }}
  >
    {children}
  </p>
);

const pillButtonStyle = (bg, color, disabled) => ({
  background: bg, color, border: 'none', padding: '0 20px', height: 38,
  borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
});

const inputStyle = {
  border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 14px', height: 38,
  fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%',
  color: '#1a2e22', background: '#fff',
};

const Toggle = ({ checked, onChange, disabled = false }) => (
  <button
    type="button" role="switch" aria-checked={checked} disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      width: 44, height: 24, padding: 2, border: 'none', borderRadius: 20,
      background: checked ? '#466460' : '#cbd8d3', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'background 0.2s ease', flexShrink: 0,
    }}
  >
    <span
      style={{
        display: 'block', width: 20, height: 20, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
      }}
    />
  </button>
);

const PasswordRuleItem = ({ label, description, checked, onChange, last = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 15, padding: '13px 14px', borderBottom: last ? 'none' : '1px solid #eef3f1' }}>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a2e22' }}>{label}</p>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#7a9e8e', lineHeight: 1.4 }}>{description}</p>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// ─── Modal Layout Component ──────────────────────────────────────────────────

const ModalLayout = ({ isMobile, title, subtitle, onClose, onSave, saving, children }) => (
  <div
    onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 30, 24, 0.48)',
      display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20,
    }}
  >
    <div
      style={{
        width: '100%', maxWidth: 580, maxHeight: isMobile ? '92dvh' : '90vh',
        display: 'flex', flexDirection: 'column', background: '#fff',
        borderRadius: isMobile ? '22px 22px 0 0' : 22, boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #eef3f1', background: '#fff', zIndex: 2, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a2e22' }}>{title}</h2>
            {subtitle && <p style={{ margin: '5px 0 0', fontSize: 12, color: '#7a9e8e', lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          <button
            type="button" disabled={saving} onClick={onClose}
            style={{
              width: 32, height: 32, border: 'none', borderRadius: '50%', background: '#f4f8f6',
              color: '#466460', fontSize: 20, lineHeight: 1, cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {children}
      </div>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #eef3f1', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#fff', flexShrink: 0 }}>
        <button type="button" disabled={saving} onClick={onClose} style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '0 20px', height: 38, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>Cancel</button>
        <button type="button" disabled={saving} onClick={onSave} style={{ background: saving ? '#91aaa1' : '#466460', color: '#fff', border: 'none', padding: '0 20px', height: 38, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
);

// ─── Editors ─────────────────────────────────────────────────────────────────

const ConfigArrayEditor = ({ title, description, items = [], onChange, placeholder = 'Add new item...' }) => {
  const [newVal, setNewVal] = useState('');
  const safeItems = Array.isArray(items) ? items : [];

  const handleAdd = () => {
    const value = newVal.trim();
    if (!value) return;
    if (safeItems.some(item => String(item).toLowerCase() === value.toLowerCase())) return;
    onChange([...safeItems, value]);
    setNewVal('');
  };

  const handleKeyDown = e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } };
  const handleRemove = idx => onChange(safeItems.filter((_, i) => i !== idx));

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: '0 0 4px' }}>{title}</h3>
      <p style={{ fontSize: 12, color: '#7a9e8e', margin: '0 0 16px' }}>{description}</p>

      {safeItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {safeItems.map((item, idx) => (
            <span key={`${item}-${idx}`} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {item}
              <ConfirmableRemoveButton
                label="✕"
                itemLabel={`"${item}"`}
                onConfirm={() => handleRemove(idx)}
                style={{ background: 'none', border: 'none', color: '#064e3b', cursor: 'pointer', padding: 0 }}
              />
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={handleAdd} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Add</button>
      </div>
    </div>
  );
};

const SectionsEditor = ({ sections = [], onChange }) => {
  const [newSection, setNewSection] = useState('');
  const safeSections = Array.isArray(sections) ? sections : [];

  const handleSectionChange = e => setNewSection(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase());

  const handleAdd = () => {
    const value = newSection.trim().toUpperCase();
    if (!value || !/^[A-Z]+$/.test(value)) return;
    if (safeSections.some(section => String(section).toUpperCase() === value)) return;
    onChange([...safeSections, value]);
    setNewSection('');
  };

  const handleKeyDown = e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } };
  const handleRemove = idx => onChange(safeSections.filter((_, i) => i !== idx));

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: '0 0 4px' }}>Sections</h3>
      <p style={{ fontSize: 12, color: '#7a9e8e', margin: '0 0 16px' }}>List of available student sections. Letters only (A, B, C...)</p>

      {safeSections.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {safeSections.map((section, idx) => (
            <span key={`${section}-${idx}`} style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {section}
              <ConfirmableRemoveButton
                label="✕"
                itemLabel={`"${section}"`}
                onConfirm={() => handleRemove(idx)}
                style={{ background: 'none', border: 'none', color: '#064e3b', cursor: 'pointer', padding: 0 }}
              />
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={newSection} onChange={handleSectionChange} onKeyDown={handleKeyDown} placeholder="Section letter..." maxLength={10} style={{ ...inputStyle, flex: 1, textTransform: 'uppercase' }} />
        <button type="button" onClick={handleAdd} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Add</button>
      </div>
    </div>
  );
};

const ConfigObjectEditor = ({ title, description, obj = {}, onChange, keyPlaceholder, valPlaceholder }) => {
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const safeObject = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};

  const handleAdd = () => {
    const key = newKey.trim().toLowerCase();
    const value = newVal.trim();
    if (!key || !value) return;
    onChange({ ...safeObject, [key]: value });
    setNewKey('');
    setNewVal('');
  };

  const handleKeyDown = e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } };

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: '0 0 4px' }}>{title}</h3>
      <p style={{ fontSize: 12, color: '#7a9e8e', margin: '0 0 16px' }}>{description}</p>

      {Object.keys(safeObject).length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {Object.entries(safeObject).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', border: '1px solid #e2ebe8', padding: '8px 14px', borderRadius: 10 }}>
              <span style={{ fontWeight: 700, color: '#466460', fontSize: 13, width: 120 }}>{key}</span>
              <span style={{ color: '#1a2e22', fontSize: 13, flex: 1 }}>{val}</span>
              <ConfirmableRemoveButton
                label="Delete"
                itemLabel={`the "${key}" mapping`}
                onConfirm={() => {
                  const copy = { ...safeObject };
                  delete copy[key];
                  onChange(copy);
                }}
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px', height: 28, borderRadius: 14, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder={keyPlaceholder} style={{ ...inputStyle, width: 140 }} />
        <input type="text" value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={handleKeyDown} placeholder={valPlaceholder} style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={handleAdd} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Add</button>
      </div>
    </div>
  );
};

const ConfigDeptEditor = ({ departments = [], onChange }) => {
  const handleAddDept = () => onChange([{ abbr: '', full: '', programs: [] }, ...departments]);
  const updateDept = (idx, field, val) => {
    const copy = [...departments];
    copy[idx] = { ...copy[idx], [field]: val };
    onChange(copy);
  };
  const removeDept = (idx) => {
    const copy = [...departments];
    copy.splice(idx, 1);
    onChange(copy);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22', margin: 0 }}>Academic Departments List</h3>
        <button type="button" onClick={handleAddDept} style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '0 16px', height: 32, borderRadius: 16, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Dept</button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {departments.map((dept, idx) => (
          <div key={idx} style={{ border: '1px solid #e2ebe8', borderRadius: 16, padding: 20, background: '#f8fafc' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ width: 100, flexGrow: 1 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Abbreviation</label>
                <input type="text" value={dept.abbr || ''} onChange={(e) => updateDept(idx, 'abbr', e.target.value)} placeholder="e.g. CCSE" style={{ ...inputStyle }} />
              </div>
              <div style={{ flex: 3, minWidth: 200 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Full Name</label>
                <input type="text" value={dept.full || ''} onChange={(e) => updateDept(idx, 'full', e.target.value)} placeholder="e.g. College of Computer Engineering" style={{ ...inputStyle }} />
              </div>
              <ConfirmableRemoveButton
                label="Remove"
                itemLabel={`the "${dept.abbr || dept.full || 'unnamed'}" department`}
                onConfirm={() => removeDept(idx)}
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 16px', height: 38, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              />
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2ebe8', padding: 20, borderRadius: 12 }}>
              <ConfigArrayEditor title={`Programs for ${dept.abbr || 'Department'}`} description="List of programs available under this department." items={dept.programs || []} onChange={(newPrograms) => updateDept(idx, 'programs', newPrograms)} />
            </div>
          </div>
        ))}
        {departments.length === 0 && (
          <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No departments configured yet.<br />Click <strong>+ Add Dept</strong> to create one.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Individual Modals ───────────────────────────────────────────────────────

const PasswordRulesModal = ({ isMobile, initialRules, onClose, onSave, saving }) => {
  const [rules, setRules] = useState(initialRules || DEFAULT_PASSWORD_RULES);
  const updateRule = (key, value) => setRules(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    const minLength = Number(rules.minLength);
    if (!Number.isInteger(minLength) || minLength < 4 || minLength > 128) {
      alert('Minimum password length must be between 4 and 128.');
      return;
    }
    onSave({ password_rules: { ...rules, minLength } });
  };

  return (
    <ModalLayout isMobile={isMobile} title="Password Rules" subtitle="Configure the password requirements for MediTrack users." onClose={onClose} onSave={handleSave} saving={saving}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1a2e22', marginBottom: 6 }}>Minimum Password Length</label>
        <input type="number" min="4" max="128" value={rules.minLength} onChange={(e) => updateRule('minLength', e.target.value)} disabled={saving} style={{ ...inputStyle }} />
        <p style={{ fontSize: 11, color: '#7a9e8e', margin: '6px 0 0' }}>Choose a value between 4 and 128 characters.</p>
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2e22', margin: '0 0 8px' }}>Character Requirements</p>
        <div style={{ border: '1px solid #e2ebe8', borderRadius: 14, overflow: 'hidden' }}>
          <PasswordRuleItem label="Uppercase Letter" description="Require at least one uppercase letter (A-Z)" checked={rules.requireUppercase} onChange={(val) => updateRule('requireUppercase', val)} />
          <PasswordRuleItem label="Lowercase Letter" description="Require at least one lowercase letter (a-z)" checked={rules.requireLowercase} onChange={(val) => updateRule('requireLowercase', val)} />
          <PasswordRuleItem label="Number" description="Require at least one number (0-9)" checked={rules.requireNumber} onChange={(val) => updateRule('requireNumber', val)} />
          <PasswordRuleItem label="Special Character" description="Require at least one special character" checked={rules.requireSpecialCharacter} onChange={(val) => updateRule('requireSpecialCharacter', val)} last />
        </div>
      </div>
      <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2ebe8' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#466460', textTransform: 'uppercase', letterSpacing: 0.6 }}>Current Policy</p>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#526e64', lineHeight: 1.5 }}>
          Passwords must contain at least <strong>{rules.minLength || 0}</strong> characters
          {rules.requireUppercase ? ', one uppercase letter' : ''}{rules.requireLowercase ? ', one lowercase letter' : ''}
          {rules.requireNumber ? ', one number' : ''}{rules.requireSpecialCharacter ? ', and one special character' : ''}.
        </p>
      </div>
    </ModalLayout>
  );
};

const DepartmentsModal = ({ isMobile, initialDepartments, onClose, onSave, saving }) => {
  const [departments, setDepartments] = useState(initialDepartments || []);
  return (
    <ModalLayout isMobile={isMobile} title="Departments & Programs" subtitle="Configure the colleges and their associated programs." onClose={onClose} onSave={() => onSave({ departments })} saving={saving}>
      <ConfigDeptEditor departments={departments} onChange={setDepartments} />
    </ModalLayout>
  );
};

const OfficesSectionsModal = ({ isMobile, initialOffices, initialSections, onClose, onSave, saving }) => {
  const [offices, setOffices] = useState(initialOffices || []);
  const [sections, setSections] = useState(initialSections || []);
  return (
    <ModalLayout isMobile={isMobile} title="Offices & Sections" subtitle="Configure non-academic offices and student sections." onClose={onClose} onSave={() => onSave({ non_academic_offices: offices, sections })} saving={saving}>
      <ConfigArrayEditor title="Non-Academic Offices" description="List of available offices for staff assignments." items={offices} onChange={setOffices} placeholder="Add office..." />
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <SectionsEditor sections={sections} onChange={setSections} />
    </ModalLayout>
  );
};

const RolesModal = ({ isMobile, config, onClose, onSave, saving }) => {
  const [adminRoles, setAdminRoles] = useState(config.admin_roles || []);
  const [clinicRoles, setClinicRoles] = useState(config.clinic_roles || []);
  const [facultyRoles, setFacultyRoles] = useState(config.faculty_roles || []);
  const [staffRoles, setStaffRoles] = useState(config.staff_roles || []); // Added staff_roles
  const [classifications, setClassifications] = useState(config.classifications || {});
  const [jobTitles, setJobTitles] = useState(config.job_titles || {});

  return (
    <ModalLayout isMobile={isMobile} title="Roles & Classifications" subtitle="Manage internal system roles and title mappings." onClose={onClose} onSave={() => onSave({ admin_roles: adminRoles, clinic_roles: clinicRoles, faculty_roles: facultyRoles, staff_roles: staffRoles, classifications, job_titles: jobTitles })} saving={saving}>
      <ConfigArrayEditor title="Admin Roles" description="Internal system roles that grant admin privileges." items={adminRoles} onChange={setAdminRoles} placeholder="Add admin role..." />
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <ConfigArrayEditor title="Clinic Roles" description="Internal system roles that grant clinic staff privileges." items={clinicRoles} onChange={setClinicRoles} placeholder="Add clinic role..." />
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <ConfigArrayEditor title="Faculty Roles" description="Roles recognized as academic faculty." items={facultyRoles} onChange={setFacultyRoles} placeholder="Add faculty role..." />
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <ConfigArrayEditor title="Staff Roles" description="Roles recognized as non-teaching staff." items={staffRoles} onChange={setStaffRoles} placeholder="Add staff role..." /> {/* Added staff_roles editor */}
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <ConfigObjectEditor title="Classifications Mapping" description="Maps a specific role to its broader personnel classification." obj={classifications} keyPlaceholder="Role (e.g. nurse)" valPlaceholder="Classification (e.g. Nurse Personnel)" onChange={setClassifications} />
      <hr style={{ border: 'none', borderTop: '1px solid #eef3f1', margin: '0' }} />
      <ConfigObjectEditor title="Job Titles Mapping" description="Maps a specific role to its formal Job Title display name." obj={jobTitles} keyPlaceholder="Role (e.g. sysadmin)" valPlaceholder="Title (e.g. System Administrator)" onChange={setJobTitles} />
    </ModalLayout>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SystemConfigSettings({ isMobile }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const hasFetched = useRef(false);

  // Modals visibility state
  const [activeModal, setActiveModal] = useState(null);
  const [pendingSaveFields, setPendingSaveFields] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  const containerStyle = {
    padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20,
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchConfig();
  }, []);

const fetchConfig = async () => {
    setLoading(true);
    try {
      // 1. Get the token
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      // 2. Attach the Authorization header
      const res = await fetch(`${API_URL}/system-config`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to load configuration.');

      const data = result.data || {};
      setConfig({
        departments: Array.isArray(data.departments) ? data.departments : [],
        non_academic_offices: Array.isArray(data.non_academic_offices) ? data.non_academic_offices : [],
        sections: Array.isArray(data.sections) ? data.sections : [],
        admin_roles: Array.isArray(data.admin_roles) ? data.admin_roles : [],
        clinic_roles: Array.isArray(data.clinic_roles) ? data.clinic_roles : [],
        faculty_roles: Array.isArray(data.faculty_roles) ? data.faculty_roles : [],
        staff_roles: Array.isArray(data.staff_roles) ? data.staff_roles : [], // Added staff_roles to fetch
        classifications: data.classifications && typeof data.classifications === 'object' && !Array.isArray(data.classifications) ? data.classifications : {},
        job_titles: data.job_titles && typeof data.job_titles === 'object' && !Array.isArray(data.job_titles) ? data.job_titles : {},
        password_rules: { ...DEFAULT_PASSWORD_RULES, ...(data.password_rules || {}) },
      });
    } catch (error) {
      console.error('Failed to fetch system config:', error);
      setConfig(null);
      showToast('Failed to load system configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

const performSaveModal = async (updatedFields) => {
    if (!config || saving) return;
    setSaving(true);

    try {
      // 1. Get the token
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token not found.');

      // 2. Attach the Authorization header alongside Content-Type
      const res = await fetch(`${API_URL}/system-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedFields),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result?.message || 'Failed to save configuration.');
      }

      // Update the local React state with the newly saved fields
      setConfig(prev => ({ ...prev, ...updatedFields }));
      setActiveModal(null);
      showToast('System Configuration updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast(error.message || 'Failed to save configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestSaveModal = (updatedFields) => {
    if (!updatedFields || saving) return;
    setPendingSaveFields(updatedFields);
  };

  const confirmSaveModal = async () => {
    if (!pendingSaveFields) return;
    const fieldsToSave = pendingSaveFields;
    setPendingSaveFields(null);
    await performSaveModal(fieldsToSave);
  };

  // Summary generators
  const getPasswordRuleSummary = () => {
    if (!config?.password_rules) return 'Loading...';
    const reqs = [];
    if (config.password_rules.requireUppercase) reqs.push('uppercase');
    if (config.password_rules.requireLowercase) reqs.push('lowercase');
    if (config.password_rules.requireNumber) reqs.push('number');
    if (config.password_rules.requireSpecialCharacter) reqs.push('special character');
    return reqs.length === 0 ? `Minimum ${config.password_rules.minLength} characters` : `Minimum ${config.password_rules.minLength} characters • ${reqs.join(', ')}`;
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <SectionLabel>System Configuration</SectionLabel>
        <p style={{ fontSize: 13, color: '#7a9e8e' }}>Loading system configuration...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={containerStyle}>
        <SectionLabel>System Configuration</SectionLabel>
        <SectionCard>
          <div style={{ padding: '24px 18px' }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 600 }}>Failed to connect to the backend API.</p>
            <button type="button" onClick={fetchConfig} style={{ ...pillButtonStyle('#466460', '#fff', false), marginTop: 12 }}>Retry</button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      {toast.show && <Snackbar message={toast.text} type={toast.type} onClose={() => setToast({ show: false, text: '', type: 'success' })} />}

      <SectionLabel>System Configuration</SectionLabel>

      <SectionCard>
        <Row
          label="Password Rules"
          sub={getPasswordRuleSummary()}
          right={<button type="button" onClick={() => setActiveModal('password')} style={pillButtonStyle('#466460', '#fff', false)}>Configure</button>}
        />
        <Row
          label="Departments & Programs"
          sub={`${config.departments.length} departments configured`}
          right={<button type="button" onClick={() => setActiveModal('departments')} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Configure</button>}
        />
        <Row
          label="Offices & Sections"
          sub={`${config.non_academic_offices.length} offices, ${config.sections.length} sections`}
          right={<button type="button" onClick={() => setActiveModal('offices')} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Configure</button>}
        />
        <Row
          label="Roles & Classifications"
          sub={`${config.admin_roles.length} admin, ${config.clinic_roles.length} clinic, ${config.faculty_roles.length} faculty, ${config.staff_roles.length} staff roles`}
          last
          right={<button type="button" onClick={() => setActiveModal('roles')} style={pillButtonStyle('#f4f8f6', '#466460', false)}>Configure</button>}
        />
      </SectionCard>

      {/* Render Active Modal */}
      {activeModal === 'password' && (
        <PasswordRulesModal isMobile={isMobile} initialRules={config.password_rules} onClose={() => setActiveModal(null)} onSave={requestSaveModal} saving={saving} />
      )}
      {activeModal === 'departments' && (
        <DepartmentsModal isMobile={isMobile} initialDepartments={config.departments} onClose={() => setActiveModal(null)} onSave={requestSaveModal} saving={saving} />
      )}
      {activeModal === 'offices' && (
        <OfficesSectionsModal isMobile={isMobile} initialOffices={config.non_academic_offices} initialSections={config.sections} onClose={() => setActiveModal(null)} onSave={requestSaveModal} saving={saving} />
      )}
      {activeModal === 'roles' && (
        <RolesModal isMobile={isMobile} config={config} onClose={() => setActiveModal(null)} onSave={requestSaveModal} saving={saving} />
      )}

      <ActionConfirmModal
        open={Boolean(pendingSaveFields)}
        title="Save System Configuration?"
        message="This will apply the edited configuration across MediTrack. Existing users and forms may immediately use the new values."
        confirmText="Save Changes"
        tone="save"
        loading={saving}
        onCancel={() => setPendingSaveFields(null)}
        onConfirm={confirmSaveModal}
      />
    </div>
  );
}
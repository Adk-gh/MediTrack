// C:\Users\HP\MediTrack\frontend\src\components\Settings.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ─── Environment Variables ────────────────────────────────────────────────────
const OCR_SERVICE_URL = (import.meta.env.VITE_OCR_SERVICE_URL || 'http://localhost:5001').replace(/\/$/, '');

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

// ─── Shared Components ────────────────────────────────────────────────────────
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
  const hasFetched = useRef(false);

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
      alert('OCR Configuration saved successfully!');
    } catch (error) {
      alert('Failed to save config. Make sure the OCR server is running.');
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
    <div style={{ padding: '24px', width: '100%', height: '100%', overflowY: 'auto' }}>
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

// ─── Main Settings Component ──────────────────────────────────────────────────
export default function Settings({ onLogout, onClose, userRole: propRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Force the component to check localStorage directly for the role
  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const activeRole = currentUser?.role || propRole || 'student';

  // Role-Based Section Definitions
  const getSectionsByRole = (role = '') => {
    const normalizedRole = role.toLowerCase();

    // Admin Settings
    if (normalizedRole === 'sysadmin' || normalizedRole === 'administrator') {
      return [
        { id: 'ocr', label: 'OCR Settings', icon: OcrIcon },
        { id: 'security', label: 'Security', icon: LockIcon },
        { id: 'system', label: 'System Config', icon: SystemIcon },
      ];
    }

    // Clinic Staff Settings
    if (['nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(normalizedRole)) {
      return [
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'data', label: 'Data & Privacy', icon: DataIcon },
        { id: 'general', label: 'General', icon: GeneralIcon },
      ];
    }

    // Else (Student & Defaults)
    return [
      { id: 'general', label: 'General', icon: GeneralIcon },
      { id: 'notifications', label: 'Notifications', icon: BellIcon },
      { id: 'support', label: 'Support', icon: SupportIcon },
      { id: 'about', label: 'About', icon: InfoIcon },
    ];
  };

  const sections = getSectionsByRole(activeRole);

  // Default to the first section available to the role if invalid tab is passed
  const initialTab = sections.some(s => s.id === location.state?.activeTab)
    ? location.state.activeTab
    : sections[0].id;

  const [activeSection, setActiveSection] = useState(initialTab);
  const [isMobile, setIsMobile] = useState(false);

  // New States
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
        // Determine if the current user should see the System Preferences block
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
                <img src="/logo.jpg" alt="MediTrack Logo" style={{ height: 64, borderRadius: 16, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
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
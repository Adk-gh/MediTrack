// C:\Users\HP\MediTrack\frontend\src\components\clinic\generalSettings.jsx
import React, { useState } from 'react';

// ─── Local UI Helpers ────────────────────────────────────────────────────────
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

export default function GeneralSettings({ isMobile, activeRole }) {
  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [notifyProfileUpdate, setNotifyProfileUpdate] = useState(false);

  const isStaffOrAdmin = ['sysadmin', 'administrator', 'nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(activeRole?.toLowerCase());

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
}
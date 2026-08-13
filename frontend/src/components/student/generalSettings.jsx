import React from 'react';

// ─── Local UI Helpers ────────────────────────────────────────────────────────
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

export default function StudentGeneralSettings({ isMobile }) {
  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Appearance & Formatting</SectionLabel>
      <SectionCard>
        <Row
          label="Language"
          sub="Choose your preferred language"
          right={
            <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
              <option>English</option>
              <option>Filipino</option>
            </select>
          }
        />
        <Row
          label="Date Format"
          sub="How dates are displayed across the app"
          right={
            <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
              <option>MM/DD/YYYY</option>
              <option>DD/MM/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          }
        />
        <Row
          label="Theme"
          sub="Select light or dark mode"
          last
          right={
            <select style={{ background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 600, color: '#1a2e22', cursor: 'pointer', outline: 'none' }}>
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          }
        />
      </SectionCard>
    </div>
  );
}
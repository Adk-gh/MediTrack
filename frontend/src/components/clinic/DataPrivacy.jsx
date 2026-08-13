// C:\Users\HP\MediTrack\frontend\src\components\clinic\DataPrivacy.jsx
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

export default function DataAndPrivacy({ isMobile }) {
  const [dataSharing, setDataSharing] = useState(false);

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Data & Privacy</SectionLabel>
      <SectionCard>
        <Row
          label="Data Sharing"
          sub="Allow anonymized data for health analytics"
          right={<Toggle checked={dataSharing} onChange={() => setDataSharing(!dataSharing)} />}
        />
        <Row
          label="Clear Cache"
          sub="Free up local storage used by the app"
          last
          right={
            <button
              onClick={() => alert('Local cache cleared!')}
              style={{ background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Clear
            </button>
          }
        />
      </SectionCard>
    </div>
  );
}
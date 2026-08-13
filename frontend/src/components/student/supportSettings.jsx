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
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafa'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
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

export default function StudentSupportSettings({ isMobile }) {
  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Get Help</SectionLabel>
      <SectionCard>
        <Row
          label="Help Center"
          sub="Browse FAQs and guides"
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
        <Row
          label="Contact Support"
          sub="Reach out to the clinic team"
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
        <Row
          label="Send Feedback"
          sub="Help us improve MediTrack"
          last
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
      </SectionCard>
    </div>
  );
}
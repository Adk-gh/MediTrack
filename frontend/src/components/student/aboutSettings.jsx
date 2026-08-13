import React from 'react';
// Make sure this relative path is correct based on your folder structure
import logo from '../../assets/logo.jpg';

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

export default function StudentAboutSettings({ isMobile }) {
  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Application</SectionLabel>
      <SectionCard>
        <div style={{ padding: '32px 20px', textAlign: 'center' }}>
          <img src={logo} alt="MediTrack Logo" style={{ height: 64, borderRadius: 16, marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e22', margin: '0 0 6px' }}>MediTrack</h4>
          <span style={{ display: 'inline-block', background: '#edf4f2', color: '#466460', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 40, marginBottom: 20 }}>
            Version 2.4.1
          </span>
          <p style={{ fontSize: 13, color: '#7a9e8e', lineHeight: 1.7, margin: '0 0 8px' }}>
            A cross-platform student health record management system designed to make campus healthcare simple, secure, and accessible.
          </p>
          <p style={{ fontSize: 12, color: '#b0c8be', margin: 0 }}>© 2026 MediTrack. All rights reserved.</p>
        </div>
      </SectionCard>

      <SectionLabel>Team</SectionLabel>
      <SectionCard>
        <Row
          label="Contributors"
          sub="See the team behind MediTrack"
          last
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
      </SectionCard>
    </div>
  );
}
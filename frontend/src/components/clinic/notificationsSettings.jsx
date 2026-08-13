// C:\Users\HP\MediTrack\frontend\src\components\clinic\notificationsSettings.jsx
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

export default function NotificationsSettings({ isMobile }) {
  const [notifToggles, setNotifToggles] = useState({
    appointments: true,
    alerts: true,
    announcements: true,
  });

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionLabel>Notification Preferences</SectionLabel>
      <SectionCard>
        <Row
          label="Appointment Reminders"
          sub="Get notified about upcoming appointments"
          right={<Toggle checked={notifToggles.appointments} onChange={() => setNotifToggles(p => ({ ...p, appointments: !p.appointments }))} />}
        />
        <Row
          label="System Alerts"
          sub="Critical system updates and notices"
          right={<Toggle checked={notifToggles.alerts} onChange={() => setNotifToggles(p => ({ ...p, alerts: !p.alerts }))} />}
        />
        <Row
          label="Announcement Push Settings"
          sub="General campus or clinic announcements"
          last
          right={<Toggle checked={notifToggles.announcements} onChange={() => setNotifToggles(p => ({ ...p, announcements: !p.announcements }))} />}
        />
      </SectionCard>
    </div>
  );
}
// C:\Users\HP\MediTrack\frontend\src\components\Settings.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

// ─── Toggle Switch ────────────────────────────────────────────────────────────
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

// ─── Notification Settings Data ───────────────────────────────────────────────
const NOTIFICATION_SETTINGS = [
  { key: 'appointments', label: 'Appointment Reminders',  sub: 'Get notified about upcoming appointments' },
  { key: 'email',        label: 'Email Notifications',    sub: 'Receive updates via email' },
  { key: 'consult',      label: 'Consultation Updates',   sub: 'Get notified about consultation status' },
];

const SECURITY_SETTINGS = [
  { label: 'Change Password',           sub: 'Update your account password',   action: 'Update' },
  { label: 'Two-Factor Authentication', sub: 'Add an extra layer of security',  action: 'Enable' },
];

// ─── Section Card Wrapper ─────────────────────────────────────────────────────
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

// ─── Row ─────────────────────────────────────────────────────────────────────
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

// ─── Section Label ────────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460',
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Settings({ onLogout, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(location.state?.activeTab || 'general');
  const [isMobile, setIsMobile] = useState(false);
  const [notifToggles, setNotifToggles] = useState({
    appointments: true,
    email: true,
    consult: true,
  });

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveSection(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sections = [
    { id: 'general',       label: 'General',       icon: GeneralIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security',      label: 'Security',      icon: LockIcon },
    { id: 'about',         label: 'About',         icon: InfoIcon },
  ];

  // ── Back handler: use onClose if opened from drawer, else navigate ────────
  const handleBack = () => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      navigate('/student/meditrack');
    }
  };

  // ── Content renderer ─────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Appearance</SectionLabel>
            <SectionCard>
              <Row
                label="Language"
                sub="Choose your preferred language"
                right={
                  <select style={{
                    background: '#f4f8f6', border: '1px solid #e2ebe8',
                    borderRadius: 10, padding: '6px 10px',
                    fontSize: 13, fontWeight: 600, color: '#1a2e22',
                    cursor: 'pointer', outline: 'none',
                  }}>
                    <option>English</option>
                    <option>Filipino</option>
                  </select>
                }
              />
              <Row
                label="Date Format"
                sub="How dates are displayed across the app"
                last
                right={
                  <select style={{
                    background: '#f4f8f6', border: '1px solid #e2ebe8',
                    borderRadius: 10, padding: '6px 10px',
                    fontSize: 13, fontWeight: 600, color: '#1a2e22',
                    cursor: 'pointer', outline: 'none',
                  }}>
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                }
              />
            </SectionCard>

            <SectionLabel>Data & Privacy</SectionLabel>
            <SectionCard>
              <Row
                label="Data Sharing"
                sub="Allow anonymized data for health analytics"
                right={<Toggle checked={false} onChange={() => {}} />}
              />
              <Row
                label="Clear Cache"
                sub="Free up local storage used by the app"
                last
                right={
                  <button style={{
                    background: '#f4f8f6', color: '#466460',
                    border: '1px solid #e2ebe8', padding: '8px 16px',
                    borderRadius: 20, fontSize: 12,
                    fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>
                    Clear
                  </button>
                }
              />
            </SectionCard>

            <SectionLabel>Support</SectionLabel>
            <SectionCard>
              <Row label="Help Center"      sub="Browse FAQs and guides"              last={false} right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Contact Support"  sub="Reach out to the clinic team"        last={false} right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Send Feedback"    sub="Help us improve MediTrack"           last       right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
            </SectionCard>
          </div>
        );

      case 'notifications':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Notification Preferences</SectionLabel>
            <SectionCard>
              {NOTIFICATION_SETTINGS.map(({ key, label, sub }, i) => (
                <Row
                  key={key}
                  label={label}
                  sub={sub}
                  last={i === NOTIFICATION_SETTINGS.length - 1}
                  right={
                    <Toggle
                      checked={notifToggles[key]}
                      onChange={() => setNotifToggles(prev => ({ ...prev, [key]: !prev[key] }))}
                    />
                  }
                />
              ))}
            </SectionCard>

            <SectionLabel>Push Alerts</SectionLabel>
            <SectionCard>
              <Row
                label="Sound"
                sub="Play a sound for new notifications"
                right={<Toggle checked onChange={() => {}} />}
              />
              <Row
                label="Vibration"
                sub="Vibrate on mobile devices"
                last
                right={<Toggle checked={false} onChange={() => {}} />}
              />
            </SectionCard>
          </div>
        );

      case 'security':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Account Security</SectionLabel>
            <SectionCard>
              {SECURITY_SETTINGS.map(({ label, sub, action }, i) => (
                <Row
                  key={label}
                  label={label}
                  sub={sub}
                  last={i === SECURITY_SETTINGS.length - 1}
                  right={
                    <button style={{
                      background: '#466460', color: '#fff',
                      border: 'none', padding: '8px 16px',
                      borderRadius: 20, fontSize: 12,
                      fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                      {action}
                    </button>
                  }
                />
              ))}
            </SectionCard>

            <SectionLabel>Session</SectionLabel>
            <SectionCard>
              <Row
                label="Active Sessions"
                sub="Manage devices logged into your account"
                last
                right={
                  <button style={{
                    background: '#fef2f2', color: '#dc2626',
                    border: '1px solid #fecaca', padding: '8px 16px',
                    borderRadius: 20, fontSize: 12,
                    fontWeight: 700, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>
                    View
                  </button>
                }
              />
            </SectionCard>
          </div>
        );

      case 'about':
        return (
          <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionLabel>Application</SectionLabel>
            <SectionCard>
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <img
                  src="/logo.jpg"
                  alt="MediTrack Logo"
                  style={{ height: 64, borderRadius: 16, marginBottom: 16, display: 'block', margin: '0 auto 16px' }}
                />
                <h4 style={{ fontSize: 22, fontWeight: 800, color: '#1a2e22', margin: '0 0 6px' }}>MediTrack</h4>
                <span style={{
                  display: 'inline-block',
                  background: '#edf4f2', color: '#466460',
                  fontSize: 11, fontWeight: 700,
                  padding: '4px 14px', borderRadius: 40,
                  marginBottom: 20,
                }}>
                  Version 2.4.1
                </span>
                <p style={{ fontSize: 13, color: '#7a9e8e', lineHeight: 1.7, margin: '0 0 8px' }}>
                  A cross-platform student health record management system designed to make campus healthcare simple, secure, and accessible.
                </p>
                <p style={{ fontSize: 12, color: '#b0c8be', margin: 0 }}>
                  © 2026 MediTrack. All rights reserved.
                </p>
              </div>
            </SectionCard>

            <SectionLabel>Legal</SectionLabel>
            <SectionCard>
              <Row label="Privacy Policy"       sub="How we handle your data"        last={false} right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Terms of Service"     sub="Usage terms and conditions"     last={false} right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
              <Row label="Open Source Licenses" sub="Third-party libraries used"     last        right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>} />
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

        {/* Mobile Top Bar */}
        <div style={{
          background: '#466460',
          padding: '0 12px',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
          height: 56,
          boxShadow: '0 2px 12px rgba(70,100,96,0.18)',
        }}>
          <button
            onClick={handleBack}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none', color: '#fff',
              width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <BackIcon />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1 }}>Settings</span>
        </div>

        {/* Mobile Tab Bar */}
        <div style={{
          background: '#fff',
          borderBottom: '1px solid #e2ebe8',
          padding: '8px 8px 0',
          display: 'flex',
          justifyContent: 'space-around',
          flexShrink: 0,
        }}>
          {sections.map(({ id, label, icon: IconComponent }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '8px 4px 10px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: isActive ? `2.5px solid #466460` : '2.5px solid transparent',
                  color: isActive ? '#466460' : '#94a3b8',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 20, height: 20 }}><IconComponent /></div>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {renderContent()}
        </div>
      </div>
    );
  }

  // ── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f8f6', overflow: 'hidden' }}>

      {/* Desktop Top Bar */}
      <div style={{
        background: '#466460',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 14,
        flexShrink: 0,
        height: 60,
        boxShadow: '0 2px 16px rgba(70,100,96,0.2)',
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none', color: '#fff',
            width: 38, height: 38, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <BackIcon />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>Settings</span>
      </div>

      {/* Desktop Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{
          width: 220,
          background: '#fff',
          borderRight: '1px solid #e2ebe8',
          padding: '20px 12px',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {sections.map(({ id, label, icon: IconComponent }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 12,
                  background: isActive ? '#466460' : 'transparent',
                  color: isActive ? '#fff' : '#6b8577',
                  border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontSize: 14, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
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

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
// C:\Users\HP\MediTrack\frontend\src\components\Settings.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ─── Imported Admin Components ────────────────────────────────────────────────
import SystemConfigSettings from './admin/systemConfig';
import StorageManager from './admin/storageManager';
import SecuritySettings from './admin/securitySettings';
import OcrSettings from '../features/admin-clinic/OcrSettings'; // Updated Path
import DoctorSettings from './admin/DoctorSettings';
import DentistSettings from './admin/DentistSettings';

// ─── Imported Clinic Components ───────────────────────────────────────────────
import ClinicGeneralSettings from './clinic/generalSettings';
import ClinicNotificationsSettings from './clinic/notificationsSettings';
import DataAndPrivacy from './clinic/DataPrivacy';

// ─── Imported Student Components ──────────────────────────────────────────────
import StudentGeneralSettings from './student/generalSettings';
import StudentNotificationSettings from './student/NotificationSettings';
import StudentSupportSettings from './student/supportSettings';
import StudentAboutSettings from './student/aboutSettings';

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

const DoctorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12 22v-4M12 22a4 4 0 0 0 4-4V6M12 22a4 4 0 0 1-4-4V6M16 6a4 4 0 0 0-8 0M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

const DentistIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M8 3c-1.5 0-2.5 1-2.5 2.5 0 1 .5 2 1.5 3v6.5c0 2 1.5 3 2.5 3 .5 0 1-.5 1.5-1.5L12 14l1 2.5c.5 1 1 1.5 1.5 1.5 1 0 2.5-1 2.5-3V8.5c1-1 1.5-2 1.5-3C18.5 4 17.5 3 16 3c-1.5 0-2.5 1-2.5 2.5C13.5 4 12.5 3 12 3s-1.5 1-1.5 2.5C10.5 4 9.5 3 8 3z" />
  </svg>
);

const StorageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M3 10h18" />
  </svg>
);


// ─── Main Settings Component ──────────────────────────────────────────────────
export default function Settings({ onLogout, onClose, userRole: propRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const activeRole = currentUser?.role || propRole || 'student';
  const isStaffOrAdmin = ['sysadmin', 'administrator', 'nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(activeRole.toLowerCase());

  const getSectionsByRole = (role = '') => {
    const normalizedRole = role.toLowerCase();

    // Admin Settings
    if (normalizedRole === 'sysadmin' || normalizedRole === 'administrator') {
      return [
        { id: 'ocr', label: 'OCR Settings', icon: OcrIcon },
        { id: 'doctor', label: 'Doctor Settings', icon: DoctorIcon },
        { id: 'dentist', label: 'Dentist Settings', icon: DentistIcon },
        { id: 'storage', label: 'Storage Manager', icon: StorageIcon },
        { id: 'security', label: 'Security', icon: LockIcon },
        { id: 'system', label: 'System Config', icon: SystemIcon },
      ];
    }

    // Clinic Staff Settings
    if (['nurse', 'doctor', 'dentist', 'staff', 'registrar'].includes(normalizedRole)) {
      const staffSections = [];

      if (normalizedRole === 'doctor') {
        staffSections.push({ id: 'doctor', label: 'Doctor Settings', icon: DoctorIcon });
      }
      if (normalizedRole === 'dentist') {
        staffSections.push({ id: 'dentist', label: 'Dentist Settings', icon: DentistIcon });
      }

      staffSections.push(
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'data', label: 'Data & Privacy', icon: DataIcon },
        { id: 'general', label: 'General', icon: GeneralIcon },
      );

      return staffSections;
    }

    // Default / Student Settings
    return [
      { id: 'general', label: 'General', icon: GeneralIcon },
      { id: 'notifications', label: 'Notifications', icon: BellIcon },
      { id: 'support', label: 'Support', icon: SupportIcon },
      { id: 'about', label: 'About', icon: InfoIcon },
    ];
  };

  const sections = getSectionsByRole(activeRole);

  const initialTab = sections.some(s => s.id === location.state?.activeTab)
    ? location.state.activeTab
    : sections[0].id;

  const [activeSection, setActiveSection] = useState(initialTab);
  const [isMobile, setIsMobile] = useState(false);

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
      // ── Admin Components ──
      case 'ocr':
        return <OcrSettings />;
      case 'doctor':
        return <DoctorSettings />;
      case 'dentist':
        return <DentistSettings />;
      case 'storage':
        return <StorageManager />;
      case 'security':
        return <SecuritySettings isMobile={isMobile} />;
      case 'system':
        return <SystemConfigSettings />;

      // ── Shared/Split Components ──
      case 'general':
        return isStaffOrAdmin
          ? <ClinicGeneralSettings isMobile={isMobile} activeRole={activeRole} />
          : <StudentGeneralSettings isMobile={isMobile} activeRole={activeRole} />;

      case 'notifications':
        return isStaffOrAdmin
          ? <ClinicNotificationsSettings isMobile={isMobile} />
          : <StudentNotificationSettings isMobile={isMobile} />;

      case 'data':
        return <DataAndPrivacy isMobile={isMobile} />;

      // ── Student Components ──
      case 'support':
        return <StudentSupportSettings isMobile={isMobile} />;

      case 'about':
        return <StudentAboutSettings isMobile={isMobile} />;

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
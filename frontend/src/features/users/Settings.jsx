import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProfileUsers from './Profile-users.jsx';

// Settings icons
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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

export default function Settings({ onLogout }) {
  const location = useLocation();

  // Set initial state from navigation props if available, otherwise default to 'profile'
  const [activeSection, setActiveSection] = useState(location.state?.activeTab || 'profile');
  const [isMobile, setIsMobile] = useState(false);

  // Listen for navigation state changes
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
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Security', icon: LockIcon },
    { id: 'about', label: 'About', icon: InfoIcon },
  ];

  // Mobile: horizontal scrollable tabs (icons only)
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile Tab Bar - Icons only */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-white px-2 py-2">
          <div className="flex justify-around">
            {sections.map((section) => {
              const IconComponent = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-[#466460]'
                      : 'text-slate-400'
                  }`}
                >
                  <div className={`w-6 h-6 ${isActive ? 'text-[#466460]' : 'text-slate-400'}`}>
                    <IconComponent />
                  </div>
                  <span className={`text-[9px] font-medium ${isActive ? 'text-[#466460]' : 'text-slate-400'}`}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'profile' && (
            <ProfileUsers onLogout={onLogout} />
          )}
          {activeSection === 'notifications' && (
            <div className="p-4">
              <h3 className="text-base font-bold text-slate-800 mb-4">Notification Settings</h3>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-semibold text-slate-700">Appointment Reminders</p>
                    <p className="text-xs text-slate-500">Get notified about upcoming appointments</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-semibold text-slate-700">Email Notifications</p>
                    <p className="text-xs text-slate-500">Receive updates via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-semibold text-slate-700">Consultation Updates</p>
                    <p className="text-xs text-slate-500">Get notified about consultation status</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'security' && (
            <div className="p-4">
              <h3 className="text-base font-bold text-slate-800 mb-4">Security Settings</h3>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-semibold text-slate-700">Change Password</p>
                    <p className="text-xs text-slate-500">Update your account password</p>
                  </div>
                  <button className="text-[#466460] text-sm font-medium hover:underline whitespace-nowrap">
                    Update
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 pr-3">
                    <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-500">Add an extra layer of security</p>
                  </div>
                  <button className="text-[#466460] text-sm font-medium hover:underline whitespace-nowrap">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeSection === 'about' && (
            <div className="p-4">
              <h3 className="text-base font-bold text-slate-800 mb-4">About MediTrack</h3>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="text-center py-6">
                  <img
                    src="/logo.jpg"
                    alt="MediTrack Logo"
                    className="h-14 mx-auto mb-4 rounded-xl"
                  />
                  <h4 className="text-lg font-bold text-slate-800">MediTrack</h4>
                  <p className="text-sm text-slate-500 mt-1">Version 2.4.1</p>
                  <p className="text-xs text-slate-400 mt-4 px-4">
                    A cross-platform student health record management system.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    © 2026 MediTrack. All rights reserved.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: sidebar layout
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-56 border-r border-slate-100 bg-slate-50 p-3 flex-shrink-0">
        <h2 className="text-lg font-bold text-slate-800 px-3 mb-4">Settings</h2>
        <nav className="space-y-1">
          {sections.map((section) => {
            const IconComponent = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-[#466460] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                  <IconComponent />
                </div>
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeSection === 'profile' && (
          <ProfileUsers onLogout={onLogout} />
        )}
        {activeSection === 'notifications' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Notification Settings</h3>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Appointment Reminders</p>
                  <p className="text-xs text-slate-500">Get notified about upcoming appointments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Email Notifications</p>
                  <p className="text-xs text-slate-500">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Consultation Updates</p>
                  <p className="text-xs text-slate-500">Get notified about consultation status</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#466460]"></div>
                </label>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'security' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Security Settings</h3>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Change Password</p>
                  <p className="text-xs text-slate-500">Update your account password</p>
                </div>
                <button className="text-[#466460] text-sm font-medium hover:underline">
                  Update
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Two-Factor Authentication</p>
                  <p className="text-xs text-slate-500">Add an extra layer of security</p>
                </div>
                <button className="text-[#466460] text-sm font-medium hover:underline">
                  Enable
                </button>
              </div>
            </div>
          </div>
        )}
        {activeSection === 'about' && (
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">About MediTrack</h3>
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="text-center py-6">
                <img
                  src="/logo.jpg"
                  alt="MediTrack Logo"
                  className="h-16 mx-auto mb-4 rounded-xl"
                />
                <h4 className="text-xl font-bold text-slate-800">MediTrack</h4>
                <p className="text-sm text-slate-500 mt-1">Version 2.4.1</p>
                <p className="text-xs text-slate-400 mt-4">
                  A cross-platform student health record management system.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  © 2026 MediTrack. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
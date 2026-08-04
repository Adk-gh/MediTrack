// C:\Users\HP\MediTrack\frontend\src\components\Headers.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service.js';
import { useLoading } from '../context/LoadingContext.jsx';
import DatePicker from './Datepicker.jsx';
import AddressModal from './AddressModal.jsx';
import { NotificationBell, NotificationPanel } from './Notifications.jsx';
import notificationsService from '../services/notifications.service.js';
import Settings from './Settings.jsx';

import { supabase } from '../supabase';

// ─── Synchronous Role Helper ─────────────────────────────────────────────────
const getStoredUserRole = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      let role = user.role?.toLowerCase() || '';

      if (!role || role === 'student') {
        const classification = user.classification?.toLowerCase() || '';
        const jobTitle = user.job_title?.toLowerCase() || '';

        if (classification === 'dentist' || jobTitle.includes('dentist')) {
          return 'dentist';
        } else if (classification === 'doctor' || jobTitle.includes('doctor')) {
          return 'doctor';
        } else if (classification === 'nurse' || jobTitle.includes('nurse')) {
          return 'nurse';
        } else if (classification === 'System Administrator') {
          return 'sysadmin';
        }
      }

      if (role && ['sysadmin', 'doctor', 'dentist', 'nurse'].includes(role)) {
        return role;
      }
    }
  } catch (e) {
    ('Error reading user role:', e);
  }

  return null;
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M9 22V12h6v10" />
  </svg>
);

export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const ConsultIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const RecordsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

export const AccountIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const ExamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

export const AnnouncementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const ApprovalsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const DefaultIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

// ─── Dental History static data ───────────────────────────────────────────────
const DENTAL_PROCEDURES = [
  'Oral Prophylaxis', 'Filling / Restoration', 'Extraction',
  'Drug Sensitivity / Allergy', 'Pulp Therapy', 'Periodontal Therapy',
  'Orthodontic Therapy', 'TMJ Treatment', 'Prosthodontic Therapy',
];

// ── UI Components for Drawer ──────────────────────────────────────────────────
const DrawerEditableInfoRow = ({ icon, label, field, nestedField, value, type = 'text', options, isEditing, onChange }) => {
  const displayValue = value || '';
  return (
    <div className="flex items-center justify-between py-2 text-xs border-b border-slate-50 last:border-0 gap-3 min-h-[40px]">
      <div className="flex items-center gap-2.5 text-slate-500 shrink-0 min-w-[110px]">
        <i className={`fa-solid ${icon} text-[#466460] w-4 text-center opacity-70 flex-shrink-0`}></i>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      {isEditing ? (
        options ? (
          <select
            value={displayValue}
            onChange={(e) => onChange(field, e.target.value, nestedField)}
            className="flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 transition-all"
          >
            <option value="">Select...</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={displayValue}
            onChange={(e) => onChange(field, e.target.value, nestedField)}
            className="flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 transition-all"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words min-w-0 flex-1">{displayValue || '—'}</span>
      )}
    </div>
  );
};

const DrawerSectionHeader = ({ label, color = 'text-slate-400' }) => (
  <div className={`text-[9px] font-extrabold uppercase tracking-widest ${color} mb-3`}>{label}</div>
);

// ── Safely parses values that might come back as stringified JSON from Postgres
// We use a while loop because sometimes data gets double-stringified (e.g. '"{\\"key\\": \\"value\\"}"')
const parseJsonIfNeeded = (val, fieldName = 'unknown') => {
  (`[parseJsonIfNeeded - ${fieldName}] Raw Input:`, val, '| Type:', typeof val);

  if (!val) return val;

  let currentVal = val;
  // Keep parsing as long as it's a string that looks like JSON
  while (typeof currentVal === 'string') {
    try {
      const parsed = JSON.parse(currentVal);
      if (typeof parsed === 'object' || Array.isArray(parsed)) {
        currentVal = parsed;
      } else if (typeof parsed === 'string') {
        currentVal = parsed; // Might be double-stringified
      } else {
        break;
      }
    } catch (e) {
      // It's just a regular string, stop parsing
      break;
    }
  }

  (`[parseJsonIfNeeded - ${fieldName}] Final Output:`, currentVal);
  return currentVal;
};

// ── Ensures formData always has fully-shaped nested objects
const withProfileDefaults = (p = {}) => {
  ('[withProfileDefaults] Initial Profile DB Object:', p);

  // Grab values prioritizing snake_case (direct from DB)
  const rawVac = p.vaccinations_history || p.vaccinations;
  const rawDent = p.dental_history || p.dentalHistory;
  const rawSurg = p.surgical_history || p.surgicalHistory;
  const rawEmerg = p.emergency_contact || p.emergencyContact;

  const vac = parseJsonIfNeeded(rawVac, 'vaccinations') || {};
  const rawDental = parseJsonIfNeeded(rawDent, 'dentalHistory') || {};
  const rawSurgical = parseJsonIfNeeded(rawSurg, 'surgicalHistory');
  const emergencyContact = parseJsonIfNeeded(rawEmerg, 'emergencyContact') || {};

  // Structure Dental History safely
  const dentalHistory = {
    lastVisit: rawDental.lastVisit || '',
    prevDentist: rawDental.prevDentist || '',
    procedures: rawDental.procedures || {},
    declined: rawDental.declined || false,
  };

  // Structure Surgical History safely (Handle array default '[]' vs Object from form)
  let surgicalHistory = { operations: [], declined: false };
  if (Array.isArray(rawSurgical)) {
    surgicalHistory.operations = rawSurgical;
  } else if (rawSurgical && typeof rawSurgical === 'object') {
    surgicalHistory.operations = rawSurgical.operations || [];
    surgicalHistory.declined = rawSurgical.declined || false;
  }

  ('[withProfileDefaults] Processed Dental:', dentalHistory);
  ('[withProfileDefaults] Processed Surgical:', surgicalHistory);

  return {
    ...p,
    emergencyContact,
    vaccinations: {
      dose1: vac.dose1 || { vaccineName: '', date: '' },
      dose2: vac.dose2 || { vaccineName: '', date: '' },
      booster1: vac.booster1 || { vaccineName: '', date: '' },
      booster2: vac.booster2 || { vaccineName: '', date: '' },
      history: vac.history || '',
      declined: { dose1: false, dose2: false, booster1: false, booster2: false, history: false, ...(vac.declined || {}) },
    },
    dentalHistory,
    surgicalHistory,
  };
};

// ─── Profile Drawer ───────────────────────────────────────────────────────────
export function ProfileDrawer({ isOpen, onClose, onLogout, userProfile, forceBottomSheet = false, onProfileUpdate }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState(null);
  const [editData, setEditData] = React.useState({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({});
  const [showSettings, setShowSettings] = React.useState(false);
  const [vaccinationsDeclined, setVaccinationsDeclined] = React.useState({ dose1: false, dose2: false, booster1: false, booster2: false, history: false });
  const [dentalDeclined, setDentalDeclined] = React.useState(false);
  const [surgicalDeclined, setSurgicalDeclined] = React.useState(false);
  const [showAddressModal, setShowAddressModal] = React.useState(false);
  const [addressType, setAddressType] = React.useState(null);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const sheetRef = React.useRef(null);

  const { showLoading, hideLoading } = useLoading();

  React.useEffect(() => {
    if (isOpen) {
      ('----- DRAWER OPENING: PROCESSING PROFILE DATA -----');
      setIsMounted(true);
      const normalizedProfile = withProfileDefaults(userProfile || {});
      setFormData(normalizedProfile);
      setEditingSection(null);
      setDragY(0);
      setVaccinationsDeclined(normalizedProfile.vaccinations?.declined || { dose1: false, dose2: false, booster1: false, booster2: false, history: false });
      setDentalDeclined(normalizedProfile.dentalHistory?.declined || false);
      setSurgicalDeclined(normalizedProfile.surgicalHistory?.declined || false);
    }
  }, [isOpen, userProfile]);

  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || forceBottomSheet);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [forceBottomSheet]);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta < 0) {
      setDragY(delta / 4);
    } else {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    setIsDragging(false);
    const sheetHeight = sheetRef.current?.offsetHeight || window.innerHeight * 0.92;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = dragY / elapsed;
    const DISMISS_THRESHOLD = sheetHeight * 0.3;
    const VELOCITY_THRESHOLD = 0.5;
    if (dragY > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (!isMounted) return null;

  const userRole = formData.role?.toLowerCase() || 'user';
  const isStudent = userRole === 'student';

  const nameParts = [
    formData.firstName,
    formData.middleName || '',
    formData.lastName,
    formData.suffix || '',
  ].filter(Boolean);
  const displayName = nameParts.length > 0 ? nameParts.join(' ') : 'User';

  const vaccineDoseCount = formData.vaccinations
    ? Object.values(formData.vaccinations).filter(d => d?.vaccineName).length
    : 0;

  const VACCINE_DOSE_KEYS = [
    { key: 'dose1',    label: 'Dose 1'    },
    { key: 'dose2',    label: 'Dose 2'    },
    { key: 'booster1', label: 'Booster 1' },
    { key: 'booster2', label: 'Booster 2' },
  ];

  const NON_ACADEMIC_OFFICES = [
    'Accounting Office',
    'University Clinic',
    'Human Resources',
    'Library',
    'Maintenance',
    'Registrar Office',
    'Security Services',
  ];

  const isCurrentUserSysAdmin = ['sysadmin', 'administrator', 'admin'].includes(userRole);

  const CLASSIFICATIONS = [
    'Teaching Personnel',
    'Nurse Personnel',
    'Dentist',
    'Physician / Doctor',
    ...(isCurrentUserSysAdmin ? ['System Administrator'] : []),
    'Non-Teaching Personnel',
    'Security Personnel',
  ];

  const JOB_TITLES = [
    'Nurse',
    'Physician',
    'Dentist',
    'Administrator',
    'Lecturer',
    'Professor',
    'Instructor',
    'Librarian',
    'Technician',
    'Security Guard',
    'Staff',
  ];

  const SUFFIXES = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

  const toTitleCase = (str) => {
    if (!str) return '';
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  };

  const isValidPhoneNumber = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
    if (digits.startsWith('63')) return '0' + digits.substring(2);
    if (digits.length === 11 && digits.startsWith('09')) return digits;
    return digits;
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const today = new Date();
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age > 0 ? age.toString() : '';
  };

  const getSectionFields = (section, isStudentUser) => {
    const sectionFields = {
      personal: [
        'firstName', 'middleName', 'lastName', 'suffix',
        'birthday', 'age', 'sex', 'bloodType',
        'civilStatus', 'religion', 'nationality', 'homeAddress'
      ],
      professional: isStudentUser
        ? ['universityId', 'department', 'program', 'yearLevel', 'section', 'studentClassification']
        : ['universityId', 'classification', 'department', 'jobTitle', 'licenseNumber'],
      contact: ['email', 'phoneNumber'],
      emergency: ['emergencyContact'],
      vaccinations: ['vaccinations'],
      dental: ['dentalHistory'],
      surgical: ['surgicalHistory'],
    };
    return sectionFields[section] || [];
  };

  const extractSectionData = (sectionData, section, isStudentUser) => {
    const fields = getSectionFields(section, isStudentUser);
    const result = {};
    fields.forEach(field => {
      const value = sectionData[field];
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null) {
          const hasValues = Object.values(value).some(v => v !== undefined && v !== null && v !== '');
          if (hasValues) result[field] = value;
        } else if (value !== '') {
          result[field] = value;
        }
      }
    });
    return result;
  };

  const openEdit = (section) => {
    setEditData(JSON.parse(JSON.stringify(formData)));
    setEditingSection(section);
    setVaccinationsDeclined(formData.vaccinations?.declined || { dose1: false, dose2: false, booster1: false, booster2: false, history: false });
    setDentalDeclined(formData.dentalHistory?.declined || false);
    setSurgicalDeclined(formData.surgicalHistory?.declined || false);
  };

  const closeEdit = () => {
    setEditingSection(null);
    setEditData({});
  };

  const handleChange = (field, value) => {
    if (field === 'birthday') {
      const calculatedAge = calculateAge(value);
      setEditData(prev => ({ ...prev, birthday: value, age: calculatedAge }));
    } else {
      setEditData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setEditData(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
  };

  const handleVaccineChange = (key, field, value) => {
    setEditData(prev => ({
      ...prev,
      vaccinations: {
        ...(prev.vaccinations || {}),
        [key]: { ...(prev.vaccinations?.[key] || {}), [field]: value },
        declined: vaccinationsDeclined,
      },
    }));
  };

  const handleDentalHistoryUpdate = (newDh) => {
    setEditData(prev => ({ ...prev, dentalHistory: newDh }));
  };

  const handleDentalProcChange = (proc, value) => {
    setEditData(prev => ({
      ...prev,
      dentalHistory: { ...prev.dentalHistory, procedures: { ...(prev.dentalHistory?.procedures || {}), [proc]: value } },
    }));
  };

  const handleCovidHistoryChange = (value) => {
    setEditData(prev => ({ ...prev, vaccinations: { ...prev.vaccinations, history: value } }));
  };

  const handleAddOperation = () => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: [...(prev.surgicalHistory?.operations || []), { id: crypto.randomUUID(), operation: '', date: '', notes: '' }],
    },
  }));

  const handleRemoveOperation = (id) => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: (prev.surgicalHistory?.operations || []).filter(op => op.id !== id),
    },
  }));

  const handleOperationChange = (id, field, value) => setEditData(prev => ({
    ...prev,
    surgicalHistory: {
      ...prev.surgicalHistory,
      operations: (prev.surgicalHistory?.operations || []).map(op => op.id === id ? { ...op, [field]: value } : op),
    },
  }));

  const handleVaxDeclineChange = (key, checked) => {
    setVaccinationsDeclined(prev => {
      const updated = { ...prev, [key]: checked };
      setEditData(prevData => ({
        ...prevData,
        vaccinations: {
          ...(prevData.vaccinations || {}),
          declined: updated,
        },
      }));
      return updated;
    });
  };

  const saveProfileEdits = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const sectionData = extractSectionData(editData, editingSection, isStudent);

      if (sectionData.dentalHistory) {
        sectionData.dental_history = sectionData.dentalHistory;
      }
      if (sectionData.surgicalHistory) {
        sectionData.surgical_history = sectionData.surgicalHistory;
      }

      ('[ProfileDrawer] Saving section:', editingSection, 'with data:', sectionData);

      if (Object.keys(sectionData).length === 0) {
        alert('No changes to save');
        setIsSaving(false);
        return;
      }

      if (sectionData.email && sectionData.email !== formData.email) {
        try {
          const { error: emailErr } = await supabase.auth.updateUser({ email: sectionData.email });
          if (emailErr) {
            alert(`Error updating email: ${emailErr.message}`);
            setIsSaving(false);
            return;
          }
        } catch (emailErr) {
          alert(`Error updating email: ${emailErr.message}`);
          setIsSaving(false);
          return;
        }
      }

      const res = await fetch(`${API_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      const updatedProfile = { ...formData, ...data.data };
      setFormData(withProfileDefaults(updatedProfile));

      if (onProfileUpdate) onProfileUpdate(updatedProfile);

      closeEdit();
    } catch (err) {
      ('Error updating profile:', err);
      alert('Error updating profile.');
    }
    setIsSaving(false);
  };

  const isBottomSheet = isMobile;

  const sheetTransform = isBottomSheet
    ? isOpen
      ? `translateY(${dragY}px)`
      : 'translateY(100%)'
    : isOpen
      ? 'translateX(0)'
      : 'translateX(100%)';

  const backdropOpacity = isBottomSheet && isDragging
    ? Math.max(0, 0.4 - (dragY / (sheetRef.current?.offsetHeight || 700)) * 0.4)
    : 0.4;

  return (
    <>
      <div
        className="fixed inset-0 z-[2000]"
        style={{
          background: `rgba(0,0,0,${backdropOpacity})`,
          transition: isDragging ? 'none' : 'background 0.3s ease',
        }}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="fixed z-[2001] bg-white overflow-y-auto scrollbar-none shadow-[-4px_0_30px_rgba(0,0,0,0.15)] flex flex-col"
        onTransitionEnd={() => { if (!isOpen) setIsMounted(false); }}
        style={
          isBottomSheet
            ? {
                bottom: 0, left: 0, right: 0,
                height: '92vh',
                borderRadius: '24px 24px 0 0',
                transform: sheetTransform,
                transition: isDragging ? 'none' : 'transform 0.3s ease-in-out',
                willChange: 'transform',
                touchAction: 'none',
              }
            : {
                top: 0, right: 0, bottom: 0,
                width: '460px', height: '100%',
                borderRadius: 0,
                transform: sheetTransform,
                transition: 'transform 0.3s ease-in-out',
              }
        }
      >
        {isBottomSheet && (
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="w-10 h-1 rounded-full transition-colors duration-150"
              style={{ background: isDragging ? '#466460' : '#cbd5e1' }}
            />
          </div>
        )}

        {/* Header */}
        <div
          className="bg-gradient-to-br from-[#466460] to-[#38524d] px-5 sm:px-6 py-6 sm:py-8 text-white relative flex-shrink-0"
          onTouchStart={isBottomSheet ? handleTouchStart : undefined}
          onTouchMove={isBottomSheet ? handleTouchMove : undefined}
          onTouchEnd={isBottomSheet ? handleTouchEnd : undefined}
          style={{ cursor: isBottomSheet ? 'grab' : 'default', userSelect: 'none' }}
        >
          <button
            onClick={onClose}
            className="sm:hidden absolute top-3 left-4 bg-white/10 border-none text-white w-8 h-8 rounded-full cursor-pointer text-sm flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <i className="fa-solid fa-chevron-down"></i>
          </button>

          <button
            onClick={onClose}
            className="hidden sm:flex absolute top-4 right-4 bg-white/20 border-none text-white w-8 h-8 rounded-full cursor-pointer text-sm items-center justify-center hover:bg-white/35 transition-all"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] rounded-full border-2 border-white/40 overflow-hidden bg-white/10 flex-shrink-0">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460&size=70`}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-extrabold mb-0.5 break-words leading-tight">{displayName}</h2>
              <p className="text-xs opacity-75 truncate">{formData.email || 'No email provided'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase">
                  {formData.role || 'USER'}
                </span>
                {formData.universityId && (
                  <span className="inline-block bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold tracking-wide font-mono">
                    {formData.universityId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Personal Details ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="Personal Details" />
              <button
                onClick={() => openEdit('personal')}
                className="bg-[#e8f5ee] border-none text-[#466460] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d1e7dd] transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>

            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-cake-candles" label="Birthday" field="birthday" value={formData.birthday} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-hashtag"    label="Age"          field="age"         type="number" value={formData.age} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-venus-mars" label="Sex"          field="sex"         value={formData.sex}         options={['Male', 'Female']} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-droplet"    label="Blood Type"   field="bloodType"   value={formData.bloodType}   options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-ring"       label="Civil Status" field="civilStatus" value={formData.civilStatus} options={['Single', 'Married', 'Widowed', 'Separated']} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-church"     label="Religion"     field="religion"    value={formData.religion} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-flag"       label="Nationality"  field="nationality" value={formData.nationality} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-house"      label="Home Address" field="homeAddress" value={formData.homeAddress} />
          </div>

          {/* ── Academic / Professional ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label={isStudent ? 'Academic Information' : 'Professional Information'} />
              <button
                onClick={() => openEdit('professional')}
                className="bg-[#e8f5ee] border-none text-[#466460] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d1e7dd] transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>

            <DrawerEditableInfoRow isEditing={false} onChange={handleChange}
              icon="fa-id-card"
              label={isStudent ? 'Student No.' : 'Employee ID'}
              field="universityId"
              value={formData.universityId}
            />

            {isStudent ? (
              <>
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-building"      label="Department" field="department" value={formData.department} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-graduation-cap" label="Program"   field="program"    value={formData.program} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-layer-group"   label="Year Level" field="yearLevel"  value={formData.yearLevel} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-users"         label="Section"    field="section"    value={formData.section} />
              </>
            ) : (
              <>
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-user-tie"  label="Classification" field="classification" value={formData.classification} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-building"  label="Department"     field="department"     value={formData.department} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-briefcase" label="Job Title"      field="jobTitle"       value={formData.jobTitle} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-id-card"   label="License No."    field="licenseNumber" value={formData.licenseNumber} />
              </>
            )}
          </div>

          {/* ── Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="Contact Information" />
              <button
                onClick={() => openEdit('contact')}
                className="bg-[#e8f5ee] border-none text-[#466460] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d1e7dd] transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-phone"    label="Phone Number"  field="phoneNumber" type="tel"   value={formData.phoneNumber} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-envelope" label="Email Address" field="email"       type="email" value={formData.email} />
          </div>

          {/* ── Emergency Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-red-50/30">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="Emergency Contact" color="text-red-400" />
              <button
                onClick={() => openEdit('emergency')}
                className="bg-red-50 border-none text-red-600 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-red-100 transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-address-book"  label="Full Name"    field="emergencyContact" nestedField="name"         value={formData.emergencyContact?.name} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-heart"         label="Relationship" field="emergencyContact" nestedField="relationship" value={formData.emergencyContact?.relationship} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-phone-volume"  label="Phone Number" field="emergencyContact" nestedField="phone"        type="tel" value={formData.emergencyContact?.phone} />
            <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-location-dot" label="Address"      field="emergencyContact" nestedField="address"      value={formData.emergencyContact?.address} />
          </div>

          {/* ── COVID-19 Vaccination ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-blue-50/20">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="COVID-19 Vaccination" color="text-blue-400" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {vaccineDoseCount} / 5 doses
                </span>
                <button
                  onClick={() => openEdit('vaccinations')}
                  className="bg-blue-50 border-none text-blue-600 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <i className="fa-solid fa-pen text-[8px]"></i> Edit
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {VACCINE_DOSE_KEYS.map(({ key, label }) => {
                const dose = formData.vaccinations?.[key] || {};
                if (!dose.vaccineName) return null;

                return (
                  <div key={key} className="flex flex-col bg-white rounded-lg px-3 py-2 border border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 w-16 text-center">
                        {label}
                      </span>
                      <span className="text-[11px] text-slate-700 font-medium truncate flex-1">{dose.vaccineName}</span>
                    </div>

                    {dose.date && (
                      <div className="text-[10px] text-slate-400 pl-[72px]">{dose.date}</div>
                    )}
                  </div>
                );
              })}

              {vaccineDoseCount === 0 && (
                <div className="flex flex-col items-center py-3 bg-white rounded-lg border border-slate-200 border-dashed">
                  <p className="text-[10px] text-slate-400 italic mb-2">No vaccination records on file.</p>
                  <button
                    type="button"
                    onClick={() => openEdit('vaccinations')}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold hover:bg-blue-100 transition-colors shadow-sm"
                  >
                    <i className="fa-solid fa-plus mr-1"></i> Add Vaccination Record
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-blue-100">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">COVID-19 History</p>
              {formData.vaccinations?.declined?.history ? (
                <span className="text-[11px] font-semibold text-slate-500">N/A</span>
              ) : (
                <p className="text-[11px] text-slate-600 whitespace-pre-wrap">{formData.vaccinations?.history || '—'}</p>
              )}
            </div>
          </div>

          {/* ── Dental History ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="Dental History" />
              <button
                onClick={() => openEdit('dental')}
                className="bg-[#e8f5ee] border-none text-[#466460] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d1e7dd] transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>

            {formData.dentalHistory?.declined ? (
              <div className="flex items-center justify-center py-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">No dental history / Not applicable</span>
              </div>
            ) : (!formData.dentalHistory?.lastVisit && !formData.dentalHistory?.prevDentist && Object.values(formData.dentalHistory?.procedures || {}).filter(v => v === 'Yes').length === 0) ? (
              <div className="flex flex-col items-center justify-center py-3 bg-white rounded-lg border border-slate-200 border-dashed">
                <p className="text-[10px] text-slate-400 italic mb-2">No dental history recorded.</p>
                <button
                  type="button"
                  onClick={() => openEdit('dental')}
                  className="px-3 py-1.5 bg-[#e8f5ee] text-[#1a5c3a] rounded-full text-[10px] font-bold hover:bg-[#d1e7dd] transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-plus mr-1"></i> Add Dental History
                </button>
              </div>
            ) : (
              <>
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-calendar-day" label="Last Visit" field="lastVisit" value={formData.dentalHistory?.lastVisit} />
                <DrawerEditableInfoRow isEditing={false} onChange={handleChange} icon="fa-user-doctor" label="Previous Dentist" field="prevDentist" value={formData.dentalHistory?.prevDentist ? `Dr. ${formData.dentalHistory.prevDentist}` : ''} />

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Procedures History</p>
                  <div className="flex flex-col gap-0.5">
                    {DENTAL_PROCEDURES.map(proc => {
                      const val = formData.dentalHistory?.procedures?.[proc] || 'No';
                      return (
                        <div key={proc} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                          <span className="text-[11px] text-slate-600">{proc}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${val === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Past Surgical History ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <DrawerSectionHeader label="Past Surgical History" />
              <button
                onClick={() => openEdit('surgical')}
                className="bg-[#e8f5ee] border-none text-[#466460] px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d1e7dd] transition-colors"
              >
                <i className="fa-solid fa-pen text-[8px]"></i> Edit
              </button>
            </div>

            {formData.surgicalHistory?.declined ? (
              <div className="flex items-center justify-center py-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500">No surgical history / Not applicable</span>
              </div>
            ) : (formData.surgicalHistory?.operations?.length > 0) ? (
              <div className="flex flex-col gap-2">
                {formData.surgicalHistory.operations.map((op, i) => (
                  <div key={op.id || i} className="flex flex-col bg-white rounded-lg px-3 py-2 border border-slate-100 gap-1">
                    <span className="text-[11px] font-bold text-slate-700">{op.operation || 'Operation'}</span>
                    <span className="text-[10px] text-slate-400">{[op.date, op.notes].filter(Boolean).join(' · ') || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 bg-white rounded-lg border border-slate-200 border-dashed">
                <p className="text-[10px] text-slate-400 italic mb-2">No surgical history recorded.</p>
                <button
                  type="button"
                  onClick={() => openEdit('surgical')}
                  className="px-3 py-1.5 bg-[#e8f5ee] text-[#1a5c3a] rounded-full text-[10px] font-bold hover:bg-[#d1e7dd] transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-plus mr-1"></i> Add Surgical History
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── Footer Actions ── */}
        <div className="px-4 sm:px-6 py-6 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4 px-1">
                <span>MediTrack v2.4.1</span>
                <span>Server: Online <span className="text-emerald-500 ml-1">✓</span></span>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full py-3 mb-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-slate-100 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <i className="fa-solid fa-gear"></i>
                Settings
              </button>

              <button
                onClick={onLogout}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-red-100 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Sign Out
              </button>
            </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {editingSection && (
        <div onClick={e => e.target === e.currentTarget && closeEdit()} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[3000] px-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <span className="text-base font-extrabold text-[#466460] capitalize">Edit {editingSection} Info</span>
              <button onClick={closeEdit} className="bg-none border-none text-slate-400 cursor-pointer text-lg flex items-center justify-center hover:text-slate-600">✕</button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* ── Personal Section ── */}
              {editingSection === 'personal' && (
                <>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">First Name</label>
                    <input type="text" value={editData.firstName || ''} onChange={e => handleChange('firstName', toTitleCase(e.target.value))} onBlur={e => handleChange('firstName', toTitleCase(e.target.value))} placeholder="First Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Middle Name</label>
                    <input type="text" value={editData.middleName || ''} onChange={e => handleChange('middleName', toTitleCase(e.target.value))} onBlur={e => handleChange('middleName', toTitleCase(e.target.value))} placeholder="Middle Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Last Name</label>
                    <input type="text" value={editData.lastName || ''} onChange={e => handleChange('lastName', toTitleCase(e.target.value))} onBlur={e => handleChange('lastName', toTitleCase(e.target.value))} placeholder="Last Name" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Suffix</label>
                    <select value={editData.suffix || ''} onChange={e => handleChange('suffix', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {SUFFIXES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Birthday</label>
                    <DatePicker value={editData.birthday || ''} onChange={val => handleChange('birthday', val)} />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Age (Auto-calculated)</label>
                    <input type="text" value={editData.age || ''} readOnly className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                    <span className="text-[10px] text-slate-400">Age is automatically calculated from birthday</span>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Sex</label>
                    <select value={editData.sex || ''} onChange={e => handleChange('sex', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Blood Type</label>
                    <select value={editData.bloodType || ''} onChange={e => handleChange('bloodType', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Civil Status</label>
                    <select value={editData.civilStatus || ''} onChange={e => handleChange('civilStatus', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['Single', 'Married', 'Widowed', 'Separated'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Religion</label>
                    <select value={editData.religion || ''} onChange={e => handleChange('religion', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Seventh-day Adventist', 'Protestant', 'Born Again Christian', 'Buddhism', 'Hinduism', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Nationality</label>
                    <select value={editData.nationality || ''} onChange={e => handleChange('nationality', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['Filipino', 'American', 'Chinese', 'Japanese', 'Korean', 'Indian', 'British', 'Australian', 'Canadian', 'Other'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Home Address</label>
                    <button type="button" onClick={() => { setAddressType('personal'); setShowAddressModal(true); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-left focus:outline-none focus:border-[#466460] bg-white hover:bg-slate-50">
                      {editData.homeAddress ? <span className="text-slate-700">{editData.homeAddress}</span> : <span className="text-slate-400">Click to set address</span>}
                    </button>
                  </div>
                </>
              )}

              {/* ── Professional Section (Staff) ── */}
              {editingSection === 'professional' && !isStudent && (
                <>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Employee ID</label>
                    <input type="text" value={editData.universityId || ''} onChange={e => handleChange('universityId', e.target.value)} placeholder="e.g., 2021-00001" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Classification</label>
                    <select value={editData.classification || ''} onChange={e => handleChange('classification', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Department</label>
                    <select value={editData.department || ''} onChange={e => handleChange('department', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {NON_ACADEMIC_OFFICES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Job Title</label>
                    <select value={editData.jobTitle || ''} onChange={e => handleChange('jobTitle', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">License Number</label>
                    <input type="text" value={editData.licenseNumber || ''} onChange={e => handleChange('licenseNumber', e.target.value.toUpperCase())} placeholder="e.g., PRC-123456" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                </>
              )}

              {/* ── Professional Section (Student) ── */}
              {editingSection === 'professional' && isStudent && (
                <>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Student No.</label>
                    <input type="text" value={editData.universityId || ''} onChange={e => handleChange('universityId', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Department</label>
                    <input type="text" value={editData.department || ''} onChange={e => handleChange('department', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Program</label>
                    <input type="text" value={editData.program || ''} onChange={e => handleChange('program', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Year Level</label>
                    <select value={editData.yearLevel || ''} onChange={e => handleChange('yearLevel', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Section</label>
                    <select value={editData.section || ''} onChange={e => handleChange('section', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* ── Contact Section ── */}
              {editingSection === 'contact' && (
                <>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Email Address</label>
                    <input type="email" value={editData.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone Number (11 digits)</label>
                    <input type="tel" value={editData.phoneNumber || ''} onChange={e => { const formatted = formatPhoneNumber(e.target.value); handleChange('phoneNumber', formatted); }} onBlur={e => { if (e.target.value && !isValidPhoneNumber(e.target.value)) { alert('Phone number must be exactly 11 digits (e.g., 09123456789)'); } }} placeholder="09123456789" maxLength={11} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                    <span className="text-[10px] text-slate-400">Format: 09XXXXXXXXX (11 digits)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Note: Changing your email may require you to verify your identity.</p>
                </>
              )}

              {/* ── Emergency Section ── */}
              {editingSection === 'emergency' && (
                <>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Contact Name</label>
                    <input type="text" value={editData.emergencyContact?.name || ''} onChange={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} onBlur={e => handleNestedChange('emergencyContact', 'name', toTitleCase(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Relationship</label>
                    <select value={editData.emergencyContact?.relationship || ''} onChange={e => handleNestedChange('emergencyContact', 'relationship', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]">
                      <option value="">Select</option>
                      {['Parent', 'Spouse', 'Sibling', 'Child', 'Grandparent', 'Relative', 'Guardian', 'Friend', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone Number (11 digits)</label>
                    <input type="tel" value={editData.emergencyContact?.phone || ''} onChange={e => { const formatted = formatPhoneNumber(e.target.value); handleNestedChange('emergencyContact', 'phone', formatted); }} onBlur={e => { if (e.target.value && !isValidPhoneNumber(e.target.value)) { alert('Phone number must be exactly 11 digits (e.g., 09123456789)'); } }} placeholder="09123456789" maxLength={11} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                  </div>
                  <div className="mb-4">
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Address</label>
                    <button type="button" onClick={() => { setAddressType('emergency'); setShowAddressModal(true); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-left focus:outline-none focus:border-[#466460] bg-white hover:bg-slate-50">
                      {editData.emergencyContact?.address ? <span className="text-slate-700">{editData.emergencyContact.address}</span> : <span className="text-slate-400">Click to set address</span>}
                    </button>
                  </div>
                </>
              )}

              {/* ── Vaccinations Section ── */}
              {editingSection === 'vaccinations' && (
                <>
                  {VACCINE_DOSE_KEYS.map(({ key, label }) => {
                    const isDeclined = vaccinationsDeclined[key];
                    return (
                      <div key={key} className={`p-4 rounded-xl mb-4 border ${isDeclined ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[11px] font-extrabold text-[#466460] uppercase">{label}</span>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isDeclined} onChange={e => handleVaxDeclineChange(key, e.target.checked)} className="accent-[#466460]" />
                            <span className={`text-[11px] font-semibold ${isDeclined ? 'text-amber-700' : 'text-slate-500'}`}>N/A</span>
                          </label>
                        </div>
                        {!isDeclined && (
                          <>
                            <div className="mb-3">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Vaccine Brand</label>
                              <select value={editData.vaccinations?.[key]?.vaccineName || ''} onChange={e => handleVaccineChange(key, 'vaccineName', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460] bg-white">
                                <option value="">Select</option>
                                {['Pfizer', 'Moderna', 'AstraZeneca', 'Sinovac', 'Janssen', 'Novavax', 'Covaxin', 'Sputnik', 'Other'].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Date Given</label>
                              <DatePicker value={editData.vaccinations?.[key]?.date || ''} onChange={val => handleVaccineChange(key, 'date', val)} />
                            </div>
                          </>
                        )}
                        {isDeclined && <span className="text-[11px] font-semibold text-amber-700">Skipped / Not applicable</span>}
                      </div>
                    );
                  })}
                  <div className={`p-4 rounded-xl mb-4 border ${vaccinationsDeclined.history ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-extrabold text-[#466460] uppercase">COVID-19 History</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={vaccinationsDeclined.history || false} onChange={e => handleVaxDeclineChange('history', e.target.checked)} className="accent-[#466460]" />
                        <span className={`text-[11px] font-semibold ${vaccinationsDeclined.history ? 'text-amber-700' : 'text-slate-500'}`}>N/A</span>
                      </label>
                    </div>
                    {!vaccinationsDeclined.history ? (
                      <textarea
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460] bg-white resize-y min-h-[80px]"
                        placeholder="Date of infection, severity, treatment, recovery details..."
                        value={editData.vaccinations?.history || ''}
                        onChange={e => handleCovidHistoryChange(e.target.value)}
                      />
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700">Skipped / Not applicable</span>
                    )}
                  </div>
                </>
              )}

              {/* ── Dental Section ── */}
              {editingSection === 'dental' && (
                <>
                  <label className="flex items-center gap-3 p-4 rounded-xl mb-4 cursor-pointer bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={dentalDeclined}
                      onChange={e => {
                        const val = e.target.checked;
                        setDentalDeclined(val);
                        handleDentalHistoryUpdate({ ...editData.dentalHistory, declined: val });
                      }}
                      className="accent-[#466460]"
                    />
                    <span className={`text-[12px] font-semibold ${dentalDeclined ? 'text-amber-700' : 'text-[#466460]'}`}>I don't have dental history / Not applicable</span>
                  </label>
                  {!dentalDeclined && (
                    <>
                      <div className="mb-4">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Last Dental Visit</label>
                        <DatePicker value={editData.dentalHistory?.lastVisit || ''} onChange={val => handleDentalHistoryUpdate({ ...editData.dentalHistory, lastVisit: val })} />
                      </div>
                      <div className="mb-4">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Previous Dentist (Dr.)</label>
                        <input type="text" value={editData.dentalHistory?.prevDentist || ''} onChange={e => handleDentalHistoryUpdate({ ...editData.dentalHistory, prevDentist: e.target.value })} placeholder="e.g. Smith" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]" />
                      </div>

                      <p className="text-[10px] font-extrabold text-[#466460] uppercase tracking-wide mt-6 mb-3 pt-5 border-t border-slate-100">Procedures History</p>
                      {DENTAL_PROCEDURES.map(proc => {
                        const isYes = editData.dentalHistory?.procedures?.[proc] === 'Yes';
                        const isNo  = editData.dentalHistory?.procedures?.[proc] === 'No' || !editData.dentalHistory?.procedures?.[proc];
                        return (
                          <div key={proc} className="flex items-center justify-between mb-3 text-xs text-slate-800 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-lg">
                            <span className="font-semibold">{proc}</span>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                                <input type="radio" name={`modal_dh_${proc}`} checked={isYes} onChange={() => handleDentalProcChange(proc, 'Yes')} className="accent-[#466460]" /> Yes
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer font-semibold">
                                <input type="radio" name={`modal_dh_${proc}`} checked={isNo} onChange={() => handleDentalProcChange(proc, 'No')} className="accent-[#466460]" /> No
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {/* ── Surgical History Section ── */}
              {editingSection === 'surgical' && (
                <>
                  <label className="flex items-center gap-3 p-4 rounded-xl mb-4 cursor-pointer bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={surgicalDeclined}
                      onChange={e => {
                        const val = e.target.checked;
                        setSurgicalDeclined(val);
                        setEditData(prev => ({ ...prev, surgicalHistory: { ...prev.surgicalHistory, declined: val } }));
                      }}
                      className="accent-[#466460]"
                    />
                    <span className={`text-[12px] font-semibold ${surgicalDeclined ? 'text-amber-700' : 'text-[#466460]'}`}>I don't have surgical history / Not applicable</span>
                  </label>

                  {!surgicalDeclined && (
                    <>
                      {(editData.surgicalHistory?.operations || []).length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic text-center py-3">No operations added yet.</p>
                      ) : (
                        editData.surgicalHistory.operations.map(op => (
                          <div key={op.id} className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveOperation(op.id)}
                              className="absolute top-2.5 right-2.5 bg-[#e07a5f] text-white w-5 h-5 rounded-md text-xs leading-none flex items-center justify-center"
                            >×</button>
                            <div className="mb-3">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Operation Name</label>
                              <input
                                type="text"
                                placeholder="Operation/Procedure Name"
                                value={op.operation}
                                onChange={e => handleOperationChange(op.id, 'operation', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]"
                              />
                            </div>
                            <div className="mb-3">
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Date</label>
                              <DatePicker value={op.date || ''} onChange={val => handleOperationChange(op.id, 'date', val)} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Notes</label>
                              <input
                                type="text"
                                placeholder="Hospital / complications"
                                value={op.notes}
                                onChange={e => handleOperationChange(op.id, 'notes', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#466460]"
                              />
                            </div>
                          </div>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={handleAddOperation}
                        className="w-full bg-[#81b29a] text-white border-none py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-[#6a9a83] transition-colors"
                      >
                        + Add Operation
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={closeEdit} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={saveProfileEdits} disabled={isSaving} className="flex-1 py-3 bg-[#466460] text-white rounded-xl font-bold text-sm hover:bg-[#38524d] transition-colors shadow-md disabled:opacity-70 flex justify-center items-center gap-2">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Overlay ── */}
      {showSettings && (
        <div className="fixed inset-0 z-[3000]">
          <Settings onLogout={onLogout} onClose={() => setShowSettings(false)} />
        </div>
      )}

      {/* ── Address Modal ── */}
      {showAddressModal && (
        <AddressModal
          isOpen={showAddressModal}
          onClose={() => { setShowAddressModal(false); setAddressType(null); }}
          onConfirm={(addressData) => {
            if (addressType === 'personal') {
              handleChange('homeAddress', addressData.homeAddress);
            } else if (addressType === 'emergency') {
              handleNestedChange('emergencyContact', 'address', addressData.homeAddress);
            }
            setShowAddressModal(false);
            setAddressType(null);
          }}
          initialData={addressType === 'personal' ? { homeAddress: editData.homeAddress } : { homeAddress: editData.emergencyContact?.address }}
          zIndex={4000}
        />
      )}
    </>
  );
}

// ─── Logout Confirmation Modal ────────────────────────────────────────────────
function LogoutConfirmModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[3000] px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-3xl p-6 sm:p-6 shadow-2xl animate-slideUp">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-arrow-right-from-bracket text-2xl text-red-600"></i>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Confirm Logout</h3>
          <p className="text-sm text-slate-500 mt-2">Are you sure you want to log out?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Header ───────────────────────────────────────────────────────────
export const DesktopHeader = ({ onOpenQR }) => {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const authUser = authService.getCurrentUser();
  const [fullProfile, setFullProfile] = useState(authUser || {});

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count || 0);
      } catch (err) {
        ('Error fetching unread count:', err);
      }
    };
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          showLoading('Session expired', 'light');
          authService.logout();
          hideLoading();
          navigate('/login');
          return;
        }

        const result = await response.json();
        if (result.success && result.data) {
          setFullProfile({ ...authUser, ...result.data });
        }
      } catch (err) {
        ('Error fetching full profile for header:', err);
      }
    };

    fetchFullProfile();
  }, [navigate]);

  useEffect(() => {
    const getUserId = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.uid || null;
      } catch { return null; }
    };

    const userId = getUserId();
    if (!userId) return;

    const channel = supabase
      .channel('header-notif-count')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          setUnreadCount(prev => prev + 1);
          sessionStorage.removeItem('meditrack_notif_count');
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async () => {
          const count = await notificationsService.getUnreadCount();
          setUnreadCount(count);
          sessionStorage.removeItem('meditrack_notif_count');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayName = (fullProfile.firstName && fullProfile.lastName)
    ? `${fullProfile.firstName} ${fullProfile.lastName}`
    : (fullProfile.name || 'Admin User');
  const displayRole = fullProfile.role || 'System Administrator';

  const handleLogoutClick = () => {
    setShowProfileDrawer(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    showLoading('Signing out', 'light');
    authService.logout();
    hideLoading();
    navigate('/login');
  };

  return (
    <>
      <header className="
        bg-gradient-to-br from-[#466460] to-[#38524d]
        flex items-center justify-between
        shadow-lg z-20 border-b border-white/10
        px-3 py-2
        sm:px-5 sm:py-0
        lg:px-6
      ">
        <img
          src="/logo1.png"
          alt="MediTrack Logo"
          className="w-[110px] h-[44px] sm:w-[160px] sm:h-[58px] lg:w-[200px] lg:h-[70px] object-contain"
          onError={e => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack'; }}
        />

        <div className="flex items-center gap-2 sm:gap-4">
          <NotificationBell
            onClick={() => setShowNotifications(true)}
            count={unreadCount}
          />

          <div className="flex items-center gap-2 sm:gap-3 sm:border-l sm:border-white/20 sm:pl-4 lg:pl-6">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-white leading-tight">{displayName}</p>
              <p className="text-[9px] text-white/60 uppercase">{displayRole}</p>
            </div>

            <button
              onClick={() => setShowProfileDrawer(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 hover:border-white/60 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
              aria-label="Open profile"
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ffffff&color=466460`}
                alt="User"
                className="w-full h-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>

      <ProfileDrawer
        isOpen={showProfileDrawer}
        onClose={() => setShowProfileDrawer(false)}
        onLogout={handleLogoutClick}
        userProfile={fullProfile}
        onProfileUpdate={(updatedProfile) => setFullProfile(updatedProfile)}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
};

// ─── Role-based Navigation Configuration ─────────────────────────────────────
const ROLE_NAV_CONFIG = {
  sysadmin: [
    { to: '/dashboard', label: 'Dashboard' },
     { to: '/approval-management', label: 'Approvals' },
    { to: '/appointment-management', label: 'Appointments' },
    { to: '/record-management', label: 'Records' },
    { to: '/consultation-management', label: 'Consultations' },
    { to: '/users', label: 'Users' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/reports', label: 'Reports' },
    { to: '/notifications-management', label: 'Notifications' },
    { to: '/archives', label: 'Archives' },
    { to: '/audit-logs', label: 'Audit Logs' },
  ],
  doctor: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/records', label: 'Records' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/approvals', label: 'Approvals' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/consultations', label: 'Consultation' },
  ],
  dentist: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/records', label: 'Records' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/approvals', label: 'Approvals' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/consultations', label: 'Consultation' },
  ],
  nurse: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/records', label: 'Records' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/consultations', label: 'Consultation' },
  ],
};

// ─── Desktop Navigation Bar ───────────────────────────────────────────────────
export const DesktopNav = () => {
  const [userRole, setUserRole] = useState(() => getStoredUserRole() || 'unknown');
  const [isLoading, setIsLoading] = useState(userRole === 'unknown');

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data?.role) {
          setUserRole(result.data.role.toLowerCase());
        } else if (result.success && result.data?.classification) {
          const classification = result.data.classification.toLowerCase();
          const jobTitle = (result.data.job_title || '').toLowerCase();

          if (classification === 'dentist' || jobTitle.includes('dentist')) {
            setUserRole('dentist');
          } else if (classification === 'doctor' || jobTitle.includes('doctor')) {
            setUserRole('doctor');
          } else if (classification === 'nurse' || jobTitle.includes('nurse')) {
            setUserRole('nurse');
          } else if (classification === 'System Administrator') {
            setUserRole('sysadmin');
          }
        }
      } catch (err) {
        ('Error fetching user role:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  if (isLoading || userRole === 'unknown') {
    return (
      <nav className="bg-white border-b border-slate-200 shadow-sm flex gap-4 sm:gap-6 lg:gap-12 px-3 sm:px-6 lg:px-8 py-3 sm:py-4 z-10">
        <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
        <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
        <div className="h-6 w-20 bg-slate-100 animate-pulse rounded" />
      </nav>
    );
  }

  const navLinkClass = ({ isActive }) =>
    `relative font-bold tracking-[0.025em] transition-all pb-[4px] whitespace-nowrap flex-shrink-0
     text-[12px] sm:text-[13px] lg:text-[14px]
     ${
      isActive
        ? 'opacity-100 text-[#466460] after:content-[""] after:absolute after:-bottom-[13px] sm:after:-bottom-[17px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-[#466460] after:to-[#81b29a] after:rounded-full'
        : 'text-[#466460] opacity-60 hover:opacity-100 hover:text-[#e07a5f]'
    }`;

  const navItems = ROLE_NAV_CONFIG[userRole] || ROLE_NAV_CONFIG.sysadmin;

  return (
    <nav className="
      bg-white border-b border-slate-200 shadow-sm
      flex gap-4 sm:gap-6 lg:gap-12
      px-3 sm:px-6 lg:px-8
      py-3 sm:py-4
      z-10
      overflow-y-auto scrollbar-none
    ">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} className={navLinkClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

// ─── Mobile Header ────────────────────────────────────────────────────────────
export const MobileHeader = ({ userName = 'User', userId = 'N/A', onLogout, simple = false, onProfileClick, onNotificationClick, notificationCount = 0 }) => {
  if (simple) {
    return (
      <header className="
        absolute top-0 left-0 right-0 z-40
        bg-white
        flex items-center justify-center
        shadow-sm border-b border-slate-100
        px-4 pt-[env(safe-area-inset-top,12px)] pb-3
        min-h-[64px]
        sm:px-6 sm:min-h-[70px]
      ">
        <img
          src="/logo.jpg"
          alt="MediTrack Logo"
          className="h-10 object-contain rounded-xl"
          onError={e => { e.target.src = 'https://placehold.co/200x40/557a5b/white?text=MediTrack'; }}
        />
      </header>
    );
  }

  return (
    <header className="
      absolute top-0 left-0 right-0 z-40
      bg-gradient-to-br from-[#466460] to-[#38524d]
      flex items-center justify-between
      shadow-lg border-b border-white/10
      px-4 pt-[env(safe-area-inset-top,12px)] pb-3
      min-h-[64px]
      sm:px-6 sm:min-h-[70px]
    ">
      <img
        src="/logo1.png"
        alt="MediTrack Logo"
        className="w-[110px] h-[44px] sm:w-[160px] sm:h-[58px] lg:w-[200px] lg:h-[70px] object-contain"
        style={{ mixBlendMode: 'multiply' }}
        onError={e => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack'; }}
      />

      <div className="flex items-center gap-2 sm:gap-3">
        {onNotificationClick && (
          <NotificationBell
            onClick={onNotificationClick}
            count={notificationCount}
          />
        )}

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-white leading-tight">{userName}</p>
          <p className="text-[9px] text-white/60 uppercase truncate max-w-[140px]">{userId}</p>
        </div>

        <button
          onClick={onProfileClick}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 hover:border-white/50 transition-colors cursor-pointer flex-shrink-0 active:scale-95"
          aria-label="Open profile"
        >
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=ffffff&color=466460`}
            alt="User"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </header>
  );
};

// ─── Mobile Role-based Navigation Items ──────────────────────────────────────
const ROLE_MOBILE_NAV_CONFIG = {
  sysadmin: [
    { id: 'dashboard', label: 'Home', icon: HomeIcon },
    { id: 'recordManagement', label: 'Records', icon: RecordsIcon },
    { id: 'auditLogs', label: 'Audit', icon: AnnouncementIcon },
    { id: 'announcements', label: 'Announcements', icon: AnnouncementIcon },
    { id: 'consultationManagement', label: 'Consultations', icon: ConsultIcon },
    { id: 'appointmentManagement', label: 'Appointments', icon: CalendarIcon },
    { id: 'approvalManagement', label: 'Approvals', icon: ApprovalsIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
  ],
  doctor: [
    { id: 'dashboard', label: 'Home', icon: HomeIcon },
    { id: 'records', label: 'Records', icon: RecordsIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
    { id: 'approvals', label: 'Approval', icon: ApprovalsIcon },
    { id: 'announcements', label: 'Announcements', icon: AnnouncementIcon },
    { id: 'consultations', label: 'Consultations', icon: ConsultIcon },
  ],
  dentist: [
    { id: 'dashboard', label: 'Home', icon: HomeIcon },
    { id: 'records', label: 'Records', icon: RecordsIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
    { id: 'dentalApprovals', label: 'Dental Exams', icon: CalendarIcon },
    { id: 'announcements', label: 'Announcements', icon: AnnouncementIcon },
    { id: 'consultations', label: 'Consultations', icon: ConsultIcon },
  ],
  nurse: [
    { id: 'dashboard', label: 'Home', icon: HomeIcon },
    { id: 'records', label: 'Records', icon: RecordsIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
    { id: 'announcements', label: 'Announcements', icon: AnnouncementIcon },
    { id: 'consultations', label: 'Consultations', icon: ConsultIcon },
  ],
};

const DEFAULT_MOBILE_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: HomeIcon },
  { id: 'records', label: 'Records', icon: RecordsIcon },
  { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
  { id: 'examinations', label: 'Exam', icon: ExamIcon },
  { id: 'approvals', label: 'Approval', icon: ApprovalsIcon },
  { id: 'consultations', label: 'Consultations', icon: ConsultIcon },
  { id: 'announcements', label: 'Announcements', icon: AnnouncementIcon },
  { id: 'users', label: 'Users', icon: UsersIcon },
];

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
export const MobileNav = ({
  active = 'dashboard',
  onSwitch,
  items: propItems,
  useRoleBased = true,
}) => {
  const [userRole, setUserRole] = useState('sysadmin');

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success && result.data?.role) {
          setUserRole(result.data.role.toLowerCase());
        }
      } catch (err) {
        ('Error fetching user role:', err);
      }
    };
    fetchUserRole();
  }, []);

  const getItems = () => {
    if (propItems && propItems.length > 0) return propItems;
    if (!useRoleBased) return DEFAULT_MOBILE_ITEMS;
    return ROLE_MOBILE_NAV_CONFIG[userRole] || ROLE_MOBILE_NAV_CONFIG.sysadmin;
  };

  const items = getItems();
  return (
    <nav className="
  bg-white border-b border-slate-200 shadow-sm
  flex gap-4 sm:gap-6 lg:gap-12
  px-3 sm:px-6 lg:px-8
  py-3 sm:py-4
  z-10
  overflow-y-auto scrollbar-none
">
      {items.map((item) => {
        const IconComponent = item.icon || DefaultIcon;
        const isActive = active === item.id;

        return (
          <button
            key={item.id}
            onClick={() => typeof onSwitch === 'function' && onSwitch(item.id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all flex-shrink-0 ${
              isActive ? 'text-[#557a5b]' : 'text-slate-400'
            }`}
            aria-label={item.label}
          >
            <div className={`transition-transform flex items-center justify-center w-6 h-6 ${isActive ? 'scale-110' : ''}`}>
              <IconComponent />
            </div>
            <span className={`text-[7px] font-black uppercase tracking-wide whitespace-nowrap ${isActive ? 'text-[#557a5b]' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="w-1 h-1 bg-[#557a5b] rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

// ─── Full Mobile Layout ───────────────────────────────────────────────────────
export const MobileLayout = ({
  children,
  activeTab,
  onTabChange,
  userName,
  userId,
  bottomNavItems,
  onLogout,
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutRequest = () => setShowLogoutConfirm(true);
  const handleConfirm       = () => { setShowLogoutConfirm(false); onLogout?.(); };
  const handleCancel        = () => setShowLogoutConfirm(false);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800;9..40,900&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); }  to { opacity:1; transform:translateY(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn  { animation: fadeIn  0.28s ease both; }
        .animate-slideUp { animation: slideUp 0.32s cubic-bezier(.34,1.56,.64,1) both; }
      `}</style>

      {/* Phone: full screen */}
      <div className="md:hidden relative flex flex-col h-screen bg-slate-50 overflow-hidden">
        <MobileHeader
          userName={userName}
          userId={userId}
          onProfileClick={onProfileClick}
        />
        <div className="flex-1 overflow-y-auto pt-[64px] pb-[70px] scrollbar-none">
          {children}
        </div>
        <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
      </div>

      {/* Tablet & Desktop: centered phone frame */}
      <div className="hidden md:flex min-h-screen items-center justify-center bg-slate-800">
        <div
          className="
            relative overflow-hidden bg-slate-50
            border-[10px] lg:border-[12px] border-slate-700
            w-[420px] h-[860px] rounded-[36px]
            lg:w-[375px] lg:h-[812px] lg:rounded-[40px]
          "
          style={{ boxShadow: '0 35px 70px -10px rgba(0,0,0,0.65)' }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130px] h-[20px] lg:w-[140px] lg:h-[22px] bg-slate-700 rounded-b-2xl z-50" />

          <MobileHeader
            userName={userName}
            userId={userId}
            onLogout={onLogout ? handleLogoutRequest : undefined}
          />
          <div className="h-full overflow-y-auto pt-[64px] pb-[80px] scrollbar-none">
            {children}
          </div>
          <MobileNav active={activeTab} onSwitch={onTabChange} items={bottomNavItems} />
        </div>
      </div>

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

export default { DesktopHeader, DesktopNav, MobileHeader, MobileNav, MobileLayout };
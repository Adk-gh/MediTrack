// C:\Users\HP\MediTrack\frontend\src\components\Headers.jsx

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service.js';
import { useLoading } from '../context/LoadingContext.jsx';
import DatePicker from './Datepicker.jsx';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

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

// ─── Profile Drawer ───────────────────────────────────────────────────────────
export function ProfileDrawer({ isOpen, onClose, onLogout, userProfile, forceBottomSheet = false, onProfileUpdate }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [formData, setFormData] = React.useState({});

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [dragY, setDragY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const sheetRef = React.useRef(null);

  const { showLoading, hideLoading } = useLoading();

  React.useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setFormData(userProfile || {});
      setIsEditing(false);
      setDragY(0);
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
      // Dragging upward — apply resistance
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
    const velocity = dragY / elapsed; // px/ms

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
    formData.middleInitial ? `${formData.middleInitial}.` : '',
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

  // ── Input Handlers ──────────────────────────────────────────────────────────
  const handleChange = (field, value, nestedField = null) => {
    setFormData(prev => {
      if (nestedField) {
        return { ...prev, [field]: { ...(prev[field] || {}), [nestedField]: value } };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleVaccineChange = (key, field, value) => {
    setFormData(prev => ({
      ...prev,
      vaccinations: {
        ...(prev.vaccinations || {}),
        [key]: { ...(prev.vaccinations?.[key] || {}), [field]: value },
      },
    }));
  };

  const handleSaveProfile = async () => {
    showLoading('Saving profile...', 'light');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate(result.data);
      } else {
        alert(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while saving.');
    } finally {
      hideLoading();
    }
  };

  // ── UI Components ────────────────────────────────────────────────────────────
  const EditableInfoRow = ({ icon, label, field, nestedField, value, type = 'text', options }) => {
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
              onChange={(e) => handleChange(field, e.target.value, nestedField)}
              className="flex-1 min-w-0 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#466460] focus:ring-1 focus:ring-[#466460] text-slate-800 transition-all"
            >
              <option value="">Select...</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={displayValue}
              onChange={(e) => handleChange(field, e.target.value, nestedField)}
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

  const SectionHeader = ({ label, color = 'text-slate-400' }) => (
    <div className={`text-[9px] font-extrabold uppercase tracking-widest ${color} mb-3`}>{label}</div>
  );

  const isBottomSheet = isMobile;

  // Drag-aware transform
  const sheetTransform = isBottomSheet
    ? isOpen
      ? `translateY(${dragY}px)`
      : 'translateY(100%)'
    : isOpen
      ? 'translateX(0)'
      : 'translateX(100%)';

  // Backdrop dims as sheet is dragged down
  const backdropOpacity = isBottomSheet && isDragging
    ? Math.max(0, 0.4 - (dragY / (sheetRef.current?.offsetHeight || 700)) * 0.4)
    : 0.4;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[2000]"
        style={{
          background: `rgba(0,0,0,${backdropOpacity})`,
          transition: isDragging ? 'none' : 'background 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Sheet / Drawer */}
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
        {/* Drag handle — mobile only */}
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

        {/* Header — also draggable on mobile */}
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

          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`absolute top-4 ${isMobile ? 'right-4' : 'right-14'} bg-white/10 border-none text-white px-3 py-1.5 rounded-full cursor-pointer text-xs font-semibold flex items-center gap-1.5 hover:bg-white/25 transition-all`}
          >
            <i className={`fa-solid ${isEditing ? 'fa-eye' : 'fa-pen'}`}></i>
            {isEditing ? 'View' : 'Edit'}
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
              {isEditing ? (
                <div className="flex gap-2 mb-1">
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="First"
                    className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Last"
                    className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded px-2 py-1 text-sm focus:outline-none focus:border-white"
                  />
                </div>
              ) : (
                <h2 className="text-lg sm:text-xl font-extrabold mb-0.5 break-words leading-tight">{displayName}</h2>
              )}
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
            <SectionHeader label="Personal Details" />

            {isEditing ? (
              <div className="flex items-center justify-between py-2 text-xs border-b border-slate-50 gap-3 min-h-[40px]">
                <div className="flex items-center gap-2.5 text-slate-500 shrink-0 min-w-[110px]">
                  <i className="fa-solid fa-cake-candles text-[#466460] w-4 text-center opacity-70 flex-shrink-0"></i>
                  <span className="whitespace-nowrap">Birthday</span>
                </div>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={formData.birthday || ''}
                    onChange={(val) => handleChange('birthday', val)}
                  />
                </div>
              </div>
            ) : (
              <EditableInfoRow icon="fa-cake-candles" label="Birthday" field="birthday" value={formData.birthday} />
            )}

            <EditableInfoRow icon="fa-hashtag"    label="Age"          field="age"         type="number" value={formData.age} />
            <EditableInfoRow icon="fa-venus-mars" label="Sex"          field="sex"         value={formData.sex}         options={['Male', 'Female']} />
            <EditableInfoRow icon="fa-droplet"    label="Blood Type"   field="bloodType"   value={formData.bloodType}   options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
            <EditableInfoRow icon="fa-ring"       label="Civil Status" field="civilStatus" value={formData.civilStatus} options={['Single', 'Married', 'Widowed', 'Separated']} />
            <EditableInfoRow icon="fa-church"     label="Religion"     field="religion"    value={formData.religion} />
            <EditableInfoRow icon="fa-flag"       label="Nationality"  field="nationality" value={formData.nationality} />
            <EditableInfoRow icon="fa-house"      label="Home Address" field="homeAddress" value={formData.homeAddress} />
          </div>

          {/* ── Academic / Professional ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <SectionHeader label={isStudent ? 'Academic Information' : 'Professional Information'} />

            <EditableInfoRow
              icon="fa-id-card"
              label={isStudent ? 'Student No.' : 'Employee ID'}
              field="universityId"
              value={formData.universityId}
            />

            {isStudent ? (
              <>
                <EditableInfoRow icon="fa-building"      label="Department" field="department" value={formData.department} />
                <EditableInfoRow icon="fa-graduation-cap" label="Program"   field="program"    value={formData.program} />
                <EditableInfoRow icon="fa-layer-group"   label="Year Level" field="yearLevel"  value={formData.yearLevel} />
                <EditableInfoRow icon="fa-users"         label="Section"    field="section"    value={formData.section} />
              </>
            ) : (
              <>
                <EditableInfoRow icon="fa-user-tie"  label="Classification" field="classification" value={formData.classification} />
                <EditableInfoRow icon="fa-building"  label="Department"     field="department"     value={formData.department} />
                <EditableInfoRow icon="fa-briefcase" label="Job Title"      field="jobTitle"       value={formData.jobTitle} />
              </>
            )}
          </div>

          {/* ── Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100">
            <SectionHeader label="Contact Information" />
            <EditableInfoRow icon="fa-phone"    label="Phone Number"  field="phoneNumber" type="tel"   value={formData.phoneNumber} />
            <EditableInfoRow icon="fa-envelope" label="Email Address" field="email"       type="email" value={formData.email} />
          </div>

          {/* ── Emergency Contact ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-red-50/30">
            <SectionHeader label="Emergency Contact" color="text-red-400" />
            <EditableInfoRow icon="fa-address-book"  label="Full Name"    field="emergencyContact" nestedField="name"         value={formData.emergencyContact?.name} />
            <EditableInfoRow icon="fa-heart"         label="Relationship" field="emergencyContact" nestedField="relationship" value={formData.emergencyContact?.relationship} />
            <EditableInfoRow icon="fa-phone-volume"  label="Phone Number" field="emergencyContact" nestedField="phone"        type="tel" value={formData.emergencyContact?.phone} />
            <EditableInfoRow icon="fa-location-dot" label="Address"      field="emergencyContact" nestedField="address"      value={formData.emergencyContact?.address} />
          </div>

          {/* ── COVID-19 Vaccination ── */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-blue-50/20">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader label="COVID-19 Vaccination" color="text-blue-400" />
              {!isEditing && (
                <span className="text-[9px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full -mt-3">
                  {vaccineDoseCount} / 5 doses
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {VACCINE_DOSE_KEYS.map(({ key, label }) => {
                const dose = formData.vaccinations?.[key] || {};
                if (!isEditing && !dose.vaccineName) return null;

                return (
                  <div key={key} className="flex flex-col bg-white rounded-lg px-3 py-2 border border-slate-100 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 w-16 text-center">
                        {label}
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          placeholder="Vaccine Brand (e.g., Pfizer)"
                          value={dose.vaccineName || ''}
                          onChange={(e) => handleVaccineChange(key, 'vaccineName', e.target.value)}
                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#466460] text-slate-800"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-700 font-medium truncate flex-1">{dose.vaccineName}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="pl-[72px]">
                        <DatePicker
                          value={dose.date || ''}
                          onChange={(val) => handleVaccineChange(key, 'date', val)}
                        />
                      </div>
                    ) : (
                      dose.date && (
                        <div className="text-[10px] text-slate-400 pl-[72px]">{dose.date}</div>
                      )
                    )}
                  </div>
                );
              })}

              {!isEditing && vaccineDoseCount === 0 && (
                <p className="text-[11px] text-slate-400 italic">No vaccination records on file.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-6 border-t border-slate-100 bg-white flex-shrink-0">
          {isEditing ? (
            <div className="flex gap-3 animate-fadeIn">
              <button
                onClick={() => { setFormData(userProfile || {}); setIsEditing(false); }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-3 bg-[#466460] text-white rounded-xl font-bold text-sm hover:bg-[#38524d] transition-colors shadow-md active:scale-[0.98] flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                Save Changes
              </button>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4 px-1">
                <span>MediTrack v2.4.1</span>
                <span>Server: Online <span className="text-emerald-500 ml-1">✓</span></span>
              </div>
              <button
                onClick={onLogout}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold text-sm cursor-pointer transition-all hover:bg-red-100 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
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

  const authUser = authService.getCurrentUser();
  const [fullProfile, setFullProfile] = useState(authUser || {});

  useEffect(() => {
    const fetchFullProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const response = await fetch('http://localhost:5000/api/users/profile', {
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
        console.error('Error fetching full profile for header:', err);
      }
    };

    fetchFullProfile();
  }, [navigate]);

  const displayName = (fullProfile.firstName && fullProfile.lastName)
    ? `${fullProfile.firstName} ${fullProfile.lastName}`
    : (fullProfile.name || 'Admin User');
  const displayRole = fullProfile.role || 'Administrator';

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
          src="/logo1.jpg"
          alt="MediTrack Logo"
          className="w-[110px] h-[44px] sm:w-[160px] sm:h-[58px] lg:w-[200px] lg:h-[70px] object-contain"
          onError={e => { e.target.src = 'https://placehold.co/200x70/466460/white?text=MediTrack'; }}
        />

        <div className="flex items-center gap-2 sm:gap-4">
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
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};

// ─── Desktop Navigation Bar ───────────────────────────────────────────────────
export const DesktopNav = () => {
  const navLinkClass = ({ isActive }) =>
    `relative font-bold tracking-[0.025em] transition-all pb-[4px] whitespace-nowrap flex-shrink-0
     text-[12px] sm:text-[13px] lg:text-[14px]
     ${
      isActive
        ? 'opacity-100 text-[#466460] after:content-[""] after:absolute after:-bottom-[13px] sm:after:-bottom-[17px] after:left-0 after:w-full after:h-[3px] after:bg-gradient-to-r after:from-[#466460] after:to-[#81b29a] after:rounded-full'
        : 'text-[#466460] opacity-60 hover:opacity-100 hover:text-[#e07a5f]'
    }`;

  return (
    <nav className="
      bg-white border-b border-slate-200 shadow-sm
      flex gap-4 sm:gap-6 lg:gap-12
      px-3 sm:px-6 lg:px-8
      py-3 sm:py-4
      z-10
      overflow-y-auto scrollbar-none
    ">
      <NavLink to="/dashboard"     className={navLinkClass}>Dashboard</NavLink>
      <NavLink to="/records"       className={navLinkClass}>Records</NavLink>
      <NavLink to="/appointments"  className={navLinkClass}>Appointments</NavLink>
      <NavLink to="/examinations"  className={navLinkClass}>Examination</NavLink>
      <NavLink to="/approvals"     className={navLinkClass}>Approvals</NavLink>
      <NavLink to="/announcements" className={navLinkClass}>Announcements</NavLink>
      <NavLink to="/consultations" className={navLinkClass}>Consultation</NavLink>
      <NavLink to="/users"         className={navLinkClass}>User Management</NavLink>
    </nav>
  );
};

// ─── Mobile Header ────────────────────────────────────────────────────────────
export const MobileHeader = ({ userName = 'User', userId = 'N/A', onLogout, simple = false, onProfileClick }) => {
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
        src="/logo1.jpg"
        alt="MediTrack Logo"
        className="w-[110px] h-[42px] sm:w-[140px] sm:h-[50px] object-contain"
        onError={e => { e.target.src = 'https://placehold.co/140x50/466460/white?text=MediTrack'; }}
      />

      <div className="flex items-center gap-2 sm:gap-3">
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

// ─── Mobile Bottom Navigation ─────────────────────────────────────────────────
export const MobileNav = ({
  active = 'dashboard',
  onSwitch,
  items = [
    { id: 'dashboard',     label: 'Home',     icon: HomeIcon         },
    { id: 'records',       label: 'Records',  icon: RecordsIcon      },
    { id: 'appointments',  label: 'Schedule', icon: CalendarIcon     },
    { id: 'examinations',  label: 'Exam',     icon: ExamIcon         },
    { id: 'approvals',     label: 'Approval', icon: ApprovalsIcon    },
    { id: 'consultations', label: 'Consult',  icon: ConsultIcon      },
    { id: 'announcements', label: 'Announce', icon: AnnouncementIcon },
    { id: 'users',         label: 'Users',    icon: UsersIcon        },
  ],
}) => {
  return (
    <nav className="
      absolute bottom-0 left-0 right-0
      bg-white border-t border-slate-100
      flex justify-between items-center
      shadow-[0_-4px_10px_rgba(0,0,0,0.05)]
      z-40
      h-[70px] px-1
      pb-[env(safe-area-inset-bottom,8px)]
      overflow-y-auto scrollbar-none
      sm:h-[76px] sm:px-4
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
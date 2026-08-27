// frontend/src/features/admin-clinic/AppointmentManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // Added for absolute top modals
import { supabase } from '../../supabase';
import * as appointmentsService from '../../services/appointments.service';
import DatePicker from '../../components/Datepicker';

const ITEMS_PER_PAGE = 100;

// Standard clinic time slots for auto-assignment
const CLINIC_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

// Adjust this number to match the clinic's actual capacity per time slot
const MAX_PATIENTS_PER_SLOT = 3;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'done', label: 'Done' },
  { value: 'missed', label: 'Missed' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'date_asc', label: 'Date (Earliest)' },
  { value: 'date_desc', label: 'Date (Latest)' },
  { value: 'name_asc', label: 'Patient Name (A-Z)' },
  { value: 'name_desc', label: 'Patient Name (Z-A)' },
];

const formatDate = (year, month, day) => {
  if (!year || !month || !day) return '—';
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Formats a raw time string (e.g., "08:00") into a 1-hour window (e.g., "8:00 AM – 9:00 AM")
const formatTime = (time) => {
  if (!time) return '';
  const [h] = time.split(':').map(Number);

  const fmt = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHr = hour % 12 || 12;
    return `${displayHr}:00 ${period}`;
  };

  return `${fmt(h)} – ${fmt(h + 1)}`;
};

// Build a 'YYYY-MM-DD' string for the DatePicker from separate y/m/d fields.
const toDateInputValue = (year, month, day) => {
  if (!year || !month || !day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Parse a 'YYYY-MM-DD' string (as returned by DatePicker's onChange) into
// numeric y/m/d parts.
const fromDateInputValue = (val) => {
  if (!val) return { y: null, m: null, d: null };
  const [y, m, d] = val.split('-').map(Number);
  return { y, m, d };
};

// Statuses whose date/time can no longer be edited once set.
const LOCKED_STATUSES = ['done', 'missed', 'rejected'];

export const AppointmentManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();

  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';
  const adminEmail = currentUser?.email ?? null;
  const adminName = currentUser?.name
    ?? [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ')
    ?? null;

  const [allFiltered, setAllFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [reasonOptions, setReasonOptions] = useState([{ value: 'all', label: 'All Reasons' }]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, done: 0, missed: 0, rejected: 0 });
  const [message, setMessage] = useState(null);
  const [patientProfiles, setPatientProfiles] = useState({});

  const snackbarTimer = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, reasonFilter, statusFilter, dateFilter, sortBy]);

  const applyFiltersAndSort = useCallback((rawData, profileMap) => {
    let enriched = (rawData || []).map(apt => {
      const profile = profileMap[apt.user_id] || {};
      return {
        ...apt,
        patientName: profile.first_name
          ? `${profile.last_name || ''}, ${profile.first_name}${profile.middle_name ? ' ' + profile.middle_name  : ''}${profile.suffix ? ' ' + profile.suffix : ''}`.trim()
          : apt.patient_name || apt.name || 'Unknown',
        patientUniversityId: profile.university_id || profile.student_id || '—',
        patientProgram: profile.program || profile.course || '—',
        patientEmail: profile.email || '—',
        patientPhone: profile.phone_number || '—',
      };
    });

    if (reasonFilter !== 'all') {
      enriched = enriched.filter(a =>
        (a.reason || '')
          .split(',')
          .map(r => r.trim().toLowerCase())
          .includes(reasonFilter)
      );
    }

    if (statusFilter !== 'all') {
      enriched = enriched.filter(a => a.status?.toLowerCase() === statusFilter);
    }

    if (dateFilter) {
      const { y: fy, m: fm, d: fd } = fromDateInputValue(dateFilter);
      enriched = enriched.filter(a => Number(a.year) === fy && Number(a.month) === fm && Number(a.day) === fd);
    }

    const term = searchInput.trim().toLowerCase();
    if (term) {
      enriched = enriched.filter(a => {
        const formattedDate = formatDate(a.year, a.month, a.day).toLowerCase();
        return (
          a.patientName?.toLowerCase().includes(term) ||
          a.patientUniversityId?.toLowerCase().includes(term) ||
          a.patientProgram?.toLowerCase().includes(term) ||
          a.patientEmail?.toLowerCase().includes(term) ||
          a.reason?.toLowerCase().includes(term) ||
          formattedDate.includes(term)
        );
      });
    }

    enriched.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'date_asc':
          return new Date(a.year, a.month - 1, a.day, a.time?.split(':')[0] || 0, a.time?.split(':')[1] || 0) -
                 new Date(b.year, b.month - 1, b.day, b.time?.split(':')[0] || 0, b.time?.split(':')[1] || 0);
        case 'date_desc':
          return new Date(b.year, b.month - 1, b.day, b.time?.split(':')[0] || 0, b.time?.split(':')[1] || 0) -
                 new Date(a.year, a.month - 1, a.day, a.time?.split(':')[0] || 0, a.time?.split(':')[1] || 0);
        case 'name_asc':
          return (a.patientName || '').localeCompare(b.patientName || '');
        case 'name_desc':
          return (b.patientName || '').localeCompare(a.patientName || '');
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return enriched;
  }, [reasonFilter, statusFilter, dateFilter, searchInput, sortBy]);

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);
      const data = await appointmentsService.getAllAppointments(true);

      if (!data || data.length === 0) {
        setAllFiltered([]);
        setTotalRecords(0);
        setStats({ total: 0, pending: 0, approved: 0, done: 0, missed: 0, rejected: 0 });
        setReasonOptions([{ value: 'all', label: 'All Reasons' }]);
        setLoading(false);
        return;
      }

      const uniqueReasons = [...new Set(
        data.flatMap(a => (a.reason || '')
          .split(',')
          .map(r => r.trim())
          .filter(Boolean)
        )
      )].sort((a, b) => a.localeCompare(b));

      setReasonOptions([
        { value: 'all', label: 'All Reasons' },
        ...uniqueReasons.map(r => ({ value: r.toLowerCase(), label: r })),
      ]);

      const { data: profiles } = await supabase.from('users').select('*');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });
      setPatientProfiles(profileMap);

      const enriched = applyFiltersAndSort(data, profileMap);

      const total = enriched?.length || 0;
      const pending = enriched?.filter(a => a.status?.toLowerCase() === 'pending').length || 0;
      const approved = enriched?.filter(a => a.status?.toLowerCase() === 'approved').length || 0;
      const done = enriched?.filter(a => a.status?.toLowerCase() === 'done').length || 0;
      const missed = enriched?.filter(a => a.status?.toLowerCase() === 'missed').length || 0;
      const rejected = enriched?.filter(a => a.status?.toLowerCase() === 'rejected').length || 0;

      setStats({ total, pending, approved, done, missed, rejected });

      setAllFiltered(enriched);
      setTotalRecords(enriched.length);

      if (isRefresh) setCurrentPage(1);

    } catch (err) {
      console.error('Failed to load appointments:', err);
      showSnackbar('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [applyFiltersAndSort]);

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  const paginatedAppointments = allFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    fetchAppointments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasonFilter, statusFilter, dateFilter, sortBy]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAppointments(true);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (apt) => {
    setAppointmentToDelete(apt);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;
    setDeleting(true);
    try {
      await appointmentsService.deleteAppointment(appointmentToDelete.id);
      showSnackbar('Appointment archived successfully. You can restore it from the Archives page.');
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
      fetchAppointments(true);
    } catch (err) {
      console.error('Failed to archive appointment:', err);
      showSnackbar('Failed to archive appointment', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ---- Edit single appointment ----
  const [showEditModal, setShowEditModal] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'pending', year: '', month: '', day: '', time: '' });
  const [saving, setSaving] = useState(false);

  const handleEditClick = (apt) => {
    setAppointmentToEdit(apt);
    setEditForm({
      status: (apt.status || 'pending').toLowerCase(),
      year: apt.year || '',
      month: apt.month || '',
      day: apt.day || '',
      time: apt.time || '',
    });
    setShowEditModal(true);
  };

  const handleEditDateChange = (val) => {
    const { y, m, d } = fromDateInputValue(val);
    setEditForm(f => ({ ...f, year: y, month: m, day: d }));
  };

  const handleEditSave = async () => {
    if (!appointmentToEdit) return;

    const isFinalStatus = LOCKED_STATUSES.includes(editForm.status);
    const isApproved = editForm.status === 'approved';

    if (isApproved && (!editForm.year || !editForm.month || !editForm.day)) {
      showSnackbar('Please select a valid date for approved appointments', 'error');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        status: editForm.status,
      };

if (!isFinalStatus) {
  if (editForm.status === 'pending') {
    updates.year = null;
    updates.month = null;
    updates.day = null;
    updates.time = null;
  } else {
    updates.year = editForm.year
      ? String(editForm.year)
      : null;

    updates.month = editForm.month
      ? String(editForm.month).padStart(2, '0')
      : null;

    updates.day = editForm.day
      ? String(editForm.day).padStart(2, '0')
      : null;

    updates.time = editForm.time
      ? String(editForm.time).slice(0, 5)
      : null;
  }
}
      // isFinalStatus (done/missed/rejected) keeps its existing date/time untouched.

      if (typeof appointmentsService.updateAppointment === 'function') {
        await appointmentsService.updateAppointment(appointmentToEdit.id, updates);
      } else {
        const { error } = await supabase
          .from('appointments')
          .update(updates)
          .eq('id', appointmentToEdit.id);
        if (error) throw error;
      }

      const previousStatus = (appointmentToEdit.status || 'pending').toLowerCase();


      showSnackbar('Appointment updated successfully');
      setShowEditModal(false);
      setAppointmentToEdit(null);
      fetchAppointments(true);
    } catch (err) {
      console.error('Failed to update appointment:', err);
      showSnackbar('Failed to update appointment (ensure backend validation accepts null dates)', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---- Bulk reschedule ----
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFromDate, setBulkFromDate] = useState('');
  const [bulkToDate, setBulkToDate] = useState('');
  const [bulkMatches, setBulkMatches] = useState([]);
  const [bulkTargetMatches, setBulkTargetMatches] = useState([]);
  const [bulkChecking, setBulkChecking] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const handleBulkClick = () => {
    setBulkFromDate(dateFilter || '');
    setBulkToDate('');
    setBulkMatches([]);
    setBulkTargetMatches([]);
    setShowBulkModal(true);
  };

  useEffect(() => {
    if (!showBulkModal || !bulkFromDate) {
      setBulkMatches([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBulkChecking(true);
      try {
        const { y: fy, m: fm, d: fd } = fromDateInputValue(bulkFromDate);
        const data = await appointmentsService.getAllAppointments(true);
        const matches = (data || []).filter(
          a => Number(a.year) === fy && Number(a.month) === fm && Number(a.day) === fd && a.status === 'approved'
        );
        if (!cancelled) setBulkMatches(matches);
      } catch (err) {
        console.error('Failed to check bulk reschedule matches:', err);
        if (!cancelled) setBulkMatches([]);
      } finally {
        if (!cancelled) setBulkChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bulkFromDate, showBulkModal]);

  useEffect(() => {
    if (!showBulkModal || !bulkToDate) {
      setBulkTargetMatches([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { y: ty, m: tm, d: td } = fromDateInputValue(bulkToDate);
        const data = await appointmentsService.getAllAppointments(true);
        const matches = (data || []).filter(
          a => Number(a.year) === ty && Number(a.month) === tm && Number(a.day) === td && a.status === 'approved'
        );
        if (!cancelled) setBulkTargetMatches(matches);
      } catch (err) {
        console.error('Failed to fetch target date appointments:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [bulkToDate, showBulkModal]);

  // Calculate capacity based on MAX_PATIENTS_PER_SLOT
  const slotCounts = {};
  bulkTargetMatches.forEach(a => {
    if (a.time) {
      slotCounts[a.time] = (slotCounts[a.time] || 0) + 1;
    }
  });

  const availableSlots = [];
  CLINIC_SLOTS.forEach(slot => {
    const taken = slotCounts[slot] || 0;
    const remaining = MAX_PATIENTS_PER_SLOT - taken;
    // Add the slot to the available list for each open spot it has
    for (let i = 0; i < remaining; i++) {
      availableSlots.push(slot);
    }
  });

  const isConflict = bulkMatches.length > availableSlots.length;

  const handleBulkReschedule = async () => {
    if (!bulkFromDate || !bulkToDate) {
      showSnackbar('Please select both the original date and the new date', 'error');
      return;
    }
    if (bulkFromDate === bulkToDate) {
      showSnackbar('New date must be different from the original date', 'error');
      return;
    }
    if (bulkMatches.length === 0) {
      showSnackbar('No approved appointments found on that date', 'error');
      return;
    }

    setBulkSaving(true);
    try {
      const { y: ty, m: tm, d: td } = fromDateInputValue(bulkToDate);

      let currentSlotIdx = 0;
      const updates = bulkMatches.map((apt) => {
        const newTime = availableSlots[currentSlotIdx] || apt.time;
        if (currentSlotIdx < availableSlots.length) {
            currentSlotIdx++;
        }
        return {
            ...apt,
            newYear: ty,
            newMonth: tm,
            newDay: td,
            newTime: newTime
        };
      });

      const promises = updates.map(async (u) => {
          const payload = {
              year: String(u.newYear),
              month: String(u.newMonth).padStart(2, '0'),
              day: String(u.newDay).padStart(2, '0'),
              time: u.newTime ? String(u.newTime).slice(0, 5) : null,
              updated_at: new Date().toISOString()
          };

          if (typeof appointmentsService.updateAppointment === 'function') {
              return appointmentsService.updateAppointment(u.id, payload);
          } else {
              const { error } = await supabase.from('appointments').update(payload).eq('id', u.id);
              if (error) throw error;
          }
      });

      await Promise.all(promises);

      const notificationRows = updates
        .filter(u => u.user_id)
        .map(u => ({
          user_id: u.user_id,
          title: 'Appointment Rescheduled',
          message: `Your appointment has been moved to ${formatDate(u.newYear, u.newMonth, u.newDay)} at ${u.newTime ? formatTime(u.newTime) : 'a time to be confirmed'}.`,
          type: 'appointment_rescheduled',
          reference_id: u.id,
          reference_type: 'appointment',
          is_read: false,
          created_at: new Date().toISOString(),
        }));

      if (notificationRows.length > 0) {
        const { error: notifyError } = await supabase.from('notifications').insert(notificationRows);
        if (notifyError) console.error('[handleBulkReschedule] Failed to create bulk notifications:', notifyError);
      }


      showSnackbar(`Rescheduled ${bulkMatches.length} approved appointment${bulkMatches.length !== 1 ? 's' : ''} to ${formatDate(ty, tm, td)}`);
      setShowBulkModal(false);
      setBulkFromDate('');
      setBulkToDate('');
      setBulkMatches([]);
      setBulkTargetMatches([]);
      fetchAppointments(true);
    } catch (err) {
      console.error('Failed to bulk reschedule appointments:', err);
      showSnackbar('Failed to reschedule appointments', 'error');
    } finally {
      setBulkSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'approved':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'done':
        return { bg: 'bg-slate-200', text: 'text-slate-600' };
      case 'missed':
        return { bg: 'bg-orange-100', text: 'text-orange-700' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const getPatientDisplayName = (apt) => {
    const p = patientProfiles[apt.user_id];
    if (p && (p.first_name || p.last_name)) {
      return `${p.last_name || ''}, ${p.first_name || ''}`.trim().replace(/^,/, '').trim();
    }
    return apt.patientName || apt.patient_name || apt.name || 'Unknown';
  };

  const filterSelectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 6;

  if (userRole !== 'sysadmin') {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        <div className="text-center">
          <i className="fa-solid fa-lock text-4xl text-slate-300 mb-3"></i>
          <p>Access denied. Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 shrink-0">
        {[
          { label: 'Total', count: stats.total, color: 'text-slate-800' },
          { label: 'Pending', count: stats.pending, color: 'text-amber-600' },
          { label: 'Approved', count: stats.approved, color: 'text-emerald-600' },
          { label: 'Done', count: stats.done, color: 'text-slate-600' },
          { label: 'Missed', count: stats.missed, color: 'text-orange-600' },
          { label: 'Rejected', count: stats.rejected, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-center gap-2 shadow-sm">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-sm font-medium text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Unified Inline Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

          {/* Left side: Search & Filters */}
          <div className="flex flex-wrap gap-2 items-center flex-1 w-full xl:w-auto">
            <div className="relative w-full sm:w-56">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search patient, date..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-36`}
            >
              {reasonOptions.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-28`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-40">
              <DatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="All Dates"
                className={`${filterSelectCls} w-full pr-8`}
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-slate-400 hover:bg-slate-600 text-white flex items-center justify-center shadow-md z-10 transition-colors"
                  title="Clear date filter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-36`}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Right side: Inline Stats & Bulk Action */}
          <div className="flex gap-2 flex-wrap items-center justify-end">
            <button
              onClick={handleBulkClick}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm ml-1"
              title="Move all appointments from one date to another"
            >
              <i className="fa-solid fa-calendar-days text-slate-400"></i>
              <span className="hidden sm:inline">Reschedule</span>
            </button>
            <button
              onClick={() => fetchAppointments(true)}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Date & Time</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Reason</th>
                <th className="bg-slate-50 text-right p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Loading appointments…
                    </div>
                  </td>
                </tr>
              ) : paginatedAppointments.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-calendar-check text-3xl text-slate-300"></i>
                      <p>No appointments found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAppointments.map((apt, idx) => {
                  const statusStyle = getStatusColor(apt.status);
                  return (
                    <tr key={apt.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-sm text-[#466460] shrink-0">
                            {apt.patientName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{apt.patientName}</div>
                            <div className="text-xs text-slate-500">{apt.patientUniversityId} • {apt.patientProgram}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700">{formatDate(apt.year, apt.month, apt.day)}</div>
                        <div className="text-xs text-slate-500">{apt.time ? formatTime(apt.time) : '—'}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {apt.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                        <span className="truncate block" title={apt.reason}>{apt.reason || '—'}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(apt)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
                            title="Edit Appointment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(apt)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
                            title="Archive Appointment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{totalRecords === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              <div className="text-xs font-semibold px-2">
                Page {currentPage} of {Math.max(1, totalPages)}
              </div>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal Using Portal */}
      {showEditModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowEditModal(false); setAppointmentToEdit(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#466460" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Appointment</h3>
                <p className="text-sm text-slate-500">{appointmentToEdit?.patientName}</p>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Status
                </label>
                <select
                  value={editForm.status}
onChange={e => {
  const status = e.target.value;

  setEditForm(f => ({
    ...f,
    status,
    ...(status === 'pending'
      ? {
          year: '',
          month: '',
          day: '',
          time: '',
        }
      : {}),
  }));
}}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]"
                >
                  {STATUS_OPTIONS.filter(s => s.value !== 'all').map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Date {LOCKED_STATUSES.includes(editForm.status) && <span className="text-slate-400 normal-case">(Cannot change)</span>}
                </label>
                <DatePicker
                  value={toDateInputValue(editForm.year, editForm.month, editForm.day)}
                  onChange={handleEditDateChange}
                  placeholder="Select date"
                  disabled={
  LOCKED_STATUSES.includes(editForm.status) ||
  editForm.status === 'pending'
}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Time {LOCKED_STATUSES.includes(editForm.status) && <span className="text-slate-400 normal-case">(Cannot change)</span>}
                </label>
                <select
                  value={editForm.time || ''}
                  onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb]"
                  disabled={
  LOCKED_STATUSES.includes(editForm.status) ||
  editForm.status === 'pending'
}
                >
                  <option value="" disabled>Select time</option>
                  {CLINIC_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{formatTime(slot)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditModal(false); setAppointmentToEdit(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Reschedule Modal Using Portal */}
      {showBulkModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowBulkModal(false); setBulkFromDate(''); setBulkToDate(''); setBulkMatches([]); setBulkTargetMatches([]); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center">
                <i className="fa-solid fa-calendar-days text-[#466460] text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Bulk Reschedule</h3>
                <p className="text-sm text-slate-500">Move a whole day's appointments</p>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              {/* From date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Original Date
                </label>
                <DatePicker
                  value={bulkFromDate}
                  onChange={setBulkFromDate}
                  placeholder="Select original date"
                />
              </div>

              {/* To date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  New Date
                </label>
                <DatePicker
                  value={bulkToDate}
                  onChange={setBulkToDate}
                  placeholder="Select new date"
                />
              </div>
            </div>

            {/* Preview / warning */}
            <div className="bg-slate-50 rounded-lg p-4 mb-5 max-h-64 overflow-y-auto">
              {!bulkFromDate ? (
                <p className="text-sm text-slate-500">Pick the original date to see how many approved appointments will be affected.</p>
              ) : bulkChecking ? (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Checking approved appointments...
                </p>
              ) : bulkMatches.length === 0 ? (
                <p className="text-sm text-amber-600">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                  No approved appointments found on this date.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{bulkMatches.length}</span> appointment(s) selected to move.
                  </p>

                  {bulkToDate && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-700">Target Date Capacity:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isConflict ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {availableSlots.length} spot(s) left
                        </span>
                      </div>

                      {/* Display Warning ONLY if there is a conflict */}
                      {isConflict && (
                        <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                            Warning: Not enough time slots available!
                          </p>
                          <p className="text-xs text-red-600">
                            The target date already has {bulkTargetMatches.length} appointments. You can still move them, but some may retain their original time and cause an overlap past the set capacity limit.
                          </p>
                        </div>
                      )}

                      {/* Display Existing Appointments on Target Date ALWAYS (if any exist) */}
                      {bulkTargetMatches.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Existing appointments on target date:</p>
                          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                            {bulkTargetMatches.map(a => {
                              const p = patientProfiles[a.user_id] || {};
                              const uid = p.university_id || p.student_id || '—';
                              return (
                                <li key={a.id}>
                                  <span className="font-medium">{getPatientDisplayName(a)}</span> ({uid}) - {formatTime(a.time)}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">Appointments moving to new date:</p>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {bulkMatches.map((a, idx) => {
                            const p = patientProfiles[a.user_id] || {};
                            const uid = p.university_id || p.student_id || '—';
                            const projectedTime = availableSlots[idx] || a.time;
                            return (
                              <li key={a.id}>
                                <span className="font-medium">{getPatientDisplayName(a)}</span> ({uid}) - <span className="text-[#466460] font-semibold">{formatTime(projectedTime)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkModal(false); setBulkFromDate(''); setBulkToDate(''); setBulkMatches([]); setBulkTargetMatches([]); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={bulkSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReschedule}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={bulkSaving || bulkChecking || bulkMatches.length === 0 || !bulkToDate}
              >
                {bulkSaving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Moving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-arrow-right-arrow-left"></i>
                    Move {bulkMatches.length > 0 ? bulkMatches.length : ''} Appointment{bulkMatches.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Using Portal */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
          onClick={() => { setShowDeleteModal(false); setAppointmentToDelete(null); }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Archive Appointment</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive the appointment for <span className="font-semibold">{appointmentToDelete?.patientName}</span>?
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Date: {formatDate(appointmentToDelete?.year, appointmentToDelete?.month, appointmentToDelete?.day)} at {formatTime(appointmentToDelete?.time)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setAppointmentToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Archiving...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-[100000] flex items-center gap-2 whitespace-nowrap shadow-xl transition-all ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default AppointmentManagement;
// frontend/src/features/admin-clinic/AppointmentManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import * as appointmentsService from '../../services/appointments.service';

const ITEMS_PER_PAGE = 20;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'medical', label: 'Medical' },
  { value: 'dental', label: 'Dental' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'followup', label: 'Follow-up' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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

const formatTime = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
};

export const AppointmentManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0 });
  const [message, setMessage] = useState(null);
  const [patientProfiles, setPatientProfiles] = useState({});

  const snackbarTimer = useRef(null);
  const searchTimeout = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  const fetchAppointments = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);

      // Fetch all appointments
      console.log('[AppointmentManagement] Fetching appointments...');
      const data = await appointmentsService.getAllAppointments(true);
      console.log('[AppointmentManagement] Got appointments:', data?.length, 'items');
      if (data?.[0]) {
        console.log('[AppointmentManagement] Sample appointment:', JSON.stringify(data[0]));
      }

      if (!data || data.length === 0) {
        console.log('[AppointmentManagement] No appointments found');
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Fetch patient profiles - use uid as key since user_id is now UUID
      const { data: profiles } = await supabase.from('users').select('*');
      console.log('[AppointmentManagement] Got profiles:', profiles?.length, 'items');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.uid] = p; });
      setPatientProfiles(profileMap);

      // Enrich appointments with patient info
      let enriched = (data || []).map(apt => {
        const profile = profileMap[apt.user_id] || {};
        return {
          ...apt,
          patientName: profile.first_name
            ? `${profile.last_name || ''}, ${profile.first_name}`.trim()
            : apt.patient_name || apt.name || 'Unknown',
          patientUniversityId: profile.university_id || profile.student_id || '—',
          patientProgram: profile.program || profile.course || '—',
          patientEmail: profile.email || '—',
          patientPhone: profile.phone_number || '—',
        };
      });

      // Apply type filter
      if (typeFilter !== 'all') {
        enriched = enriched.filter(a => a.type?.toLowerCase() === typeFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        enriched = enriched.filter(a => a.status?.toLowerCase() === statusFilter);
      }

      // Apply search filter
      if (searchInput.trim()) {
        const term = searchInput.trim().toLowerCase();
        enriched = enriched.filter(a =>
          a.patientName?.toLowerCase().includes(term) ||
          a.patientUniversityId?.toLowerCase().includes(term) ||
          a.patientProgram?.toLowerCase().includes(term) ||
          a.patientEmail?.toLowerCase().includes(term) ||
          a.notes?.toLowerCase().includes(term)
        );
      }

      // Sort results
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

      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(a => a.status?.toLowerCase() === 'pending').length || 0;
      const confirmed = data?.filter(a => a.status?.toLowerCase() === 'confirmed').length || 0;
      const completed = data?.filter(a => a.status?.toLowerCase() === 'completed').length || 0;

      setStats({ total, pending, confirmed, completed });

      // Paginate results
      const paginated = enriched.slice(0, ITEMS_PER_PAGE);
      setAppointments(paginated);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(enriched.length > ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load appointments:', err);
      showSnackbar('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, sortBy, searchInput]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      // Fetch all and paginate client-side
      const data = await appointmentsService.getAllAppointments(true);

      // Get profiles (should be cached)
      const { data: profiles } = await supabase.from('users').select('*');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Enrich
      let enriched = (data || []).map(apt => {
        const profile = profileMap[apt.user_id] || {};
        return {
          ...apt,
          patientName: profile.first_name
            ? `${profile.last_name || ''}, ${profile.first_name}`.trim()
            : apt.patient_name || apt.name || 'Unknown',
          patientUniversityId: profile.university_id || profile.student_id || '—',
          patientProgram: profile.program || profile.course || '—',
          patientEmail: profile.email || '—',
          patientPhone: profile.phone_number || '—',
        };
      });

      // Apply filters
      if (typeFilter !== 'all') {
        enriched = enriched.filter(a => a.type?.toLowerCase() === typeFilter);
      }
      if (statusFilter !== 'all') {
        enriched = enriched.filter(a => a.status?.toLowerCase() === statusFilter);
      }
      if (searchInput.trim()) {
        const term = searchInput.trim().toLowerCase();
        enriched = enriched.filter(a =>
          a.patientName?.toLowerCase().includes(term) ||
          a.patientUniversityId?.toLowerCase().includes(term) ||
          a.patientProgram?.toLowerCase().includes(term)
        );
      }

      // Sort
      enriched.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at) - new Date(b.created_at);
          case 'date_asc':
            return new Date(a.year, a.month - 1, a.day) - new Date(b.year, b.month - 1, b.day);
          case 'date_desc':
            return new Date(b.year, b.month - 1, b.day) - new Date(a.year, a.month - 1, a.day);
          case 'name_asc':
            return (a.patientName || '').localeCompare(b.patientName || '');
          case 'name_desc':
            return (b.patientName || '').localeCompare(a.patientName || '');
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });

      // Find starting index
      const startIdx = enriched.findIndex(a => a.id === lastDoc.id);
      const paginated = enriched.slice(startIdx + 1, startIdx + 1 + ITEMS_PER_PAGE);

      setAppointments(prev => [...prev, ...paginated]);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(paginated.length === ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load more appointments:', err);
      showSnackbar('Failed to load more appointments', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchAppointments(true);
    }, 400);
  };

  // Refetch when filters change
  useEffect(() => {
    fetchAppointments(true);
  }, [typeFilter, statusFilter, sortBy]);

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
      // Use the appointments service which sets is_archived flag
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

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'confirmed':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'completed':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const getTypeColor = (type) => {
    const t = type?.toLowerCase();
    switch (t) {
      case 'medical':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'dental':
        return { bg: 'bg-purple-100', text: 'text-purple-700' };
      case 'checkup':
        return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'followup':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const filterSelectCls = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

  if (userRole !== 'admin') {
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

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460] flex items-center gap-2">
            <i className="fa-solid fa-calendar-check"></i>
            Appointment Management
          </h2>
          <button
            onClick={() => fetchAppointments(true)}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm self-end sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Total</div>
            <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Pending</div>
            <div className="text-xl md:text-2xl font-extrabold text-amber-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Confirmed</div>
            <div className="text-xl md:text-2xl font-extrabold text-blue-600">{stats.confirmed}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Completed</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600">{stats.completed}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 bg-white rounded-xl border border-slate-200 p-3 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-36`}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-36`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-44`}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search patient, ID, notes..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-xl border border-slate-200">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Date & Time</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Notes</th>
                <th className="bg-slate-50 text-right p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Loading appointments…
                    </div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-calendar-check text-3xl text-slate-300"></i>
                      <p>No appointments found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((apt, idx) => {
                  const statusStyle = getStatusColor(apt.status);
                  const typeStyle = getTypeColor(apt.type);
                  return (
                    <tr key={apt.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* Patient */}
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

                      {/* Type */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                          {apt.type || 'General'}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="text-sm text-slate-700">{formatDate(apt.year, apt.month, apt.day)}</div>
                        <div className="text-xs text-slate-500">{apt.time ? formatTime(apt.time) : '—'}</div>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {apt.status || 'Pending'}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                        <span className="truncate block" title={apt.notes}>{apt.notes || '—'}</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteClick(apt)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-semibold"
                          title="Delete Appointment"
                        >
                          <i className="fa-solid fa-trash-can mr-1"></i>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="p-4 text-center border-t border-slate-200">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
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
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can"></i>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
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
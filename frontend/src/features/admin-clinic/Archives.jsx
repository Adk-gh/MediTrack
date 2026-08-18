// frontend/src/features/admin-clinic/Archives.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { logAdminAction } from '../../services/audit.service';
import DatePicker from '../../components/Datepicker';

const ITEMS_PER_PAGE = 100;

// Archive type labels - maps to actual table names without underscores
const ARCHIVE_TYPE_LABELS = {
  all: 'All Types',
  user: 'User',
  announcement: 'Announcement',
  appointment: 'Appointment',
  consultation: 'Consultation',
  medical_record: 'Medical Record',
  dental_record: 'Dental Record',
  notification: 'Notification',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

export default function Archives() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Admin identity used for audit logging. Falls back through id -> uid ->
  // 'system' so a log entry is still written even if the stored user object
  // is incomplete. Kept consistent with other management screens.
  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [filterType, setFilterType] = useState('all');
  const [filterDate, setFilterDate] = useState(''); // 'YYYY-MM-DD'
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // Modal states
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState(null);

  // Show snackbar notification
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar(null), 3000);
  };

  // Helper function to extract the target user ID for notifications
  const getTargetUserId = (archive) => {
    switch (archive.table) {
      case 'users':
        return archive.id;
      case 'appointments':
      case 'medical_records':
      case 'dental_records':
        return archive.user_id;
      case 'consultations':
        return archive.patient_id;
      // Announcements and Notifications generally do not notify a specific user upon archival actions
      default:
        return null;
    }
  };

  // Fetch archives from all tables using is_archived flag
  const fetchArchives = async () => {
    setLoading(true);
    try {
      // Set Supabase session for authenticated fetch
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      }

      // Fetch archived items from all tables
      const [
        usersData, announcementsData, appointmentsData, consultationsData,
        medicalData, dentalData, notificationsData
      ] = await Promise.all([
        supabase.from('users').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('announcements').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('consultations').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('medical_records').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('dental_records').select('*').eq('is_archived', true).order('updated_at', { ascending: false }),
        supabase.from('notifications').select('*, _user:users!notifications_user_id_fkey(first_name, last_name, email)').eq('is_archived', true).order('created_at', { ascending: false }),
      ]);

      // Combine all archived items with type labels
      const allArchives = [
        ...(usersData.data || []).map(r => ({
          ...r,
          archiveType: 'user',
          table: 'users',
          originalId: r.uid,
          displayName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email || r.university_id || 'User',
          detail: r.university_id || r.email || '',
          deletedBy: r.deleted_by || 'System'
        })),
        ...(announcementsData.data || []).map(r => ({
          ...r,
          archiveType: 'announcement',
          table: 'announcements',
          id: r.id,
          displayName: r.title || 'Announcement',
          detail: `Posted: ${r.author_name || 'Admin'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(appointmentsData.data || []).map(r => ({
          ...r,
          archiveType: 'appointment',
          table: 'appointments',
          id: r.id,
          displayName: r.patient_name || r.reason || 'Appointment',
          detail: `${r.service_type || 'Medical'} - ${r.reason || 'No reason'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(consultationsData.data || []).map(r => ({
          ...r,
          archiveType: 'consultation',
          table: 'consultations',
          id: r.id,
          displayName: r.patient_name || 'Consultation',
          detail: `${r.consultation_type || 'General'} - ${r.status || ''}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(medicalData.data || []).map(r => ({
          ...r,
          archiveType: 'medical_record',
          table: 'medical_records',
          id: r.id,
          displayName: `${r.last_name || ''}, ${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}`.trim() || 'Medical Record',
          detail: `ID: ${r.university_id || 'N/A'} | Visit: ${r.exam_date ? new Date(r.exam_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(dentalData.data || []).map(r => ({
          ...r,
          archiveType: 'dental_record',
          table: 'dental_records',
          id: r.id,
          displayName: `${r.last_name || ''}, ${r.first_name || ''} ${r.middle_name ? r.middle_name + ' ' : ''}`.trim() || 'Dental Record',
          detail: `ID: ${r.university_id || 'N/A'} | Visit: ${r.exam_date ? new Date(r.exam_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}`,
          deletedBy: r.deleted_by || 'System'
        })),
        ...(notificationsData.data || []).map(r => {
          const u = r._user || {};
          const recipientName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown User';
          return {
            ...r,
            archiveType: 'notification',
            table: 'notifications',
            id: r.id,
            displayName: r.title || 'Notification',
            detail: `To: ${recipientName} | ${r.message || ''}`,
            deletedBy: 'System',
            updated_at: r.created_at || r.updated_at // fallback for the date column
          };
        }),
      ];

      setArchives(allArchives);

    } catch (error) {
      console.error('Error fetching archives:', error);
      showSnackbar('Failed to load archives', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchArchives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterType, filterDate, sortOrder, debouncedSearch]);

  // Date formatter helper
  const toLocalYMD = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ── Derived & Filtered Data ──────────────────────────────────────────────
  const filteredArchives = archives
    .filter(a => {
      if (filterType !== 'all' && a.archiveType !== filterType) return false;
      if (filterDate) {
        const itemDate = toLocalYMD(a.updated_at || a.created_at);
        if (itemDate !== filterDate) return false;
      }
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        const searchable = `${a.displayName} ${a.detail} ${a.deletedBy} ${ARCHIVE_TYPE_LABELS[a.archiveType] || a.archiveType}`.toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      const nameA = (a.displayName || '').toLowerCase();
      const nameB = (b.displayName || '').toLowerCase();

      if (sortOrder === 'newest') return dateB - dateA;
      if (sortOrder === 'oldest') return dateA - dateB;
      if (sortOrder === 'name_asc') return nameA.localeCompare(nameB);
      if (sortOrder === 'name_desc') return nameB.localeCompare(nameA);
      return 0;
    });

  // ── Dynamic Stats ────────────────────────────────────────────────────────
  const stats = {
    total: filteredArchives.length,
    records: filteredArchives.filter(a => a.archiveType === 'medical_record' || a.archiveType === 'dental_record').length,
    announcements: filteredArchives.filter(a => a.archiveType === 'announcement').length,
    appointments: filteredArchives.filter(a => a.archiveType === 'appointment').length,
    consultations: filteredArchives.filter(a => a.archiveType === 'consultation').length,
    users: filteredArchives.filter(a => a.archiveType === 'user').length,
    notifications: filteredArchives.filter(a => a.archiveType === 'notification').length,
  };

  // View archive details
  const handleView = (archive) => {
    setSelectedArchive(archive);
    setShowViewModal(true);
  };

  // Open restore modal
  const handleRestoreClick = (archive) => {
    setSelectedArchive(archive);
    setShowRestoreModal(true);
  };

  // Confirm restore
  const confirmRestore = async () => {
    if (!selectedArchive) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const idToUse = selectedArchive.table === 'users' ? selectedArchive.uid : selectedArchive.id;

      const response = await fetch(`${API_URL}/archives/${idToUse}/restore?table=${selectedArchive.table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result?.message || result?.error || 'Failed to restore');
      }

      // ---- GLOBAL NOTIFICATION FOR THE USER ----
      const targetUserId = getTargetUserId(selectedArchive);
      if (targetUserId) {
        await supabase.from('notifications').insert({
          type: 'archive_restored',
          title: `${ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || 'Item'} Restored`,
          message: `Your ${ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || 'item'} has been restored by the clinic administration.`,
          user_id: targetUserId,
          reference_id: idToUse,
          reference_type: selectedArchive.archiveType,
          is_read: false
        });
      }

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'archive_restored',
        details: {
          archiveType: selectedArchive.archiveType,
          table: selectedArchive.table,
          itemId: idToUse,
          displayName: selectedArchive.displayName,
        },
        adminUid,
      });

      showSnackbar('Item restored successfully!', 'success');
      setShowRestoreModal(false);
      setShowViewModal(false);
      fetchArchives();
    } catch (error) {
      console.error('Error restoring:', error);
      showSnackbar('Error restoring item: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Permanently delete
  const handlePermanentDelete = (archive) => {
    setSelectedArchive(archive);
    setShowDeleteModal(true);
  };

  const confirmPermanentDelete = async () => {
    if (!selectedArchive) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const idToUse = selectedArchive.table === 'users' ? selectedArchive.uid : selectedArchive.id;

      const response = await fetch(`${API_URL}/archives/${idToUse}/delete?table=${selectedArchive.table}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      let result;
      try {
        result = await response.json();
      } catch (e) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result?.message || result?.error || 'Failed to delete');
      }

      // ---- GLOBAL NOTIFICATION FOR THE USER ----
      const targetUserId = getTargetUserId(selectedArchive);
      if (targetUserId) {
        await supabase.from('notifications').insert({
          type: 'archive_deleted',
          title: `${ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || 'Item'} Permanently Deleted`,
          message: `Your ${ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || 'item'} has been permanently deleted by the clinic administration.`,
          user_id: targetUserId,
          reference_id: idToUse,
          reference_type: selectedArchive.archiveType,
          is_read: false
        });
      }

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'archive_permanently_deleted',
        details: {
          archiveType: selectedArchive.archiveType,
          table: selectedArchive.table,
          itemId: idToUse,
          displayName: selectedArchive.displayName,
        },
        adminUid,
      });

      showSnackbar('Item permanently deleted!', 'success');
      setShowDeleteModal(false);
      fetchArchives();
    } catch (error) {
      console.error('Error deleting:', error);
      showSnackbar('Error deleting item: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(filteredArchives.length / ITEMS_PER_PAGE);
  const paginatedArchives = filteredArchives.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filterSelectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 7;

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 shrink-0">
        {[
          { label: 'Total', count: stats.total, color: 'text-slate-800' },
          { label: 'Records', count: stats.records, color: 'text-blue-600' },
          { label: 'Announcements', count: stats.announcements, color: 'text-green-600' },
          { label: 'Appointments', count: stats.appointments, color: 'text-pink-600' },
          { label: 'Consultations', count: stats.consultations, color: 'text-orange-600' },
          { label: 'Users', count: stats.users, color: 'text-purple-600' },
          { label: 'Notifications', count: stats.notifications, color: 'text-indigo-600' },
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

            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search archives..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-8 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title="Clear search"
                >
                  <i className="fa-solid fa-times text-xs"></i>
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-40`}
            >
              {Object.entries(ARCHIVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-40">
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                placeholder="All Dates"
                className={`${filterSelectCls} w-full pr-8`}
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
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
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-36`}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Right side: Refresh Action */}
          <div className="flex gap-2 flex-wrap items-center justify-end">
            <button
              onClick={fetchArchives}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Archives Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Item Name</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Details</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Deleted By</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Date</th>
                <th className="bg-slate-50 text-right p-3 pr-6 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT + 1} className="text-center py-12 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Loading archives...
                    </div>
                  </td>
                </tr>
              ) : paginatedArchives.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT + 1} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-solid fa-box-archive text-3xl text-slate-300"></i>
                      <p>No archived items found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedArchives.map((archive, idx) => (
                  <tr key={`${archive.table}-${archive.id}`} className={`hover:bg-slate-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                      {(page - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        archive.archiveType === 'medical_record' ? 'bg-blue-100 text-blue-700' :
                        archive.archiveType === 'dental_record' ? 'bg-cyan-100 text-cyan-700' :
                        archive.archiveType === 'announcement' ? 'bg-green-100 text-green-700' :
                        archive.archiveType === 'user' ? 'bg-purple-100 text-purple-700' :
                        archive.archiveType === 'consultation' ? 'bg-orange-100 text-orange-700' :
                        archive.archiveType === 'appointment' ? 'bg-pink-100 text-pink-700' :
                        archive.archiveType === 'notification' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {ARCHIVE_TYPE_LABELS[archive.archiveType] || archive.archiveType}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium text-slate-700">
                        {archive.displayName}
                      </div>
                      {(archive.archiveType !== 'medical_record' && archive.archiveType !== 'dental_record') && (
                        <div className="text-xs text-slate-400">ID: {String(archive.id).substring(0, 12)}...</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-slate-600 max-w-[200px] truncate" title={archive.detail}>
                        {archive.detail}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-sm text-slate-600">
                        {archive.deletedBy}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{formatDate(archive.updated_at || archive.created_at)}</div>
                    </td>
                    <td className="p-3 pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(archive)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRestoreClick(archive)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-emerald-600 hover:bg-emerald-50 transition-all"
                          title="Restore Item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(archive)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
                          title="Permanently Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{filteredArchives.length === 0 ? 0 : ((page - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(page * ITEMS_PER_PAGE, filteredArchives.length)}</span> of <span className="font-semibold">{filteredArchives.length}</span> items
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Previous
              </button>
              <div className="text-xs font-semibold px-2">
                Page {page} of {Math.max(1, totalPages)}
              </div>
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* View Modal */}
      {showViewModal && selectedArchive && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                  selectedArchive.archiveType === 'medical_record' ? 'bg-blue-100 text-blue-700' :
                  selectedArchive.archiveType === 'dental_record' ? 'bg-cyan-100 text-cyan-700' :
                  selectedArchive.archiveType === 'announcement' ? 'bg-green-100 text-green-700' :
                  selectedArchive.archiveType === 'user' ? 'bg-purple-100 text-purple-700' :
                  selectedArchive.archiveType === 'consultation' ? 'bg-orange-100 text-orange-700' :
                  selectedArchive.archiveType === 'appointment' ? 'bg-pink-100 text-pink-700' :
                  selectedArchive.archiveType === 'notification' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}
                </span>
                <h2 className="text-xl font-bold text-[#1a2e22]">Archive Details</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Key Info - Different based on type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Name/Title</label>
                  <p className="text-sm font-medium text-slate-700">{selectedArchive.displayName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Details</label>
                  <p className="text-sm text-slate-600">{selectedArchive.detail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Deleted By</label>
                  <p className="text-sm text-slate-700">{selectedArchive.deletedBy}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Archived Date</label>
                  <p className="text-sm text-slate-700">{formatDate(selectedArchive.updated_at || selectedArchive.created_at)}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">ID</label>
                <p className="text-sm font-mono text-slate-500">{String(selectedArchive.id)}</p>
              </div>

              {/* Full Data - Collapsible */}
              <details className="group">
                <summary className="text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:text-[#466460]">
                  View Full Data
                </summary>
                <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs font-mono overflow-auto max-h-48">
                  {JSON.stringify(selectedArchive, null, 2)}
                </pre>
              </details>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowRestoreModal(true);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Restore Confirmation Modal Using Portal */}
      {showRestoreModal && selectedArchive && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
          onClick={() => setShowRestoreModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1a2e22]">Restore Archive?</h2>
              <p className="text-slate-500 mt-2">
                Are you sure you want to restore this {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}?
                It will be restored and visible in its original location.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal Using Portal */}
      {showDeleteModal && selectedArchive && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4"
          onClick={() => { setShowDeleteModal(false); setSelectedArchive(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1a2e22]">Permanently Delete?</h2>
              <p className="text-slate-500 mt-2">
                This will permanently delete the {ARCHIVE_TYPE_LABELS[selectedArchive.archiveType] || selectedArchive.archiveType}.
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedArchive(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPermanentDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Snackbar Notification */}
      {snackbar && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-[100000] flex items-center gap-2 whitespace-nowrap shadow-xl ${
          snackbar.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {snackbar.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {snackbar.message}
        </div>
      )}
    </div>
  );
}
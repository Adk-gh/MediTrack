// frontend/src/features/admin-clinic/Archives.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabase';
import { logAdminAction } from '../../services/audit.service';

const ITEMS_PER_PAGE = 100;

// Archive type labels - maps to actual table names
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

export default function Archives() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Admin identity used for audit logging. Falls back through id -> uid ->
  // 'system' so a log entry is still written even if the stored user object
  // is incomplete. Kept consistent with AppointmentManagement.jsx and
  // ApprovalManagement.jsx.
  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

  const [archives, setArchives] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState(''); // For instant search input

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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

  // Fetch archives from all tables using is_archived flag
  const fetchArchives = async (isRefresh = false) => {
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
      let allArchives = [
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
            updated_at: r.created_at // fallback for the date column
          };
        }),
      ];

      // Filter by type
      if (filterType !== 'all') {
        allArchives = allArchives.filter(a => a.archiveType === filterType);
      }

      // Filter by search
      if (search) {
        const s = search.toLowerCase();
        allArchives = allArchives.filter(a => {
          const searchable = `${a.displayName} ${a.detail} ${a.deletedBy} ${a.archiveType}`.toLowerCase();
          return searchable.includes(s);
        });
      }

      // Re-sort the combined array
      allArchives.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

      setArchives(allArchives);
      setTotalCount(allArchives.length);

      if (isRefresh) setPage(1);

    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const accessToken = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refresh_token') || '';
      if (accessToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }

      const [usersCount, announcementsCount, appointmentsCount, consultationsCount, medicalCount, dentalCount, notificationsCount] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('consultations').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('medical_records').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('dental_records').select('*', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_archived', true),
      ]);

      setStats({
        total: (usersCount.count || 0) + (announcementsCount.count || 0) + (appointmentsCount.count || 0) +
               (consultationsCount.count || 0) + (medicalCount.count || 0) + (dentalCount.count || 0) + (notificationsCount.count || 0),
        users: usersCount.count || 0,
        announcements: announcementsCount.count || 0,
        appointments: appointmentsCount.count || 0,
        consultations: consultationsCount.count || 0,
        records: (medicalCount.count || 0) + (dentalCount.count || 0),
        notifications: notificationsCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchArchives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, search]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats();
    fetchArchives(true);
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
      fetchStats();
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
      fetchStats();
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const paginatedArchives = archives.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const filterSelectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 6;

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4 shrink-0">
        {[
          { label: 'Total', count: stats?.total || 0, color: 'text-slate-800' },
          { label: 'Records', count: stats?.records || 0, color: 'text-blue-600' },
          { label: 'Announcements', count: stats?.announcements || 0, color: 'text-green-600' },
          { label: 'Appointments', count: stats?.appointments || 0, color: 'text-pink-600' },
          { label: 'Consultations', count: stats?.consultations || 0, color: 'text-orange-600' },
          { label: 'Users', count: stats?.users || 0, color: 'text-purple-600' },
          { label: 'Notifications', count: stats?.notifications || 0, color: 'text-indigo-600' },
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
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={`${filterSelectCls} w-full sm:w-40`}
            >
              {Object.entries(ARCHIVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Right side: Inline Stats */}
          <div className="flex gap-2 flex-wrap items-center justify-end">

          </div>
          <button
              onClick={handleRefresh}
              className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
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
                      <div className="text-sm text-slate-600">{formatDate(archive.updated_at)}</div>
                    </td>
                    <td className="p-3 pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(archive)}
                          className="px-2 py-1.5 text-sm text-[#466460] hover:bg-[#466460]/10 rounded-lg transition font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleRestoreClick(archive)}
                          className="px-2 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition font-medium"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(archive)}
                          className="px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                        >
                          Delete
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
              Showing <span className="font-semibold">{totalCount === 0 ? 0 : ((page - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of <span className="font-semibold">{totalCount}</span> items
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto">
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
                  <p className="text-sm text-slate-700">{formatDate(selectedArchive.updated_at)}</p>
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

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedArchive && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedArchive && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
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
                onClick={() => setShowDeleteModal(false)}
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
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-2 whitespace-nowrap shadow-xl ${
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
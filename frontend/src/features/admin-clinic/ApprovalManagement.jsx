// C:\Users\HP\MediTrack\frontend\src\features\admin-clinic\ApprovalManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // Added for absolute top modals
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { logAdminAction } from '../../services/audit.service';

const ITEMS_PER_PAGE = 100;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'medical', label: 'Medical' },
  { value: 'dental', label: 'Dental' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

// Matches the route in App.jsx and the archiveType values Archives.jsx
// filters on (medical_record / dental_record).
const ARCHIVE_ROUTES = {
  medical: '/archives?type=medical_record',
  dental: '/archives?type=dental_record',
};

const SNACKBAR_DURATION_MS = 6000;

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const ApprovalManagement = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();

  // Admin identity used for audit logging. Falls back through id -> uid ->
  // 'system' so a log entry is still written even if the stored user object
  // is incomplete. Kept consistent with AppointmentManagement.jsx.
  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

  const [allFiltered, setAllFiltered] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });

  // message now optionally carries a `link` ({ label, path }) so the
  // snackbar can offer a click-through action (e.g. "View in Archive").
  const [message, setMessage] = useState(null);

  const snackbarTimer = useRef(null);
  const showSnackbar = (msg, type = 'success', link = null) => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type, link });
    snackbarTimer.current = setTimeout(() => setMessage(null), SNACKBAR_DURATION_MS);
  };

  const closeSnackbar = () => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage(null);
  };

  const handleSnackbarLinkClick = () => {
    if (message?.link?.path) {
      navigate(message.link.path);
    }
    closeSnackbar();
  };

  // Reset pagination to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, typeFilter, statusFilter, sortBy]);

  const fetchRecords = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);

      // Fetch both medical and dental records (only non-archived)
      const [medicalRes, dentalRes] = await Promise.all([
        supabase.from('medical_records').select('*, users(*)').eq('is_archived', false).order('created_at', { ascending: false }),
        supabase.from('dental_records').select('*, users(*)').eq('is_archived', false).order('created_at', { ascending: false })
      ]);

      if (medicalRes.error) throw medicalRes.error;
      if (dentalRes.error) throw dentalRes.error;

      // Process medical records
      const medicalData = (medicalRes.data || []).map(r => ({
        ...r,
        recordType: 'medical',
        patientName: r.users?.first_name
          ? `${r.users.last_name || ''}, ${r.users.first_name}${r.users.middle_name ? ' ' + r.users.middle_name : ''}${r.users.suffix ? ' ' + r.users.suffix : ''}`
            .trim()
          : r.patient_name || 'Unknown',
        patientUniversityId: r.users?.university_id || r.users?.student_id || '—',
        patientProgram: r.users?.program || r.users?.course || '—',
        patientEmail: r.users?.email || '—',
      }));

      // Process dental records
      const dentalData = (dentalRes.data || []).map(r => ({
        ...r,
        recordType: 'dental',
        patientName: r.users?.first_name
          ? `${r.users.last_name || ''}, ${r.users.first_name}${r.users.middle_name ? ' ' + r.users.middle_name : ''}${r.users.suffix ? ' ' + r.users.suffix : ''}`
            .trim()
          : r.patient_name || 'Unknown',
        patientUniversityId: r.users?.university_id || r.users?.student_id || '—',
        patientProgram: r.users?.program || r.users?.course || '—',
        patientEmail: r.users?.email || '—',
      }));

      // Combine and sort by created_at
      const combined = [...medicalData, ...dentalData].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      // Apply filters
      let filtered = combined;

      // Type filter
      if (typeFilter !== 'all') {
        filtered = filtered.filter(r => r.recordType === typeFilter);
      }

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(r => (r.status || 'pending').toLowerCase() === statusFilter);
      }

      // Search filter — only when there is an actual search term
      const term = searchInput.trim().toLowerCase();
      if (term) {
        filtered = filtered.filter(r =>
          r.patientName?.toLowerCase().includes(term) ||
          r.patientUniversityId?.toLowerCase().includes(term) ||
          r.patientProgram?.toLowerCase().includes(term) ||
          r.patientEmail?.toLowerCase().includes(term)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at) - new Date(b.created_at);
          case 'name_asc':
            return (a.patientName || '').localeCompare(b.patientName || '');
          case 'name_desc':
            return (b.patientName || '').localeCompare(a.patientName || '');
          case 'newest':
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });

      // Calculate stats from filtered data
      const total = filtered.length;
      const pending = filtered.filter(r => (r.status || 'pending').toLowerCase() === 'pending').length;
      const approved = filtered.filter(r => (r.status || 'pending').toLowerCase() === 'approved' || r.status?.toLowerCase() === 'done').length;

      setStats({ total, pending, approved });

      setAllFiltered(filtered);
      setTotalRecords(filtered.length);

      if (isRefresh) setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load records:', err);
      showSnackbar('Failed to load approval records', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, sortBy, searchInput]);

  // Derived paginated state
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  const paginatedRecords = allFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  // Refetch immediately when filters/sort change
  useEffect(() => {
    fetchRecords(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, sortBy]);

  // Debounce the search box
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRecords(true);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Clean up the snackbar timer on unmount
  useEffect(() => {
    return () => {
      if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    };
  }, []);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editData, setEditData] = useState({ status: 'pending', issue_cert: false });
  const [saving, setSaving] = useState(false);

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setDeleting(true);
    try {
      // Get current user info for deleted_by
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = localStorage.getItem('name') || '';

      // Set is_archived to true instead of deleting
      const tableName = recordToDelete.recordType === 'medical' ? 'medical_records' : 'dental_records';
      const { error } = await supabase.from(tableName).update({
        is_archived: true,
        deleted_by: name || user.email || 'Admin',
        updated_at: new Date().toISOString()
      }).eq('id', recordToDelete.id);

      if (error) throw error;

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'record_archived',
        details: {
          recordId: recordToDelete.id,
          recordType: recordToDelete.recordType,
        },
        adminUid,
      });

      const recordTypeLabel = recordToDelete.recordType === 'dental' ? 'Dental' : 'Medical';
      showSnackbar(
        `Record archived successfully. Check the Archive ${recordTypeLabel} page to view it.`,
        'success',
        { label: `View in Archive ${recordTypeLabel}`, path: ARCHIVE_ROUTES[recordToDelete.recordType] }
      );
      setShowDeleteModal(false);
      setRecordToDelete(null);
      fetchRecords(true);
    } catch (err) {
      console.error('Failed to archive record:', err);
      showSnackbar('Failed to archive record', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'pending':
        return { bg: 'bg-amber-100', text: 'text-amber-700' };
      case 'approved':
      case 'done':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700' };
      case 'rejected':
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
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const filterSelectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 7;

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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 shrink-0">
        {[
          { label: 'Total', count: stats.total, color: 'text-slate-800' },
          { label: 'Pending', count: stats.pending, color: 'text-amber-600' },
          { label: 'Approved', count: stats.approved, color: 'text-emerald-600' },
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
                placeholder="Search patient, ID..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-32`}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`${filterSelectCls} w-full sm:w-32`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

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

          {/* Right side: Refresh button */}
          <button
            onClick={() => fetchRecords(true)}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#8aacaa] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar]:h-[4px]">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-center p-3 pl-4 w-12 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Patient</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Submitted</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Last Updated</th>
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
                      Loading records…
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-clipboard-check text-3xl text-slate-300"></i>
                      <p>No approval records found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, idx) => {
                  const statusStyle = getStatusColor(record.status);
                  const typeStyle = getTypeColor(record.recordType);
                  return (
                    <tr key={`${record.recordType}-${record.id}`} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-sm text-[#466460] shrink-0">
                            {record.patientName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{record.patientName}</div>
                            <div className="text-xs text-slate-500">{record.patientUniversityId} • {record.patientProgram}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                          {record.recordType === 'medical' ? 'Medical' : 'Dental'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {record.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs text-slate-500">{formatDate(record.created_at)}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-slate-500">{formatDate(record.updated_at || record.approved_at)}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditRecord(record);
                              setEditData({
                                status: record.status || 'pending',
                                issue_cert: record.issue_cert || false
                              });
                              setShowEditModal(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
                            title="Edit Record"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
                            title="Archive Record"
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

        {/* Delete Confirmation Modal Using Portal */}
        {showDeleteModal && createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
            onClick={() => { setShowDeleteModal(false); setRecordToDelete(null); }}
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
                  <h3 className="text-lg font-bold text-slate-800">Archive Record</h3>
                  <p className="text-sm text-slate-500">You can restore it later from Archives</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to archive the {recordToDelete?.recordType} record for <span className="font-semibold">{recordToDelete?.patientName}</span>?
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Current status: <span className="font-semibold">{recordToDelete?.status || 'Pending'}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setRecordToDelete(null); }}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0a3 3 0 013 3h-2.25a3 3 0 013-3m0 0h.008v.008h-.008V14.25m0 0h2.25a3 3 0 003-3v-2.25a3 3 0 00-3-3H9.75a3 3 0 00-3 3v2.25a3 3 0 003 3h2.25z" />
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

        {/* Edit Record Modal Using Portal */}
        {showEditModal && createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-black/50 flex items-center justify-center"
            onClick={() => { setShowEditModal(false); setEditRecord(null); }}
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
                  <h3 className="text-lg font-bold text-slate-800">Edit Record</h3>
                  <p className="text-sm text-slate-500">{editRecord?.patientName}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Status Toggle */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Status</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditData({ ...editData, status: 'pending' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                        editData.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-clock mr-1"></i> Pending
                    </button>
                    <button
                      onClick={() => setEditData({ ...editData, status: 'approved' })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                        editData.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-check-circle mr-1"></i> Approved
                    </button>
                  </div>
                </div>

                {/* Issue Cert Toggle */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                    {editRecord?.recordType === 'dental' ? 'Dental Report Sent' : 'Certificate Issued'}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditData({ ...editData, issue_cert: false })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                        !editData.issue_cert
                          ? 'bg-red-100 text-red-700 border-2 border-red-400'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-xmark mr-1"></i> No
                    </button>
                    <button
                      onClick={() => setEditData({ ...editData, issue_cert: true })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                        editData.issue_cert
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-400'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <i className="fa-solid fa-check mr-1"></i> Yes
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowEditModal(false); setEditRecord(null); }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const table = editRecord?.recordType === 'dental' ? 'dental_records' : 'medical_records';
                      const { error } = await supabase
                        .from(table)
                        .update({
                          status: editData.status,
                          is_approved: editData.status === 'approved',
                          approved_at: editData.status === 'approved' ? new Date().toISOString() : null,
                          issue_cert: editData.issue_cert,
                        })
                        .eq('id', editRecord.id);

                      if (error) throw error;

                      // ---- AUDIT LOG ----
                      logAdminAction({
                        action: 'record_updated',
                        details: {
                          recordId: editRecord.id,
                          recordType: editRecord.recordType,
                          newStatus: editData.status,
                          issueCert: editData.issue_cert,
                          table,
                        },
                        adminUid,
                      });

                      setShowEditModal(false);
                      setEditRecord(null);
                      showSnackbar('Record updated successfully!', 'success');
                      fetchRecords(true);
                    } catch (err) {
                      console.error('Error updating record:', err);
                      showSnackbar('Failed to update record', 'error');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 max-w-[92vw] px-5 py-3 rounded-xl text-sm font-semibold z-50 flex items-center gap-3 shadow-xl ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {/* Snackbar content remains exactly the same */}
          <span className="shrink-0">
            {message.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </span>

          <span className="whitespace-normal">{message.text}</span>

          {message.link && (
            <button
              onClick={handleSnackbarLinkClick}
              className="underline underline-offset-2 font-bold hover:opacity-80 transition shrink-0"
            >
              {message.link.label}
            </button>
          )}

          <button
            onClick={closeSnackbar}
            className="shrink-0 ml-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ApprovalManagement;
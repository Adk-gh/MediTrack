// frontend/src/features/admin-clinic/ApprovalManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';

const ITEMS_PER_PAGE = 20;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'medical', label: 'Medical' },
  { value: 'dental', label: 'Dental' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'done', label: 'Done' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const ApprovalManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [message, setMessage] = useState(null);
  const [patientProfiles, setPatientProfiles] = useState({});

  const snackbarTimer = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

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
          ? `${r.users.last_name || ''}, ${r.users.first_name}`.trim()
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
          ? `${r.users.last_name || ''}, ${r.users.first_name}`.trim()
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

      // Calculate stats from combined data (before filtering)
      const total = combined.length;
      const pending = combined.filter(r => (r.status || 'pending').toLowerCase() === 'pending').length;
      const approved = combined.filter(r => (r.status || 'pending').toLowerCase() === 'approved' || r.status?.toLowerCase() === 'done').length;
      const rejected = combined.filter(r => r.status?.toLowerCase() === 'rejected').length;

      setStats({ total, pending, approved, rejected });

      // Paginate
      const paginated = filtered.slice(0, ITEMS_PER_PAGE);
      setRecords(paginated);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(filtered.length > ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load records:', err);
      showSnackbar('Failed to load approval records', 'error');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, sortBy, searchInput]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      // Re-fetch all (same as fetchRecords but without loading state)
      const [medicalRes, dentalRes] = await Promise.all([
        supabase.from('medical_records').select('*, users(*)').order('created_at', { ascending: false }),
        supabase.from('dental_records').select('*, users(*)').order('created_at', { ascending: false })
      ]);

      const medicalData = (medicalRes.data || []).map(r => ({
        ...r,
        recordType: 'medical',
        patientName: r.users?.first_name
          ? `${r.users.last_name || ''}, ${r.users.first_name}`.trim()
          : r.patient_name || 'Unknown',
        patientUniversityId: r.users?.university_id || r.users?.student_id || '—',
        patientProgram: r.users?.program || r.users?.course || '—',
        patientEmail: r.users?.email || '—',
      }));

      const dentalData = (dentalRes.data || []).map(r => ({
        ...r,
        recordType: 'dental',
        patientName: r.users?.first_name
          ? `${r.users.last_name || ''}, ${r.users.first_name}`.trim()
          : r.patient_name || 'Unknown',
        patientUniversityId: r.users?.university_id || r.users?.student_id || '—',
        patientProgram: r.users?.program || r.users?.course || '—',
        patientEmail: r.users?.email || '—',
      }));

      let combined = [...medicalData, ...dentalData].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

      // Apply filters
      if (typeFilter !== 'all') {
        combined = combined.filter(r => r.recordType === typeFilter);
      }
      if (statusFilter !== 'all') {
        combined = combined.filter(r => (r.status || 'pending').toLowerCase() === statusFilter);
      }
      const term = searchInput.trim().toLowerCase();
      if (term) {
        combined = combined.filter(r =>
          r.patientName?.toLowerCase().includes(term) ||
          r.patientUniversityId?.toLowerCase().includes(term) ||
          r.patientProgram?.toLowerCase().includes(term) ||
          r.patientEmail?.toLowerCase().includes(term)
        );
      }

      // Sort
      combined.sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return new Date(a.created_at) - new Date(b.created_at);
          case 'name_asc':
            return (a.patientName || '').localeCompare(b.patientName || '');
          case 'name_desc':
            return (b.patientName || '').localeCompare(a.patientName || '');
          default:
            return new Date(b.created_at) - new Date(a.created_at);
        }
      });

      // Find starting index
      const startIdx = combined.findIndex(r => r.id === lastDoc.id);
      const paginated = combined.slice(startIdx + 1, startIdx + 1 + ITEMS_PER_PAGE);

      setRecords(prev => [...prev, ...paginated]);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(paginated.length === ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load more records:', err);
      showSnackbar('Failed to load more records', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  // Search input — just track the raw value here. The actual fetch is
  // triggered by the debounced useEffect below, so it always reads the
  // freshest searchInput (including when the field is cleared to "").
  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  // Refetch immediately when filters/sort change
  useEffect(() => {
    fetchRecords(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, sortBy]);

  // Debounce the search box specifically. Keying this effect directly off
  // searchInput guarantees the closure sees the latest value (including
  // empty string), instead of the stale value a manual setTimeout inside
  // the onChange handler would have captured.
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRecords(true);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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
      // Set is_archived to true instead of deleting
      const tableName = recordToDelete.recordType === 'medical' ? 'medical_records' : 'dental_records';
      const { error } = await supabase.from(tableName).update({ is_archived: true }).eq('id', recordToDelete.id);

      if (error) throw error;

      showSnackbar('Record archived successfully. You can restore it from the Archives page.');
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

  const filterSelectCls = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

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

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460] flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check"></i>
            Approval Management
          </h2>
          <button
            onClick={() => fetchRecords(true)}
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
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Approved</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600">{stats.approved}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Rejected</div>
            <div className="text-xl md:text-2xl font-extrabold text-red-600">{stats.rejected}</div>
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
              placeholder="Search patient, ID..."
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
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Submitted</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Last Updated</th>
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
                      Loading records…
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-clipboard-check text-3xl text-slate-300"></i>
                      <p>No approval records found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => {
                  const statusStyle = getStatusColor(record.status);
                  const typeStyle = getTypeColor(record.recordType);
                  return (
                    <tr key={`${record.recordType}-${record.id}`} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* Patient */}
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

                      {/* Type */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${typeStyle.bg} ${typeStyle.text}`}>
                          {record.recordType === 'medical' ? 'Medical' : 'Dental'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                          {record.status || 'Pending'}
                        </span>
                      </td>

                      {/* Submitted */}
                      <td className="p-3 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs text-slate-500">{formatDate(record.created_at)}</div>
                      </td>

                      {/* Last Updated */}
                      <td className="p-3 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-slate-500">{formatDate(record.updated_at || record.approved_at)}</div>
                      </td>

                      {/* Actions */}
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
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-[#466460] hover:text-white transition-all font-semibold"
                            title="Edit Record"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(record)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-semibold"
                            title="Delete Record"
                          >
                            <i className="fa-solid fa-trash-can mr-1"></i>
                            Delete
                          </button>
                        </div>
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
                    <i className="fa-solid fa-archive"></i>
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#466460]/10 flex items-center justify-center">
                <i className="fa-solid fa-pen-to-square text-[#466460] text-xl"></i>
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
                  <button
                    onClick={() => setEditData({ ...editData, status: 'rejected' })}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      editData.status === 'rejected'
                        ? 'bg-red-100 text-red-700 border-2 border-red-400'
                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    <i className="fa-solid fa-xmark-circle mr-1"></i> Rejected
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

                    // Update local state
                    setRecords(records.map(r =>
                      r.id === editRecord.id
                        ? { ...r, status: editData.status, issue_cert: editData.issue_cert, is_approved: editData.status === 'approved' }
                        : r
                    ));

                    setShowEditModal(false);
                    setEditRecord(null);
                    showSnackbar('Record updated successfully!', 'success');
                  } catch (err) {
                    console.error('Error updating record:', err);
                    showSnackbar('Failed to update record', 'error');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#466460] to-[#5a7a76] text-white font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

export default ApprovalManagement;
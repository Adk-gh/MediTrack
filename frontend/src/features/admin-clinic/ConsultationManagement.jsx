// frontend/src/features/admin-clinic/ConsultationManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import * as consultationsService from '../../services/consultations.service';
import { logAdminAction } from '../../services/audit.service';

const ITEMS_PER_PAGE = 100;

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'medical', label: 'Medical' },
  { value: 'dental', label: 'Dental' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'ended', label: 'Ended' },
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
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const ConsultationManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (currentUser.role || '').toLowerCase();

  // Admin identity used for audit logging. Falls back through id -> uid ->
  // 'system' so a log entry is still written even if the stored user object
  // is incomplete. Kept consistent with the other admin-clinic screens.
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

  const [stats, setStats] = useState({ total: 0, active: 0, medical: 0, dental: 0 });
  const [message, setMessage] = useState(null);

  const snackbarTimer = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  // Reset pagination to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchInput, typeFilter, statusFilter, sortBy]);

  // Build query for fetching consultations
  const buildQuery = useCallback((baseQuery) => {
    let q = baseQuery;

    // Filter by archived status - only show non-archived
    q = q.or('is_archived.is.null,is_archived.eq.false');

    // Apply type filter
    if (typeFilter !== 'all') {
      q = q.eq('consultation_type', typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    return q;
  }, [typeFilter, statusFilter]);

  const fetchConsultations = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);

      // First get all consultations to calculate stats and apply filters
      let query = supabase.from('consultations').select('*');
      query = buildQuery(query);
      query = query.order('created_at', { ascending: false });

      const { data: allData, error } = await query;
      if (error) throw error;

      // Get patient profiles for filtering
      const { data: profiles } = await supabase.from('users').select('*');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Enrich with patient info and last message
      let enriched = await Promise.all((allData || []).map(async (conv) => {
        const profile = profileMap[conv.patient_id] || {};
        let lastMsg = '';
        try {
          const msgs = await consultationsService.getMessagesByConsultationId(conv.id);
          lastMsg = msgs?.slice(-1)[0]?.message || '';
        } catch {}
        return {
          ...conv,
          patientName: profile.first_name
            ? `${profile.last_name || ''}, ${profile.first_name}${profile.middle_name ? ' ' + profile.middle_name  : ''}${profile.suffix ? ' ' + profile.suffix : ''}`.trim()
            : conv.patient_name || 'Unknown',
          patientUniversityId: profile.university_id || profile.student_id || '—',
          patientProgram: profile.program || profile.course || '—',
          lastMessage: lastMsg,
        };
      }));

      // Apply search filter — only when there is an actual search term
      const term = searchInput.trim().toLowerCase();
      if (term) {
        enriched = enriched.filter(c =>
          c.patientName?.toLowerCase().includes(term) ||
          c.patientUniversityId?.toLowerCase().includes(term) ||
          c.patientProgram?.toLowerCase().includes(term) ||
          c.lastMessage?.toLowerCase().includes(term)
        );
      }

      // Sort results
      enriched.sort((a, b) => {
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

      // Calculate stats (based on non-searched, but type/status filtered data)
      const total = allData?.length || 0;
      const active = allData?.filter(c => c.status !== 'ended').length || 0;
      const medical = allData?.filter(c => c.consultation_type === 'medical').length || 0;
      const dental = allData?.filter(c => c.consultation_type === 'dental').length || 0;

      setStats({ total, active, medical, dental });

      setAllFiltered(enriched);
      setTotalRecords(enriched.length);

      if (isRefresh) setCurrentPage(1);

    } catch (err) {
      console.error('Failed to load consultations:', err);
      showSnackbar('Failed to load consultations', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, searchInput, sortBy]);

  // Derived paginated state
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  const paginatedConsultations = allFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  // Refetch immediately when filters/sort change
  useEffect(() => {
    fetchConsultations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, sortBy]);

  // Debounce the search box
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchConsultations(true);
    }, 400);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleDeleteClick = (conv) => {
    setConsultationToDelete(conv);
    setShowDeleteModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [consultationToDelete, setConsultationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!consultationToDelete) return;
    setDeleting(true);
    try {
      // Use the consultations service which sets is_archived flag
      await consultationsService.deleteConsultation(consultationToDelete.id);

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'consultation_archived',
        details: {
          consultationId: consultationToDelete.id,
          consultationType: consultationToDelete.consultation_type,
          patientId: consultationToDelete.patient_id,
        },
        adminUid,
      });

      showSnackbar('Consultation archived successfully. You can restore it from the Archives page.');
      setShowDeleteModal(false);
      setConsultationToDelete(null);
      fetchConsultations(true);
    } catch (err) {
      console.error('Failed to archive consultation:', err);
      showSnackbar('Failed to archive consultation', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // --- Edit Status modal state/handlers ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [consultationToEdit, setConsultationToEdit] = useState(null);
  const [editStatus, setEditStatus] = useState('active');
  const [savingStatus, setSavingStatus] = useState(false);

  const handleEditClick = (conv) => {
    setConsultationToEdit(conv);
    setEditStatus(conv.status === 'ended' ? 'ended' : 'active');
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!consultationToEdit) return;
    setSavingStatus(true);
    try {
      const { error } = await supabase
        .from('consultations')
        .update({ status: editStatus })
        .eq('id', consultationToEdit.id);

      if (error) throw error;

      // ---- AUDIT LOG ----
      logAdminAction({
        action: 'consultation_status_updated',
        details: {
          consultationId: consultationToEdit.id,
          consultationType: consultationToEdit.consultation_type,
          previousStatus: consultationToEdit.status || 'active',
          newStatus: editStatus,
        },
        adminUid,
      });

      showSnackbar('Consultation status updated successfully');
      setShowEditModal(false);
      setConsultationToEdit(null);
      fetchConsultations(true);
    } catch (err) {
      console.error('Failed to update consultation status:', err);
      showSnackbar('Failed to update consultation status', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 7;

  const summaryStats = [
    { label: 'Total',   count: stats.total,   color: 'text-slate-700'   },
    { label: 'Active',  count: stats.active,  color: 'text-emerald-700' },
    { label: 'Medical', count: stats.medical, color: 'text-blue-700'    },
    { label: 'Dental',  count: stats.dental,  color: 'text-purple-700'  },
  ];

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

      {/* Summary stats — its own row, separate from the toolbar, stretched full width */}
      <div className="shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {summaryStats.map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-center gap-2">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Unified Inline Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

          {/* Left side: Search & Filters */}
          <div className="flex flex-wrap gap-3 items-center flex-1 w-full xl:w-auto">

            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search patient, ID, message..."
                value={searchInput}
                onChange={handleSearchChange}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={`${selectCls} w-full sm:w-32`}
            >
              {TYPE_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`${selectCls} w-full sm:w-32`}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`${selectCls} w-full sm:w-36`}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Right side: Refresh */}
          <button
              onClick={() => fetchConsultations(true)}
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
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Last Message</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Created</th>
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
                      Loading consultations…
                    </div>
                  </td>
                </tr>
              ) : paginatedConsultations.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-comments text-3xl text-slate-300"></i>
                      <p>No consultations found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedConsultations.map((conv, idx) => {
                  const tab = conv.consultation_type === 'medical'
                    ? { accent: '#1a5c3a', light: '#e8f5ee' }
                    : { accent: '#1a4a7a', light: '#e8f0fa' };
                  const isEnded = conv.status === 'ended';
                  return (
                    <tr key={conv.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
                        {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            style={{ backgroundColor: tab.light, color: tab.accent }}
                          >
                            {conv.patientName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{conv.patientName}</div>
                            <div className="text-xs text-slate-500">{conv.patientUniversityId} • {conv.patientProgram}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className="text-xs px-2 py-1 rounded-full font-semibold"
                          style={{ backgroundColor: tab.light, color: tab.accent }}
                        >
                          {conv.consultation_type === 'medical' ? 'Medical' : 'Dental'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          isEnded
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isEnded ? 'Ended' : 'Active'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                        <span className="truncate block" title={conv.lastMessage}>{conv.lastMessage || 'No messages'}</span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="text-xs text-slate-500">{formatDate(conv.created_at)}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(conv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
                            title="Edit Status"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(conv)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
                            title="Archive Consultation"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-600 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Archive Consultation</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive the consultation with <span className="font-semibold">{consultationToDelete?.patientName}</span>?
              </p>
              <p className="text-xs text-slate-400 mt-2">
                All messages in this conversation will be archived and can be restored later.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setConsultationToDelete(null); }}
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
        </div>
      )}

      {/* Edit Status Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#e0eceb] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#466460" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Consultation Status</h3>
                <p className="text-sm text-slate-500">{consultationToEdit?.patientName}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Status
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditStatus('active')}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                    editStatus === 'active'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setEditStatus('ended')}
                  className={`flex-1 px-3 py-2.5 rounded-lg border text-sm font-semibold transition-all ${
                    editStatus === 'ended'
                      ? 'bg-slate-500 border-slate-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Ended
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditModal(false); setConsultationToEdit(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={savingStatus}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2"
                disabled={savingStatus || editStatus === consultationToEdit?.status}
              >
                {savingStatus ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Save
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

export default ConsultationManagement;
// frontend/src/features/admin-clinic/ConsultationManagement.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabase';
import * as consultationsService from '../../services/consultations.service';

const ITEMS_PER_PAGE = 20;

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

  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, medical: 0, dental: 0 });
  const [message, setMessage] = useState(null);

  const snackbarTimer = useRef(null);
  const searchTimeout = useRef(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  // Build query for fetching consultations
  const buildQuery = useCallback((baseQuery, isFirstPage = true) => {
    let q = baseQuery;

    // Apply type filter
    if (typeFilter !== 'all') {
      q = q.eq('consultation_type', typeFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    // Apply search filter on patient data
    // We'll handle this after fetching since we need to join with users table

    return q;
  }, [typeFilter, statusFilter]);

  const fetchConsultations = useCallback(async (isRefresh = false) => {
    try {
      setLoading(true);

      // First get all consultations to calculate stats and apply filters
      let query = supabase.from('consultations').select('*');
      query = buildQuery(query, true);
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
            ? `${profile.last_name || ''}, ${profile.first_name}`.trim()
            : conv.patient_name || 'Unknown',
          patientUniversityId: profile.university_id || profile.student_id || '—',
          patientProgram: profile.program || profile.course || '—',
          lastMessage: lastMsg,
        };
      }));

      // Apply search filter
      if (searchInput.trim()) {
        const term = searchInput.trim().toLowerCase();
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

      // Calculate stats
      const total = allData?.length || 0;
      const active = allData?.filter(c => c.status !== 'ended').length || 0;
      const medical = allData?.filter(c => c.consultation_type === 'medical').length || 0;
      const dental = allData?.filter(c => c.consultation_type === 'dental').length || 0;

      setStats({ total, active, medical, dental });

      // Paginate results
      const paginated = enriched.slice(0, ITEMS_PER_PAGE);
      setConsultations(paginated);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(enriched.length > ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load consultations:', err);
      showSnackbar('Failed to load consultations', 'error');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, searchInput, sortBy]);

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      // Fetch all and paginate client-side for simplicity
      let query = supabase.from('consultations').select('*');
      query = buildQuery(query, false);
      query = query.order('created_at', { ascending: false });

      const { data: allData, error } = await query;
      if (error) throw error;

      // Get patient profiles
      const { data: profiles } = await supabase.from('users').select('*');
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Enrich
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
            ? `${profile.last_name || ''}, ${profile.first_name}`.trim()
            : conv.patient_name || 'Unknown',
          patientUniversityId: profile.university_id || profile.student_id || '—',
          patientProgram: profile.program || profile.course || '—',
          lastMessage: lastMsg,
        };
      }));

      // Apply search filter
      if (searchInput.trim()) {
        const term = searchInput.trim().toLowerCase();
        enriched = enriched.filter(c =>
          c.patientName?.toLowerCase().includes(term) ||
          c.patientUniversityId?.toLowerCase().includes(term) ||
          c.patientProgram?.toLowerCase().includes(term) ||
          c.lastMessage?.toLowerCase().includes(term)
        );
      }

      // Sort
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

      // Find the starting index based on lastDoc
      const startIdx = enriched.findIndex(c => c.id === lastDoc.id);
      const paginated = enriched.slice(startIdx + 1, startIdx + 1 + ITEMS_PER_PAGE);

      setConsultations(prev => [...prev, ...paginated]);
      setLastDoc(paginated[paginated.length - 1] || null);
      setHasMore(paginated.length === ITEMS_PER_PAGE);

    } catch (err) {
      console.error('Failed to load more consultations:', err);
      showSnackbar('Failed to load more consultations', 'error');
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
      fetchConsultations(true);
    }, 400);
  };

  // Refetch when filters change
  useEffect(() => {
    fetchConsultations(true);
  }, [typeFilter, statusFilter, sortBy]);

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
            <i className="fa-solid fa-comments"></i>
            Consultation Management
          </h2>
          <button
            onClick={() => fetchConsultations(true)}
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
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Active</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600">{stats.active}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Medical</div>
            <div className="text-xl md:text-2xl font-extrabold text-blue-600">{stats.medical}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Dental</div>
            <div className="text-xl md:text-2xl font-extrabold text-purple-600">{stats.dental}</div>
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
              className={`${filterSelectCls} w-full sm:w-40`}
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
              placeholder="Search patient, ID, message..."
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
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Last Message</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Created</th>
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
                      Loading consultations…
                    </div>
                  </td>
                </tr>
              ) : consultations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <i className="fa-regular fa-comments text-3xl text-slate-300"></i>
                      <p>No consultations found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                consultations.map((conv, idx) => {
                  const tab = conv.consultation_type === 'medical'
                    ? { accent: '#1a5c3a', light: '#e8f5ee' }
                    : { accent: '#1a4a7a', light: '#e8f0fa' };
                  const isEnded = conv.status === 'ended';
                  return (
                    <tr key={conv.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      {/* Patient */}
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

                      {/* Type */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className="text-xs px-2 py-1 rounded-full font-semibold"
                          style={{ backgroundColor: tab.light, color: tab.accent }}
                        >
                          {conv.consultation_type === 'medical' ? 'Medical' : 'Dental'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          isEnded
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isEnded ? 'Ended' : 'Active'}
                        </span>
                      </td>

                      {/* Last Message */}
                      <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                        <span className="truncate block" title={conv.lastMessage}>{conv.lastMessage || 'No messages'}</span>
                      </td>

                      {/* Created */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="text-xs text-slate-500">{formatDate(conv.created_at)}</div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteClick(conv)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all font-semibold"
                          title="Delete Consultation"
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
                    <i className="fa-solid fa-archive"></i>
                    Archive
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
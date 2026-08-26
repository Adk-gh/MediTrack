// frontend/src/features/admin-clinic/NotificationsManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // Added for absolute top modals
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import DatePicker from '../../components/Datepicker';

// ── Static config ────────────────────────────────────────────────────────
const TYPE_OPTIONS = [
  'appointment_request',
  'appointment_status',
  'record_added',
  'record_updated',
  'announcement',
  'approval',
  'consultation',
  'consultation_response',
  'consultation_ended',
  'test',
];

const READ_STYLES = {
  unread: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-400' },
  read:   { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const TYPE_BADGE_STYLES = {
  appointment_request:   'bg-blue-100 text-blue-700',
  appointment_status:    'bg-blue-100 text-blue-700',
  record_added:          'bg-purple-100 text-purple-700',
  record_updated:        'bg-purple-100 text-purple-700',
  announcement:          'bg-indigo-100 text-indigo-700',
  approval:              'bg-emerald-100 text-emerald-700',
  consultation:          'bg-teal-100 text-teal-700',
  consultation_response: 'bg-teal-100 text-teal-700',
  consultation_ended:    'bg-slate-200 text-slate-600',
  test:                  'bg-yellow-100 text-yellow-700',
};

const getTypeBadge = (type) => TYPE_BADGE_STYLES[type] || 'bg-slate-100 text-slate-500';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatDateTime = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  const datePart = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
};

const getFullName = (u) => {
  if (!u) return 'Unknown user';
  const fn = u.first_name || '', ln = u.last_name || '', mn = u.middle_name || '';
  if (ln) return `${ln}, ${fn}${mn ? ' ' + mn : ''}`.trim();
  return fn || u.email || 'Unknown user';
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '?';
};

// Formats snake_case to Capitalized Words (e.g. "appointment_request" -> "Appointment Request")
const formatTypeLabel = (type) => {
  if (!type) return 'Unknown';
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const ReadPill = ({ isRead }) => {
  const s = isRead ? READ_STYLES.read : READ_STYLES.unread;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
      {isRead ? 'Read' : 'Unread'}
    </span>
  );
};

// ── Notification row ───────────────────────────────────────────────────────
const NotificationRow = ({ index, notification, onEdit, onDelete }) => {
  const name = getFullName(notification._user);
  const initials = getInitials(name);

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors group ${!notification.isRead ? 'bg-blue-50/30' : ''}`}>
      <td className="p-3 pl-4 text-xs font-semibold text-slate-500 w-12 text-center">
        {index}
      </td>

      {/* Type */}
      <td className="p-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${getTypeBadge(notification.type)}`}>
          {formatTypeLabel(notification.type)}
        </span>
      </td>

      {/* Recipient */}
      <td className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 bg-slate-100 text-slate-600">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{name}</p>
            <p className="text-xs text-slate-400">
              {notification._user?.role || '—'} · {notification._user?.department || '—'}
            </p>
          </div>
        </div>
      </td>

      {/* Title / message */}
      <td className="p-3 max-w-xs">
        <p className="text-sm font-semibold text-slate-800 truncate">{notification.title}</p>
        <p className="text-xs text-slate-400 truncate">{notification.message || '—'}</p>
      </td>

      {/* Reference */}
      {/* Reference */}
      <td className="p-3 hidden lg:table-cell">
        {notification.reference_type ? (
          <span className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 font-mono">
            {notification.reference_type}
          </span>
        ) : (
          // 🔴 NEW: Red "Deleted" badge
          <span className="text-[10px] bg-red-100 border border-red-200 rounded px-1.5 py-0.5 text-red-600 font-bold uppercase tracking-wider">
            Deleted
          </span>
        )}
      </td>

      {/* Created at */}
      <td className="p-3 hidden md:table-cell">
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {formatDateTime(notification.createdAt)}
        </span>
      </td>

      {/* Status */}
      <td className="p-3">
        <ReadPill isRead={notification.isRead} />
      </td>

      {/* Actions */}
      <td className="p-3 pr-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(notification)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-[#466460] hover:bg-[#e0eceb] transition-all"
            title="Edit Notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l10.8-10.8z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(notification)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 transition-all"
            title="Archive Notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
export const NotificationsManagement = () => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const adminUid = currentUser?.id ?? currentUser?.uid ?? 'system';

  const [configData, setConfigData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all'); // all | read | unread
  const [filterDept, setFilterDept] = useState('all'); // all | department name
  const [filterDate, setFilterDate] = useState(''); // 'YYYY-MM-DD' or ''
  const [sortOrder, setSortOrder] = useState('desc');

  // Stats
  const [globalStats, setGlobalStats] = useState({ total: 0, unread: 0, read: 0 });

  const [message, setMessage] = useState(null);
  const snackbarTimer = useRef(null);
  const SNACKBAR_DURATION_MS = 6000;

  // Pagination (Server-Side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const ITEMS_PER_PAGE = 100;

  // Archive modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Edit (read status) modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotification, setEditNotification] = useState(null);
  const [editIsRead, setEditIsRead] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const normalize = (n) => ({
    ...n,
    isRead: n.is_read ?? false,
    createdAt: n.created_at ?? new Date().toISOString(),
  });

  // Global Config fetch
 // Global Config fetch
  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token'); // Retrieve your token

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/system-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Attach token here
        }
      });

      const result = await res.json();
      if (result.success) setConfigData(result.data);
    } catch (e) {
      console.error("Failed to load config:", e);
    }
  };

  // Global Stats fetch
  const fetchStats = async () => {
    try {
      const [totalRes, unreadRes, readRes] = await Promise.all([
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_archived', false).eq('is_read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_archived', false).eq('is_read', true),
      ]);
      setGlobalStats({
        total: totalRes.count || 0,
        unread: unreadRes.count || 0,
        read: readRes.count || 0,
      });
    } catch(e) {
      console.error("Failed to load stats:", e);
    }
  };

  // Server-Side Fetch
  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      // Use standard join unless filtering by dept or searching by recipient
      let selectStr = '*, _user:users(id, first_name, last_name, middle_name, email, role, department, university_id)';
      if (filterDept !== 'all') {
        selectStr = '*, _user:users!inner(id, first_name, last_name, middle_name, email, role, department, university_id)';
      }

      let query = supabase
        .from('notifications')
        .select(selectStr, { count: 'exact' })
        .eq('is_archived', false);

      if (filterType !== 'all') query = query.eq('type', filterType);
      if (filterRead === 'read') query = query.eq('is_read', true);
      if (filterRead === 'unread') query = query.eq('is_read', false);
      if (filterDept !== 'all') query = query.eq('users.department', filterDept);

      if (filterDate) {
        query = query.gte('created_at', `${filterDate}T00:00:00.000Z`).lte('created_at', `${filterDate}T23:59:59.999Z`);
      }

      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();

        // Step 1: Find matching users (capped at 100 to avoid URI overflow)
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%,university_id.ilike.%${s}%`)
          .limit(100);

        const userIds = users?.map(u => u.id) || [];

        // Step 2: Combine search conditions
        let orString = `title.ilike.%${s}%,message.ilike.%${s}%`;
        if (userIds.length > 0) {
          orString += `,user_id.in.(${userIds.join(',')})`;
        }
        query = query.or(orString);
      }

      // Apply sorting
      if (sortOrder === 'asc') {
        query = query.order('created_at', { ascending: true });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination boundaries
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      setNotifications((data || []).map(normalize));
      setTotalRecords(count || 0);

    } catch (err) {
      console.error('Fetch error:', err);
      showSnackbar('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchNotifications(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterType, filterRead, filterDept, filterDate, sortOrder, debouncedSearch]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterRead, filterDept, filterDate, sortOrder, debouncedSearch]);

  // Clean up the snackbar timer on unmount
  useEffect(() => {
    return () => {
      if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    };
  }, []);

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  // Derive filter options
  const typeOptions = ['all', ...TYPE_OPTIONS];
  const deptOptions = configData ? configData.departments.map(d => d.full) : [];

  const handleToggleRead = async (notification, newIsRead) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: newIsRead })
      .eq('id', notification.id);

    if (error) { showSnackbar('Failed to update notification', 'error'); throw error; }

    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: newIsRead } : n));

    // Refresh global stats silently
    fetchStats();

    showSnackbar(newIsRead ? 'Marked as read' : 'Marked as unread');
  };

  // Edit modal handlers
  const openEditModal = (notification) => {
    setEditNotification(notification);
    setEditIsRead(notification.isRead);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditNotification(null);
  };

  const handleEditSave = async () => {
    if (!editNotification) return;
    setSavingEdit(true);
    try {
      await handleToggleRead(editNotification, editIsRead);
      closeEditModal();
    } catch {
      // handleToggleRead already showed an error snackbar
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (notification) => {
    setNotifToDelete(notification);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notifToDelete) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notifToDelete.id);

      if (error) { showSnackbar('Failed to archive notification', 'error'); throw error; }

      // Remove it from the local screen & refresh stats
      setNotifications(prev => prev.filter(n => n.id !== notifToDelete.id));
      fetchStats();


      showSnackbar('Notification archived successfully', 'success', { label: 'View in Archives', path: '/archives' });
    } catch (err) {
      console.error('Failed to archive notification:', err);
      showSnackbar('Failed to archive notification', 'error');
    } finally {
      setShowDeleteModal(false);
      setNotifToDelete(null);
      setDeleting(false);
    }
  };

  const selectCls = "px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";
  const COL_COUNT = 8;

  const summaryStats = [
    { label: 'Total',  count: globalStats.total, color: 'text-slate-700'  },
    { label: 'Unread', count: globalStats.unread,     color: 'text-amber-700' },
    { label: 'Read',   count: globalStats.read,       color: 'text-emerald-700' },
  ];

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Summary stats */}
      <div className="shrink-0 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {summaryStats.map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm flex items-center justify-center gap-2">
            <span className={`text-lg font-bold ${s.color}`}>{s.count}</span>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table container */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">

        {/* Toolbar */}
        <div className="shrink-0 p-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">

          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative w-full sm:w-60">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search recipient, title, message…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
              />
            </div>

            <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`${selectCls} w-44`}>
              <option value="all">All types</option>
              {typeOptions.filter(t => t !== 'all').map(t => (
                <option key={t} value={t}>{formatTypeLabel(t)}</option>
              ))}
            </select>

            <select value={filterRead} onChange={e => setFilterRead(e.target.value)} className={`${selectCls} w-32`}>
              <option value="all">All statuses</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className={`${selectCls} w-40 truncate`}>
              <option value="all">All departments</option>
              {deptOptions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-40">
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                placeholder="All Dates"
                className={`${selectCls} w-full pr-8`}
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

            <button
              onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium text-slate-600 hover:border-[#466460] hover:text-[#466460] transition shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
              <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>
          </div>

          <button
            onClick={() => { fetchNotifications(currentPage); fetchStats(); }}
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
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-center p-3 pl-4 w-12 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">#</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Recipient</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Title / Message</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Reference</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Created</th>
                <th className="text-left p-3 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Status</th>
                <th className="text-left p-3 pr-4 text-xs font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5 text-[#466460]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span className="text-sm">Loading notifications…</span>
                    </div>
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-16">
                    <i className="fa-regular fa-bell-slash text-slate-200 text-4xl block mb-2"></i>
                    <p className="text-slate-400 text-sm">No notifications found</p>
                  </td>
                </tr>
              ) : notifications.map((notification, index) => (
                <NotificationRow
                  key={notification.id}
                  index={(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  notification={notification}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
            <div>
              Showing <span className="font-semibold">{totalRecords === 0 ? 0 : ((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span> notifications
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
                Page {currentPage} of {totalPages}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Edit (Change Read Status) Modal Using Portal */}
      {showEditModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]"
          onClick={closeEditModal}
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
                <h3 className="text-lg font-bold text-slate-800">Edit Notification</h3>
                <p className="text-sm text-slate-500 truncate max-w-[16rem]">
                  {editNotification?.title || ''}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditIsRead(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                    !editIsRead
                      ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-envelope mr-1"></i> Unread
                </button>
                <button
                  onClick={() => setEditIsRead(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                    editIsRead
                      ? 'bg-slate-200 text-slate-700 border-2 border-slate-400'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-envelope-open mr-1"></i> Read
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={savingEdit || !editNotification || editIsRead === editNotification?.isRead}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#466460] text-white font-semibold hover:bg-[#3a524f] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingEdit ? (
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

      {/* Archive Confirmation Modal Using Portal */}
      {showDeleteModal && createPortal(
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]"
          onClick={() => { setShowDeleteModal(false); setNotifToDelete(null); }}
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
                <h3 className="text-lg font-bold text-slate-800">Archive Notification</h3>
                <p className="text-sm text-slate-500">You can restore it later from Archives</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to archive the notification{' '}
                <span className="font-semibold">"{notifToDelete?.title}"</span> sent to{' '}
                <span className="font-semibold">{getFullName(notifToDelete?._user)}</span>?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setNotifToDelete(null); }}
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

      {/* Snackbar */}
      {message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 max-w-[92vw] px-5 py-3 rounded-xl text-sm font-semibold z-[100000] flex items-center gap-3 shadow-xl transition-all ${
          message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
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

export default NotificationsManagement;
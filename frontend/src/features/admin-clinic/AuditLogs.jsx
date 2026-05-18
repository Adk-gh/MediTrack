import React, { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, query, orderBy, limit, startAfter,
} from 'firebase/firestore';
import { db } from '../../firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Activities' },
  { value: 'auth', label: 'Authentication' },
  { value: 'record', label: 'Records' },
  { value: 'user', label: 'User Management' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'examination', label: 'Examinations' },
  { value: 'system', label: 'System' },
];

const ACTION_COLORS = {
  create:  { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'fa-plus' },
  read:    { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: 'fa-eye' },
  update:  { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: 'fa-pen' },
  delete:  { bg: 'bg-red-100',    text: 'text-red-700',    icon: 'fa-trash' },
  login:   { bg: 'bg-purple-100', text: 'text-purple-700', icon: 'fa-right-to-bracket' },
  logout:  { bg: 'bg-slate-100',  text: 'text-slate-600',  icon: 'fa-right-from-bracket' },
  approve: { bg: 'bg-teal-100',   text: 'text-teal-700',   icon: 'fa-check' },
  reject:  { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'fa-xmark' },
};

const getActionStyle = (action) =>
  ACTION_COLORS[action?.toLowerCase()] ?? { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'fa-circle' };

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp?.toDate) {
    const d = timestamp.toDate();
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
  return '—';
};

const getInitials = (name = '') => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const ActionPill = ({ action }) => {
  const s = getActionStyle(action);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${s.bg} ${s.text}`}>
      <i className={`fa-solid ${s.icon} text-[8px]`}></i>
      {action || 'action'}
    </span>
  );
};

const TypePill = ({ type }) => (
  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-600 uppercase">
    {type || 'system'}
  </span>
);

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ total: 0, today: 0, users: 0, actions: 0 });
  const snackbarTimer = useRef(null);
  const [message, setMessage] = useState(null);

  const showSnackbar = (msg, type = 'success') => {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setMessage({ text: msg, type });
    snackbarTimer.current = setTimeout(() => setMessage(null), 3000);
  };

  const fetchLogs = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setLoading(true);
        setLastDoc(null);
      } else {
        setLoading(true);
      }

      const logsRef = collection(db, 'audit_logs');
      let q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));

      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() || d.data().timestamp,
      }));

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 50);
      setLogs(fetchedLogs);

      calculateStats(fetchedLogs);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      showSnackbar('Failed to load audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastDoc || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const logsRef = collection(db, 'audit_logs');
      const q = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const fetchedLogs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() || d.data().timestamp,
      }));

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 50);
      setLogs(prev => [...prev, ...fetchedLogs]);
    } catch (err) {
      console.error('Error loading more logs:', err);
      showSnackbar('Failed to load more logs', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const calculateStats = (logData) => {
    const today = new Date().toDateString();
    const uniqueUsers = new Set(logData.map(l => l.userId || l.userEmail)).size;
    const uniqueActions = new Set(logData.map(l => l.action)).size;

    setStats({
      total: logData.length,
      today: logData.filter(l => new Date(l.timestamp).toDateString() === today).length,
      users: uniqueUsers,
      actions: uniqueActions,
    });
  };

  useEffect(() => { fetchLogs(true); }, []);

  const filteredLogs = logs.filter(log => {
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;
    if (searchInput) {
      const s = searchInput.toLowerCase();
      return (
        log.userName?.toLowerCase().includes(s) ||
        log.userEmail?.toLowerCase().includes(s) ||
        log.description?.toLowerCase().includes(s) ||
        log.action?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const filterSelectCls = "px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] font-medium text-slate-600 shadow-sm";

  return (
    <div className="bg-slate-50 h-[calc(100vh-80px)] md:h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#466460]">Audit Logs</h2>
          <button
            onClick={() => fetchLogs(true)}
            className="bg-[#466460] hover:bg-[#3a524f] text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
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
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Logs</div>
            <div className="text-xl md:text-2xl font-extrabold text-[#466460]">{stats.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Today</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600">{stats.today}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Active Users</div>
            <div className="text-xl md:text-2xl font-extrabold text-blue-600">{stats.users}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover:-translate-y-0.5 hover:shadow-md transition">
            <div className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Action Types</div>
            <div className="text-xl md:text-2xl font-extrabold text-purple-600">{stats.actions}</div>
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
              className={`${filterSelectCls} w-full sm:w-44`}
            >
              {ACTIVITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search user, action, description..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm outline-none focus:border-[#466460] focus:ring-2 focus:ring-[#e0eceb] shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-xl border border-slate-200">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Timestamp</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">User</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Action</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap">Type</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden md:table-cell">Description</th>
                <th className="bg-slate-50 text-left p-3 text-[10px] md:text-[11px] font-bold uppercase text-slate-500 tracking-wide whitespace-nowrap hidden lg:table-cell">Details</th>
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
                      Loading audit logs…
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <i className="fa-solid fa-clipboard-list text-3xl text-slate-300"></i>
                        <p>No audit logs found</p>
                        <p className="text-xs text-slate-400">System activities will appear here once recorded</p>
                      </div>
                    ) : (
                      <p>No logs match your filters</p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3 whitespace-nowrap">
                      <div className="text-xs text-slate-600 font-medium">{formatDate(log.timestamp)}</div>
                    </td>

                    {/* User */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#e0eceb] flex items-center justify-center font-bold text-[#466460] text-xs shrink-0">
                          {getInitials(log.userName || log.userEmail)}
                        </div>
                        <div>
                          <div className="text-sm text-slate-700 font-medium whitespace-nowrap">{log.userName || '—'}</div>
                          <div className="text-xs text-slate-400">{log.userEmail || log.userId || '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3 whitespace-nowrap">
                      <ActionPill action={log.action} />
                    </td>

                    {/* Type */}
                    <td className="p-3 whitespace-nowrap">
                      <TypePill type={log.type} />
                    </td>

                    {/* Description */}
                    <td className="p-3 text-sm text-slate-600 hidden md:table-cell max-w-[200px]">
                      <span className="truncate block">{log.description || '—'}</span>
                    </td>

                    {/* Details */}
                    <td className="p-3 text-xs text-slate-500 hidden lg:table-cell max-w-[150px]">
                      <span className="truncate block">{log.details || '—'}</span>
                    </td>
                  </tr>
                ))
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

export default AuditLogs;
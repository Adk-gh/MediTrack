// C:\Users\HP\MediTrack\frontend\src\components\Notifications.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import notificationsService, { createTestNotification } from '../services/notifications.service.js';
import { sendNotification } from '../utils/notifier';

// Icon components
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const AppointmentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ConsultationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const AnnouncementIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M4 12h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
    <path d="M9 12V8a3 3 0 0 1 6 0v4" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const getNotificationIcon = (type) => {
  switch (type) {
    case 'appointment_request':
    case 'appointment_status':
      return AppointmentIcon;
    case 'record_added':
    case 'record_updated':
      return DocumentIcon;
    case 'announcement':
      return AnnouncementIcon;
    case 'approval':
      return CheckIcon;
    case 'consultation':
    case 'consultation_response':
    case 'consultation_ended':
      return ConsultationIcon;
    default:
      return BellIcon;
  }
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
};

// Shared normalizer (module-level so both the panel and the modal can use it)
const normalizeNotification = (n) => ({
  ...n,
  isRead: n.is_read ?? n.isRead ?? false,
  userId: n.user_id ?? n.userId,
  referenceId: n.reference_id ?? n.referenceId,
  referenceType: n.reference_type ?? n.referenceType,
  createdAt: n.created_at ?? n.createdAt ?? new Date().toISOString(),
});

// ─── Notification Bell Button (for header) ───────────────────────────────────────
export function NotificationBell({ onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
      aria-label="Notifications"
    >
      <div className="w-5 h-5 text-white">
        <BellIcon />
      </div>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-md">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

// ─── Single notification row (shared by panel + modal) ───────────────────────────
function NotificationRow({ notification, onMarkAsRead, onDelete, readOnly, dense }) {
  const IconComponent = getNotificationIcon(notification.type);
  return (
    <div
      className={`px-4 ${dense ? 'py-3' : 'py-4'} hover:bg-slate-50 transition-colors ${!readOnly ? 'cursor-pointer' : ''} ${
        !notification.isRead ? 'bg-blue-50/50' : ''
      }`}
      onClick={() => !readOnly && !notification.isRead && onMarkAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          !notification.isRead ? 'bg-[#466460] text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <div className="w-5 h-5">
            <IconComponent />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold truncate ${
              !notification.isRead ? 'text-slate-800' : 'text-slate-600'
            }`}>
              {typeof notification.title === 'object' ? JSON.stringify(notification.title) : notification.title}
            </p>
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <div className="w-4 h-4">
                  <XIcon />
                </div>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
            {typeof notification.message === 'object' ? JSON.stringify(notification.message) : notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[10px] text-slate-400">
              {formatTimeAgo(notification.createdAt)}
            </p>
            {readOnly && notification.userName && (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-[10px] text-slate-400 truncate">{notification.userName}</p>
              </>
            )}
          </div>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-[#466460] rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

// ─── "View All Notifications" Modal ───────────────────────────────────────────────
const MODAL_PAGE_SIZE = 30;

function AllNotificationsModal({ isOpen, onClose, isSysAdmin, userId, onNotificationsChanged }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (offset) => {
    if (isSysAdmin) {
      const { data, error } = await supabase
        .from('notifications')
        // Corrected syntax: referencing the 'users' table directly
        .select('*, users ( name, full_name, email )')
        .order('created_at', { ascending: false })
        .range(offset, offset + MODAL_PAGE_SIZE - 1);

      if (error) {
        console.error('Supabase query error:', error.message);
        throw error;
      }

      return (data || []).map((n) => ({
        ...normalizeNotification(n),
        // n.users will automatically resolve to the joined object
        userName: n.users?.full_name || n.users?.name || n.users?.email || null,
      }));
    }
    const notifs = await notificationsService.getNotifications(offset + MODAL_PAGE_SIZE);
    return (notifs || []).slice(offset).map(normalizeNotification);
  }, [isSysAdmin]);

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const page = await loadPage(0);
      setNotifications(page);
      setHasMore(page.length >= MODAL_PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching all notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    if (isOpen) fetchFirstPage();
  }, [isOpen, fetchFirstPage]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPage(notifications.length);
      setNotifications((prev) => [...prev, ...page]);
      setHasMore(page.length >= MODAL_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      onNotificationsChanged?.();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      onNotificationsChanged?.();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full h-full sm:h-auto sm:max-h-[85vh] sm:w-[520px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#466460] to-[#38524d] px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-white">
              <BellIcon />
            </div>
            <h3 className="text-white font-bold text-base">
              {isSysAdmin ? 'All System Notifications' : 'All Notifications'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <div className="w-4 h-4 text-white">
              <XIcon />
            </div>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-[#466460] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <div className="w-12 h-12 mb-3 opacity-30">
                <BellIcon />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  readOnly={isSysAdmin}
                  dense={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && hasMore && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-2 text-center text-sm font-semibold text-[#466460] hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#466460] border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Notifications'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Notification Dropdown Panel ────────────────────────────────────────────────
const PAGE_SIZE = 20;

export function NotificationPanel({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSysAdmin, setIsSysAdmin] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const userIdRef = useRef(null);

  // Get user ID + role from profile - use auth UID for notifications
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userIdRef.current = user?.uid || null;
      setIsSysAdmin(user?.role === 'sysadmin');
    } catch {}
  }, []);

  // Fetch notifications when panel opens - always get fresh data
  useEffect(() => {
    if (isOpen) {
      // Clear cache to ensure fresh fetch
      sessionStorage.removeItem('meditrack_notifications');
      sessionStorage.removeItem('meditrack_notif_count');
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSysAdmin]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!isOpen) return;
    if (!isSysAdmin && !userIdRef.current) return;

    const filter = isSysAdmin ? undefined : `user_id=eq.${userIdRef.current}`;
    let channel = supabase.channel(isSysAdmin ? 'admin-notifications-realtime' : 'notifications-realtime');

    channel = channel
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', ...(filter ? { filter } : {}) },
        (payload) => {
          setNotifications(prev => [normalizeNotification(payload.new), ...prev].slice(0, PAGE_SIZE));
          setUnreadCount(prev => prev + 1);
          sessionStorage.removeItem('meditrack_notifications');
          sessionStorage.removeItem('meditrack_notif_count');
          if (!isSysAdmin) {
            sendNotification({
              userId: payload.new.user_id,
              type: 'new_message',
              title: payload.new.title,
              message: payload.new.message,
            });
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', ...(filter ? { filter } : {}) },
        (payload) => {
          setNotifications(prev => prev.map(n =>
            n.id === payload.new.id ? { ...n, isRead: payload.new.is_read } : n
          ));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', ...(filter ? { filter } : {}) },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, isSysAdmin]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (isSysAdmin) {
        // Sysadmin sees every notification in the system, not just their own
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);
        if (error) throw error;

        const { count: unread } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false);

        setNotifications((data || []).map(normalizeNotification));
        setUnreadCount(unread || 0);
      } else {
        const [notifs, count] = await Promise.all([
          notificationsService.getNotifications(PAGE_SIZE),
          notificationsService.getUnreadCount(),
        ]);
        const normalized = (notifs || []).map(normalizeNotification);
        setNotifications(normalized);
        setUnreadCount(count || 0);
        setHasMore(normalized.length >= PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Inline "Load More" — only used by non-sysadmin roles (doctor, dentist, nurse).
  // Sysadmin uses the "View All Notifications" modal instead.
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || isSysAdmin) return;
    setLoadingMore(true);
    try {
      const nextLimit = notifications.length + PAGE_SIZE;
      const notifs = await notificationsService.getNotifications(nextLimit);
      const normalized = (notifs || []).map(normalizeNotification);
      setNotifications(normalized);
      setHasMore(normalized.length >= nextLimit);
    } catch (error) {
      console.error('Error loading more notifications:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await notificationsService.deleteNotification(notificationId);
      const wasUnread = notifications.find(n => n.id === notificationId && !n.isRead);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1999]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 sm:top-2 sm:right-2 z-[2000] w-full sm:w-[380px] h-full sm:h-[calc(100vh-16px)] sm:max-h-[600px] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideIn">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#466460] to-[#38524d] px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-white">
              <BellIcon />
            </div>
            <h3 className="text-white font-bold text-base">
              {isSysAdmin ? 'All Notifications' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isSysAdmin && (
              <button
                onClick={async () => {
                  await createTestNotification();
                  fetchNotifications();
                }}
                className="text-yellow-300 hover:text-yellow-100 text-xs font-medium px-2 py-1 transition-colors"
                title="Create test notification"
              >
              </button>
            )}
            {!isSysAdmin && unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-white/70 hover:text-white text-xs font-medium px-2 py-1 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <div className="w-4 h-4 text-white">
                <XIcon />
              </div>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-[#466460] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <div className="w-12 h-12 mb-3 opacity-30">
                <BellIcon />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs opacity-60">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  readOnly={isSysAdmin}
                  dense
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - View All (opens modal) */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0">
            <button
              onClick={() => setShowAllModal(true)}
              className="w-full py-2 text-center text-sm font-semibold text-[#466460] hover:bg-slate-100 rounded-lg transition-colors"
            >
              View All Notifications
            </button>
          </div>
        )}
      </div>

      <AllNotificationsModal
        isOpen={showAllModal}
        onClose={() => setShowAllModal(false)}
        isSysAdmin={isSysAdmin}
        userId={userIdRef.current}
        onNotificationsChanged={fetchNotifications}
      />

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.2s ease-out; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

// ─── Notification Badge (for mobile) ─────────────────────────────────────────────
export function NotificationBadge({ count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 -my-1"
      aria-label="Notifications"
    >
      <div className="w-5 h-5 text-[#466460]">
        <BellIcon />
      </div>
      {count > 0 && (
        <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold min-w-[14px] h-[14px] rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

export default { NotificationBell, NotificationPanel, NotificationBadge };
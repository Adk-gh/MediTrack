// C:\Users\HP\MediTrack\frontend\src\components\admin\storageManager.jsx
import React, { useState, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// ─── Icons ────────────────────────────────────────────────────────────────────
const FolderGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

const FileGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

// ─── Format Helpers ────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

// ─── Local UI Helpers (matches DoctorSettings.jsx) ────────────────────────────
const Snackbar = ({ message, type, onClose }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? '#ef4444' : '#10b981', color: '#fff',
      padding: '14px 24px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', zIndex: 9999,
      fontFamily: 'helvetica, sans-serif', fontSize: 14, fontWeight: 600,
    }}>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px', fontSize: 20, lineHeight: 1 }}
      >
        &times;
      </button>
    </div>
  );
};

const SectionCard = ({ children }) => (
  <div style={{
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #e2ebe8',
    overflow: 'hidden',
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11, fontWeight: 800, color: '#466460',
    textTransform: 'uppercase', letterSpacing: 1,
    margin: '0 0 8px 4px',
  }}>
    {children}
  </p>
);

const selectStyle = {
  background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#1a2e22',
  cursor: 'pointer', outline: 'none',
};

const pillButtonStyle = (bg, color, disabled) => ({
  background: bg, color, border: 'none',
  padding: '8px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
});

export default function StorageManager({ isMobile }) {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [pathParts, setPathParts] = useState([]);
  const [items, setItems] = useState([]);
  const [loadingBuckets, setLoadingBuckets] = useState(true);
  const [bucketsError, setBucketsError] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 3500);
  };

  const currentPrefix = pathParts.join('/');
  const containerStyle = { padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 };

  useEffect(() => {
    fetchBuckets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedBucket) fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, currentPrefix]);

  const fetchBuckets = async (retries = 3) => {
    setLoadingBuckets(true);
    setBucketsError(null);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${API_URL}/storage/buckets`, { cache: 'no-store' });

        if (!res.ok) {
          throw new Error(`Server responded ${res.status}`);
        }

        const data = await res.json();

        if (data.buckets?.length === 0 && attempt < retries) {
          throw new Error('Received empty buckets array, assuming cold start glitch');
        }

        setBuckets(data.buckets || []);
        if (data.buckets?.length) setSelectedBucket(data.buckets[0].name);

        setLoadingBuckets(false);
        return;
      } catch (error) {
        console.warn(`Bucket fetch attempt ${attempt} failed:`, error.message);

        if (attempt === retries) {
          console.error('Failed to fetch buckets after retries:', error);
          setBucketsError(error.message || 'Failed to reach backend');
          showToast('Failed to load storage buckets. Make sure your backend is running.', 'error');
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    setLoadingBuckets(false);
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setSelected(new Set());
    try {
      const query = currentPrefix ? `?prefix=${encodeURIComponent(currentPrefix)}` : '';
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/list${query}`, {
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      setItemsError(error.message || 'Failed to reach backend');
      showToast('Failed to load folder contents.', 'error');
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleBucketChange = (name) => {
    setSelectedBucket(name);
    setPathParts([]);
  };

  const openFolder = (name) => setPathParts(prev => [...prev, name]);

  const goToBreadcrumb = (index) => setPathParts(prev => prev.slice(0, index + 1));

  const toggleSelect = (path) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => (prev.size === items.length ? new Set() : new Set(items.map(i => i.path))));
  };

  const deleteFile = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/objects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [item.path] })
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Deleted "${item.name}"`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Delete file error:', error);
      showToast('Failed to delete file.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteFolder = async (item) => {
    if (!window.confirm(`Delete folder "${item.name}" and everything inside it? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/folder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: item.path })
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Deleted folder "${item.name}"`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Delete folder error:', error);
      showToast('Failed to delete folder.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    const selectedItems = items.filter(i => selected.has(i.path));
    const folderCount = selectedItems.filter(i => i.type === 'folder').length;
    const fileCount = selectedItems.length - folderCount;
    const label = [
      fileCount ? `${fileCount} file${fileCount > 1 ? 's' : ''}` : null,
      folderCount ? `${folderCount} folder${folderCount > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' and ');

    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const filePaths = selectedItems.filter(i => i.type === 'file').map(i => i.path);
      const folderItems = selectedItems.filter(i => i.type === 'folder');

      if (filePaths.length) {
        const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/objects`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: filePaths })
        });
        if (!res.ok) throw new Error('Delete failed');
      }

      for (const folder of folderItems) {
        const res = await fetch(`${API_URL}/storage/buckets/${encodeURIComponent(selectedBucket)}/folder`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefix: folder.path })
        });
        if (!res.ok) throw new Error('Delete failed');
      }

      showToast(`Deleted ${label}`, 'success');
      fetchItems();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Some items failed to delete.', 'error');
      fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  if (loadingBuckets) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>
        <p style={{ fontSize: 13, color: '#7a9e8e' }}>Loading storage buckets...</p>
      </div>
    );
  }

  if (bucketsError) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>
        <SectionCard>
          <div style={{ padding: '24px 18px' }}>
            <p style={{ fontSize: 13, color: '#ef4444', margin: 0, fontWeight: 600 }}>
              Couldn't reach the backend to load storage buckets.
            </p>
            <p style={{ marginTop: 8, fontSize: 12, color: '#7a9e8e' }}>
              {bucketsError} — make sure `/api/storage/buckets` is mounted and the server is running.
            </p>
            <button onClick={fetchBuckets} style={{ ...pillButtonStyle('#466460', '#fff', false), marginTop: 12 }}>
              Retry
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!buckets.length) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>
        <SectionCard>
          <div style={{ padding: '24px 18px' }}>
            <p style={{ fontSize: 13, color: '#7a9e8e', margin: 0 }}>This project has no storage buckets yet.</p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      {toast.show && (
        <Snackbar
          message={toast.text}
          type={toast.type}
          onClose={() => setToast({ show: false, text: '', type: 'success' })}
        />
      )}

      {/* Header row: label left, bucket picker right — mirrors DoctorSettings pattern */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <SectionLabel>Storage Manager</SectionLabel>
          <p style={{ fontSize: 12, color: '#7a9e8e', margin: '0 0 0 4px' }}>
            Browse and clean up files stored in your Supabase buckets.
          </p>
        </div>
        <select
          value={selectedBucket}
          onChange={e => handleBucketChange(e.target.value)}
          style={selectStyle}
        >
          {buckets.map(b => (
            <option key={b.id || b.name} value={b.name}>{b.name}{b.public ? ' (public)' : ''}</option>
          ))}
        </select>
      </div>

      <SectionCard>
        {/* Breadcrumb */}
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4,
          padding: '14px 18px', borderBottom: '1px solid #eef3f1', fontSize: 13,
        }}>
          <button
            onClick={() => goToBreadcrumb(-1)}
            style={{ background: 'none', border: 'none', color: pathParts.length ? '#466460' : '#1a2e22', fontWeight: 700, cursor: 'pointer', padding: '2px 4px' }}
          >
            {selectedBucket}
          </button>
          {pathParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <span style={{ color: '#b0c8be' }}>/</span>
              <button
                onClick={() => goToBreadcrumb(idx)}
                style={{ background: 'none', border: 'none', color: idx === pathParts.length - 1 ? '#1a2e22' : '#466460', fontWeight: 700, cursor: 'pointer', padding: '2px 4px' }}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: '1px solid #eef3f1',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#7a9e8e', cursor: items.length ? 'pointer' : 'default' }}>
            <input
              type="checkbox"
              checked={items.length > 0 && selected.size === items.length}
              onChange={toggleSelectAll}
              disabled={!items.length}
            />
            Select all
          </label>
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              style={pillButtonStyle('#ef4444', '#fff', deleting)}
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
            </button>
          )}
        </div>

        {/* List */}
        {loadingItems ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#7a9e8e', fontSize: 13 }}>Loading...</div>
        ) : itemsError ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444', fontSize: 13 }}>
            Couldn't load this folder.
            <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{itemsError}</div>
            <button onClick={fetchItems} style={{ ...pillButtonStyle('#466460', '#fff', false), marginTop: 10 }}>
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>This folder is empty.</div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid #eef3f1',
                background: selected.has(item.path) ? '#f4f8f6' : '#fff'
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(item.path)}
                onChange={() => toggleSelect(item.path)}
              />
              <div style={{ width: 20, height: 20, color: item.type === 'folder' ? '#466460' : '#94a3b8', flexShrink: 0 }}>
                {item.type === 'folder' ? <FolderGlyph /> : <FileGlyph />}
              </div>
              <div
                style={{ flex: 1, minWidth: 0, cursor: item.type === 'folder' ? 'pointer' : 'default' }}
                onClick={() => item.type === 'folder' && openFolder(item.name)}
              >
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 600, color: '#1a2e22',
                  textDecoration: item.type === 'folder' ? 'underline' : 'none',
                  textDecorationColor: '#d5e5df',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {item.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#7a9e8e' }}>
                  {item.type === 'folder' ? 'Folder' : formatBytes(item.size)}
                  {item.updated_at ? ` · ${formatDate(item.updated_at)}` : ''}
                </p>
              </div>
              <button
                onClick={() => (item.type === 'folder' ? deleteFolder(item) : deleteFile(item))}
                disabled={deleting}
                style={{
                  background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca',
                  padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1, flexShrink: 0,
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </SectionCard>
    </div>
  );
}
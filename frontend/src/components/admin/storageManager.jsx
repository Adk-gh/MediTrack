// C:\Users\HP\MediTrack\frontend\src\components\admin\storageManager.jsx

import React, { useState, useEffect } from 'react';
import { getAuthHeaders } from '../../services/token.service';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/$/, '');

// ─── Icons ────────────────────────────────────────────────────────────────────

const FolderGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-full h-full"
  >
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
  </svg>
);

const FileGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-full h-full"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const ImageGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-full h-full"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const CloseGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DownloadGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

const ExternalGlyph = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 3h7v7" />
    <path d="M10 14L21 3" />
    <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
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
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

// ─── File Type Helpers ────────────────────────────────────────────────────────

const getExtension = (filename = '') => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const isImageFile = (filename = '') => {
  const ext = getExtension(filename);

  return [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'bmp',
    'svg',
    'ico',
    'avif',
  ].includes(ext);
};

const isPdfFile = (filename = '') => {
  return getExtension(filename) === 'pdf';
};

const isTextFile = (filename = '') => {
  const ext = getExtension(filename);

  return [
    'txt',
    'csv',
    'json',
    'xml',
    'html',
    'css',
    'js',
    'jsx',
  ].includes(ext);
};

const isDocumentFile = (filename = '') => {
  const ext = getExtension(filename);

  return [
    'pdf',
    'txt',
    'csv',
    'json',
    'xml',
    'html',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
  ].includes(ext);
};

// ─── Local UI Helpers ─────────────────────────────────────────────────────────

const Snackbar = ({ message, type, onClose }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#ef4444' : '#10b981',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontFamily: 'helvetica, sans-serif',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <span>{message}</span>

      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '0 4px',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
};

const SectionCard = ({ children }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 20,
      border: '1px solid #e2ebe8',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 800,
      color: '#466460',
      textTransform: 'uppercase',
      letterSpacing: 1,
      margin: '0 0 8px 4px',
    }}
  >
    {children}
  </p>
);

const selectStyle = {
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: '#1a2e22',
  cursor: 'pointer',
  outline: 'none',
};

const pillButtonStyle = (bg, color, disabled) => ({
  background: bg,
  color,
  border: 'none',
  padding: '8px 20px',
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});

// ─── File Viewer Modal ────────────────────────────────────────────────────────

const FileViewerModal = ({
  file,
  url,
  loading,
  error,
  onClose,
}) => {
  if (!file) return null;

  const image = isImageFile(file.name);
  const pdf = isPdfFile(file.name);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 96vw)',
          height: 'min(850px, 92vh)',
          background: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid #e2ebe8',
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: '#1a2e22',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={file.name}
            >
              {file.name}
            </p>

            <p
              style={{
                margin: '3px 0 0',
                fontSize: 11,
                color: '#7a9e8e',
              }}
            >
              {formatBytes(file.size)}
              {file.updated_at
                ? ` · ${formatDate(file.updated_at)}`
                : ''}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexShrink: 0,
            }}
          >
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f1f5f3',
                  color: '#466460',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 14, height: 14 }}>
                  <ExternalGlyph />
                </span>
                Open
              </a>
            )}

            {url && (
              <a
                href={url}
                download={file.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#466460',
                  color: '#fff',
                  textDecoration: 'none',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <span style={{ width: 14, height: 14 }}>
                  <DownloadGlyph />
                </span>
                Download
              </a>
            )}

            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                border: 'none',
                borderRadius: 8,
                background: '#fef2f2',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close"
            >
              <span style={{ width: 18, height: 18 }}>
                <CloseGlyph />
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}

        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: '#f8faf9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: image ? 20 : 0,
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                color: '#7a9e8e',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  border: '3px solid #dce8e3',
                  borderTopColor: '#466460',
                  borderRadius: '50%',
                  animation: 'storageViewerSpin 0.8s linear infinite',
                  margin: '0 auto 12px',
                }}
              />

              Generating secure file URL...
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: 'center',
                padding: 30,
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: '#ef4444',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Unable to view this file.
              </p>

              <p
                style={{
                  margin: '8px 0 0',
                  color: '#94a3b8',
                  fontSize: 12,
                }}
              >
                {error}
              </p>
            </div>
          ) : !url ? (
            <div
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 13,
              }}
            >
              No file URL available.
            </div>
          ) : image ? (
            <img
              src={url}
              alt={file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 10px 35px rgba(0,0,0,0.15)',
              }}
            />
          ) : pdf ? (
            <iframe
              src={url}
              title={file.name}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#fff',
              }}
            />
          ) : isTextFile(file.name) ? (
            <iframe
              src={url}
              title={file.name}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#fff',
              }}
            />
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: 30,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  margin: '0 auto 16px',
                  color: '#94a3b8',
                }}
              >
                <FileGlyph />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#1a2e22',
                }}
              >
                Preview not available
              </p>

              <p
                style={{
                  margin: '8px 0 18px',
                  fontSize: 12,
                  color: '#7a9e8e',
                }}
              >
                This file type cannot be previewed in the browser.
              </p>

              {url && (
                <a
                  href={url}
                  download={file.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    background: '#466460',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '10px 18px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span style={{ width: 15, height: 15 }}>
                    <DownloadGlyph />
                  </span>
                  Download File
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes storageViewerSpin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const [toast, setToast] = useState({
    show: false,
    text: '',
    type: 'success',
  });

  // ─── Viewer State ──────────────────────────────────────────────────────────

  const [viewerFile, setViewerFile] = useState(null);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);

  const showToast = (text, type = 'success') => {
    setToast({
      show: true,
      text,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        text: '',
        type: 'success',
      });
    }, 3500);
  };

  const currentPrefix = pathParts.join('/');

  const containerStyle = {
    padding: isMobile ? '16px 12px' : '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  };

  // ─── Load Buckets ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBuckets();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load Files ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedBucket) {
      fetchItems();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBucket, currentPrefix]);

  // ─── Close Viewer With Escape ──────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && viewerFile) {
        closeViewer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewerFile]);

  // ─── Fetch Buckets ─────────────────────────────────────────────────────────

  const fetchBuckets = async (retries = 3) => {
    setLoadingBuckets(true);
    setBucketsError(null);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const headers = await getAuthHeaders();

        const res = await fetch(`${API_URL}/storage/buckets`, {
          headers,
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Server responded ${res.status}`);
        }

        const data = await res.json();

        if (data.buckets?.length === 0 && attempt < retries) {
          throw new Error(
            'Received empty buckets array, assuming cold start glitch'
          );
        }

        setBuckets(data.buckets || []);

        if (data.buckets?.length) {
          setSelectedBucket(data.buckets[0].name);
        }

        setLoadingBuckets(false);
        return;
      } catch (error) {
        console.warn(
          `Bucket fetch attempt ${attempt} failed:`,
          error.message
        );

        if (attempt === retries) {
          console.error(
            'Failed to fetch buckets after retries:',
            error
          );

          setBucketsError(
            error.message || 'Failed to reach backend'
          );

          showToast(
            'Failed to load storage buckets. Make sure your backend is running.',
            'error'
          );
        } else {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * attempt)
          );
        }
      }
    }

    setLoadingBuckets(false);
  };

  // ─── Fetch Items ───────────────────────────────────────────────────────────

  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setSelected(new Set());

    try {
      const headers = await getAuthHeaders();

      const query = currentPrefix
        ? `?prefix=${encodeURIComponent(currentPrefix)}`
        : '';

      const res = await fetch(
        `${API_URL}/storage/buckets/${encodeURIComponent(
          selectedBucket
        )}/list${query}`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }

      const data = await res.json();

      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch items:', error);

      setItemsError(
        error.message || 'Failed to reach backend'
      );

      showToast(
        'Failed to load folder contents.',
        'error'
      );

      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // ─── Open File Viewer ──────────────────────────────────────────────────────

  const openFileViewer = async (item) => {
    if (!item || item.type === 'folder') return;

    setViewerFile(item);
    setViewerUrl('');
    setViewerError(null);
    setViewerLoading(true);

    try {
      const headers = await getAuthHeaders();

      const query = `?path=${encodeURIComponent(item.path)}`;

      const res = await fetch(
        `${API_URL}/storage/buckets/${encodeURIComponent(
          selectedBucket
        )}/file-url${query}`,
        {
          headers,
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        let message = `Server responded ${res.status}`;

        try {
          const data = await res.json();

          if (data.error) {
            message = data.error;
          }
        } catch {
          // Ignore JSON parse error.
        }

        throw new Error(message);
      }

      const data = await res.json();

      if (!data.url) {
        throw new Error('Backend did not return a file URL.');
      }

      setViewerUrl(data.url);
    } catch (error) {
      console.error('Failed to generate file URL:', error);

      setViewerError(
        error.message || 'Failed to generate secure file URL.'
      );
    } finally {
      setViewerLoading(false);
    }
  };

  // ─── Close Viewer ──────────────────────────────────────────────────────────

  const closeViewer = () => {
    setViewerFile(null);
    setViewerUrl('');
    setViewerError(null);
    setViewerLoading(false);
  };

  // ─── Bucket Change ─────────────────────────────────────────────────────────

  const handleBucketChange = (name) => {
    closeViewer();
    setSelectedBucket(name);
    setPathParts([]);
  };

  // ─── Folder Navigation ────────────────────────────────────────────────────

  const openFolder = (name) => {
    setPathParts((prev) => [...prev, name]);
  };

  const goToBreadcrumb = (index) => {
    if (index === -1) {
      setPathParts([]);
      return;
    }

    setPathParts((prev) => prev.slice(0, index + 1));
  };

  // ─── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (path) => {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === items.length
        ? new Set()
        : new Set(items.map((i) => i.path))
    );
  };

  // ─── Delete File ───────────────────────────────────────────────────────────

  const deleteFile = async (item) => {
    if (
      !window.confirm(
        `Delete "${item.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `${API_URL}/storage/buckets/${encodeURIComponent(
          selectedBucket
        )}/objects`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            paths: [item.path],
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      showToast(`Deleted "${item.name}"`, 'success');

      fetchItems();
    } catch (error) {
      console.error('Delete file error:', error);

      showToast(
        'Failed to delete file.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ─── Delete Folder ─────────────────────────────────────────────────────────

  const deleteFolder = async (item) => {
    if (
      !window.confirm(
        `Delete folder "${item.name}" and everything inside it? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const headers = await getAuthHeaders();

      const res = await fetch(
        `${API_URL}/storage/buckets/${encodeURIComponent(
          selectedBucket
        )}/folder`,
        {
          method: 'DELETE',
          headers,
          body: JSON.stringify({
            prefix: item.path,
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Delete failed');
      }

      showToast(
        `Deleted folder "${item.name}"`,
        'success'
      );

      fetchItems();
    } catch (error) {
      console.error('Delete folder error:', error);

      showToast(
        'Failed to delete folder.',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  // ─── Bulk Delete ───────────────────────────────────────────────────────────

  const deleteSelected = async () => {
    if (selected.size === 0) return;

    const selectedItems = items.filter((i) =>
      selected.has(i.path)
    );

    const folderCount = selectedItems.filter(
      (i) => i.type === 'folder'
    ).length;

    const fileCount =
      selectedItems.length - folderCount;

    const label = [
      fileCount
        ? `${fileCount} file${
            fileCount > 1 ? 's' : ''
          }`
        : null,

      folderCount
        ? `${folderCount} folder${
            folderCount > 1 ? 's' : ''
          }`
        : null,
    ]
      .filter(Boolean)
      .join(' and ');

    if (
      !window.confirm(
        `Delete ${label}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const headers = await getAuthHeaders();

      const filePaths = selectedItems
        .filter((i) => i.type === 'file')
        .map((i) => i.path);

      const folderItems = selectedItems.filter(
        (i) => i.type === 'folder'
      );

      if (filePaths.length) {
        const res = await fetch(
          `${API_URL}/storage/buckets/${encodeURIComponent(
            selectedBucket
          )}/objects`,
          {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
              paths: filePaths,
            }),
          }
        );

        if (!res.ok) {
          throw new Error('Delete failed');
        }
      }

      for (const folder of folderItems) {
        const res = await fetch(
          `${API_URL}/storage/buckets/${encodeURIComponent(
            selectedBucket
          )}/folder`,
          {
            method: 'DELETE',
            headers,
            body: JSON.stringify({
              prefix: folder.path,
            }),
          }
        );

        if (!res.ok) {
          throw new Error('Delete failed');
        }
      }

      showToast(
        `Deleted ${label}`,
        'success'
      );

      fetchItems();
    } catch (error) {
      console.error('Bulk delete error:', error);

      showToast(
        'Some items failed to delete.',
        'error'
      );

      fetchItems();
    } finally {
      setDeleting(false);
    }
  };

  // ─── Loading Buckets ───────────────────────────────────────────────────────

  if (loadingBuckets) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>

        <p
          style={{
            fontSize: 13,
            color: '#7a9e8e',
          }}
        >
          Loading storage buckets...
        </p>
      </div>
    );
  }

  // ─── Bucket Error ──────────────────────────────────────────────────────────

  if (bucketsError) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>

        <SectionCard>
          <div style={{ padding: '24px 18px' }}>
            <p
              style={{
                fontSize: 13,
                color: '#ef4444',
                margin: 0,
                fontWeight: 600,
              }}
            >
              Couldn't reach the backend to load storage
              buckets.
            </p>

            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#7a9e8e',
              }}
            >
              {bucketsError} — make sure
              `/api/storage/buckets` is mounted and the
              server is running.
            </p>

            <button
              onClick={fetchBuckets}
              style={{
                ...pillButtonStyle(
                  '#466460',
                  '#fff',
                  false
                ),
                marginTop: 12,
              }}
            >
              Retry
            </button>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ─── No Buckets ────────────────────────────────────────────────────────────

  if (!buckets.length) {
    return (
      <div style={containerStyle}>
        <SectionLabel>Storage Manager</SectionLabel>

        <SectionCard>
          <div style={{ padding: '24px 18px' }}>
            <p
              style={{
                fontSize: 13,
                color: '#7a9e8e',
                margin: 0,
              }}
            >
              This project has no storage buckets yet.
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        style={{
          ...containerStyle,
          position: 'relative',
        }}
      >
        {toast.show && (
          <Snackbar
            message={toast.text}
            type={toast.type}
            onClose={() =>
              setToast({
                show: false,
                text: '',
                type: 'success',
              })
            }
          />
        )}

        {/* Header */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <SectionLabel>
              Storage Manager
            </SectionLabel>

            <p
              style={{
                fontSize: 12,
                color: '#7a9e8e',
                margin: '0 0 0 4px',
              }}
            >
              Browse and clean up files stored in your
              Supabase buckets.
            </p>
          </div>

          <select
            value={selectedBucket}
            onChange={(e) =>
              handleBucketChange(e.target.value)
            }
            style={selectStyle}
          >
            {buckets.map((b) => (
              <option
                key={b.id || b.name}
                value={b.name}
              >
                {b.name}
                {b.public ? ' (public)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Storage Card */}

        <SectionCard>
          {/* Breadcrumb */}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
              padding: '14px 18px',
              borderBottom: '1px solid #eef3f1',
              fontSize: 13,
            }}
          >
            <button
              onClick={() => goToBreadcrumb(-1)}
              style={{
                background: 'none',
                border: 'none',
                color: pathParts.length
                  ? '#466460'
                  : '#1a2e22',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              {selectedBucket}
            </button>

            {pathParts.map((part, idx) => (
              <React.Fragment key={idx}>
                <span
                  style={{
                    color: '#b0c8be',
                  }}
                >
                  /
                </span>

                <button
                  onClick={() =>
                    goToBreadcrumb(idx)
                  }
                  style={{
                    background: 'none',
                    border: 'none',
                    color:
                      idx === pathParts.length - 1
                        ? '#1a2e22'
                        : '#466460',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  {part}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Toolbar */}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderBottom: '1px solid #eef3f1',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#7a9e8e',
                cursor: items.length
                  ? 'pointer'
                  : 'default',
              }}
            >
              <input
                type="checkbox"
                checked={
                  items.length > 0 &&
                  selected.size === items.length
                }
                onChange={toggleSelectAll}
                disabled={!items.length}
              />

              Select all
            </label>

            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                style={pillButtonStyle(
                  '#ef4444',
                  '#fff',
                  deleting
                )}
              >
                {deleting
                  ? 'Deleting...'
                  : `Delete Selected (${selected.size})`}
              </button>
            )}
          </div>

          {/* File List */}

          {loadingItems ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#7a9e8e',
                fontSize: 13,
              }}
            >
              Loading...
            </div>
          ) : itemsError ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#ef4444',
                fontSize: 13,
              }}
            >
              Couldn't load this folder.

              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: '#94a3b8',
                }}
              >
                {itemsError}
              </div>

              <button
                onClick={fetchItems}
                style={{
                  ...pillButtonStyle(
                    '#466460',
                    '#fff',
                    false
                  ),
                  marginTop: 10,
                }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 13,
              }}
            >
              This folder is empty.
            </div>
          ) : (
            items.map((item, idx) => {
              const image = isImageFile(item.name);

              return (
                <div
                  key={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderBottom:
                      idx === items.length - 1
                        ? 'none'
                        : '1px solid #eef3f1',
                    background: selected.has(
                      item.path
                    )
                      ? '#f4f8f6'
                      : '#fff',
                  }}
                >
                  {/* Checkbox */}

                  <input
                    type="checkbox"
                    checked={selected.has(
                      item.path
                    )}
                    onChange={() =>
                      toggleSelect(item.path)
                    }
                  />

                  {/* Icon */}

                  <div
                    style={{
                      width: 20,
                      height: 20,
                      color:
                        item.type === 'folder'
                          ? '#466460'
                          : image
                          ? '#466460'
                          : '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    {item.type === 'folder' ? (
                      <FolderGlyph />
                    ) : image ? (
                      <ImageGlyph />
                    ) : (
                      <FileGlyph />
                    )}
                  </div>

                  {/* Name */}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      cursor:
                        item.type === 'folder'
                          ? 'pointer'
                          : 'pointer',
                    }}
                    onClick={() => {
                      if (item.type === 'folder') {
                        openFolder(item.name);
                      } else {
                        openFileViewer(item);
                      }
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1a2e22',
                        textDecoration:
                          'underline',
                        textDecorationColor:
                          '#d5e5df',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </p>

                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 12,
                        color: '#7a9e8e',
                      }}
                    >
                      {item.type === 'folder'
                        ? 'Folder'
                        : formatBytes(item.size)}

                      {item.updated_at
                        ? ` · ${formatDate(
                            item.updated_at
                          )}`
                        : ''}
                    </p>
                  </div>

                  {/* View Button */}

                  {item.type === 'file' && (
                    <button
                      onClick={() =>
                        openFileViewer(item)
                      }
                      disabled={viewerLoading}
                      style={{
                        background: '#f1f5f3',
                        color: '#466460',
                        border: '1px solid #dce8e3',
                        padding: '7px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      View
                    </button>
                  )}

                  {/* Delete */}

                  <button
                    onClick={() =>
                      item.type === 'folder'
                        ? deleteFolder(item)
                        : deleteFile(item)
                    }
                    disabled={deleting}
                    style={{
                      background: '#fef2f2',
                      color: '#ef4444',
                      border:
                        '1px solid #fecaca',
                      padding: '7px 16px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: deleting
                        ? 'not-allowed'
                        : 'pointer',
                      opacity: deleting ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })
          )}
        </SectionCard>
      </div>

      {/* File Viewer */}

      <FileViewerModal
        file={viewerFile}
        url={viewerUrl}
        loading={viewerLoading}
        error={viewerError}
        onClose={closeViewer}
      />
    </>
  );
}
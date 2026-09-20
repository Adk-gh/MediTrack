// C:\Users\HP\MediTrack\frontend\src\pages\admin\UniversityIdImport.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import universityIdService from '../../services/universityId.service';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_PATTERN = /\.(xlsx|xls)$/i;

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const validateFiles = (incomingFiles) => {
  const valid = [];
  const rejected = [];

  incomingFiles.forEach((file) => {
    if (!ALLOWED_FILE_PATTERN.test(file.name)) {
      rejected.push(`${file.name}: only XLSX or XLS files are allowed.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      rejected.push(`${file.name}: file size must not exceed 10 MB.`);
      return;
    }

    valid.push(file);
  });

  return { valid, rejected };
};

// ─── Local UI Helpers ────────────────────────────────────────────────────────

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

const Row = ({ label, sub, right, last }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid #eef3f1',
      gap: 12,
    }}
  >
    <div style={{ flex: 1, paddingRight: 12, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && (
        <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0', lineHeight: 1.4 }}>{sub}</p>
      )}
    </div>
    {right}
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

const CountBadge = ({ children, tone = 'default' }) => {
  const palette = {
    default: { bg: '#f4f8f6', border: '#e2ebe8', color: '#466460' },
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
    warning: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  }[tone];

  return (
    <div
      style={{
        minWidth: 42,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 10px',
        borderRadius: 10,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  );
};

const pillButtonStyle = (bg, color, disabled, border = 'none') => ({
  background: bg,
  color,
  border,
  padding: '0 20px',
  height: 38,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
});

// ─── Reusable Confirmation Modal ─────────────────────────────────────────────

const ActionConfirmModal = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'save',
  loading = false,
  loadingText = 'Please wait...',
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onCancel?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const palette = {
    save: { accent: '#466460', soft: '#e8f5ee', Icon: CheckCircle2 },
    delete: { accent: '#e5262d', soft: '#fee2e2', Icon: Trash2 },
    warning: { accent: '#d97706', soft: '#fef3c7', Icon: AlertTriangle },
  };

  const colors = palette[tone] || palette.save;
  const { Icon } = colors;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(15, 23, 42, 0.54)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 384,
          background: '#fff',
          borderRadius: 18,
          padding: '24px 24px 22px',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.28)',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            margin: '0 auto 17px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.soft,
            color: colors.accent,
          }}
        >
          <Icon size={26} strokeWidth={2.2} />
        </div>

        <h3
          id="import-confirm-title"
          style={{ margin: 0, color: '#1e293b', fontSize: 18, fontWeight: 800 }}
        >
          {title}
        </h3>

        <p style={{ margin: '12px 0 22px', color: '#718096', fontSize: 13, lineHeight: 1.6 }}>
          {message}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              height: 45,
              border: 'none',
              borderRadius: 12,
              background: '#f1f5f9',
              color: '#526277',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              height: 45,
              border: 'none',
              borderRadius: 12,
              background: colors.accent,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── ID List ─────────────────────────────────────────────────────────────────

const IdList = ({ ids = [], tone, emptyText }) => {
  const palette =
    tone === 'warning'
      ? { border: '#fde68a', chipBg: '#fffbeb', chipColor: '#92400e' }
      : { border: '#a7f3d0', chipBg: '#ecfdf5', chipColor: '#047857' };

  if (!ids.length) {
    return (
      <p
        style={{
          margin: 0,
          padding: '18px 14px',
          fontSize: 12,
          color: '#7a9e8e',
          background: '#f8fafc',
          border: '1px solid #e2ebe8',
          borderRadius: 12,
        }}
      >
        {emptyText}
      </p>
    );
  }

  return (
    <div
      style={{
        maxHeight: 168,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: 12,
        background: '#fff',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {ids.map((id) => (
        <span
          key={id}
          style={{
            background: palette.chipBg,
            color: palette.chipColor,
            border: `1px solid ${palette.border}`,
            padding: '4px 12px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {id}
        </span>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UniversityIdImport({ isMobile }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [pendingAction, setPendingAction] = useState(null);

  const totalSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const addFiles = (incoming) => {
    const { valid, rejected } = validateFiles(Array.from(incoming || []));

    setFiles((current) => {
      const merged = [...current];
      const existingKeys = new Set(current.map(fileKey));

      valid.forEach((file) => {
        const key = fileKey(file);
        if (!existingKeys.has(key) && merged.length < MAX_FILES) {
          merged.push(file);
          existingKeys.add(key);
        }
      });

      if (current.length + valid.length > MAX_FILES) {
        rejected.push(`Only ${MAX_FILES} files can be uploaded at one time.`);
      }

      return merged;
    });

    setResult(null);
    setError(rejected.length ? rejected.join(' ') : '');

    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (targetKey) => {
    setFiles((current) => current.filter((file) => fileKey(file) !== targetKey));
    setError('');
    setResult(null);
  };

  const clearFiles = () => {
    setFiles([]);
    setError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const requestImport = () => {
    if (!files.length || isImporting) return;

    setPendingAction({
      type: 'import',
      title: 'Import University IDs?',
      message: `${files.length} file${files.length === 1 ? '' : 's'} will be processed. New IDs are saved and duplicates are skipped.`,
      confirmText: 'Import',
      loadingText: 'Importing...',
      tone: 'save',
    });
  };

  const requestClearFiles = () => {
    if (isImporting) return;

    setPendingAction({
      type: 'clear',
      title: 'Remove All Files?',
      message: 'The selected files will be cleared from the upload list. Nothing has been imported yet.',
      confirmText: 'Remove All',
      tone: 'delete',
    });
  };

  const performImport = async () => {
    setIsImporting(true);
    setError('');
    setResult(null);

    try {
      const response = await universityIdService.importUniversityIds(files);
      setResult(response.data);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      showToast(response.message || 'University IDs imported successfully.');
    } catch (err) {
      console.error('[UniversityIdImport] Failed to import university IDs:', err);
      setError(err.message || 'Failed to import university IDs.');
      showToast(err.message || 'Failed to import university IDs.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const confirmPendingAction = async () => {
    const action = pendingAction;
    if (!action) return;

    if (action.type === 'clear') {
      setPendingAction(null);
      clearFiles();
      return;
    }

    if (action.type === 'import') {
      setPendingAction(null);
      await performImport();
    }
  };

  const containerStyle = {
    padding: isMobile ? '16px 12px' : '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    position: 'relative',
  };

  return (
    <div style={containerStyle}>
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            zIndex: 99999,
            fontSize: 13,
            fontWeight: 600,
            maxWidth: 'calc(100vw - 40px)',
            textAlign: 'center',
          }}
        >
          {toast.message}
        </div>
      )}

      <ActionConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title || 'Confirm Action'}
        message={pendingAction?.message || ''}
        confirmText={pendingAction?.confirmText || 'Confirm'}
        loadingText={pendingAction?.loadingText || 'Please wait...'}
        tone={pendingAction?.tone || 'save'}
        loading={isImporting}
        onCancel={() => {
          if (!isImporting) setPendingAction(null);
        }}
        onConfirm={confirmPendingAction}
      />

      {/* ── Upload ── */}
      <SectionLabel>University ID Import</SectionLabel>

      <SectionCard>
        <Row
          label="Upload Excel files"
          sub="Authorized student and employee IDs. Only people on this list can create a MediTrack account."
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CountBadge>{`${files.length}/${MAX_FILES}`}</CountBadge>
            </div>
          }
        />

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              minHeight: isMobile ? 160 : 190,
              padding: '28px 20px',
              borderRadius: 16,
              border: `1.5px dashed ${dragging ? '#466460' : '#cbd8d3'}`,
              background: dragging ? '#eef6f4' : '#f8fafc',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#e8f5ee',
                color: '#466460',
              }}
            >
              <UploadCloud size={24} strokeWidth={2} />
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2e22' }}>
              Drop Excel files here or click to browse
            </span>
            <span style={{ fontSize: 12, color: '#7a9e8e' }}>
              .xlsx or .xls · up to {MAX_FILES} files · 10 MB each
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            style={{ display: 'none' }}
            onChange={(event) => addFiles(event.target.files)}
          />

          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f4f8f6',
              border: '1px solid #e2ebe8',
            }}
          >
            <Info size={15} strokeWidth={2.2} color="#466460" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#526e64', lineHeight: 1.55 }}>
              Put the University IDs in column A. The header can have any name or be omitted. Only
              IDs matching{' '}
              <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#1a2e22' }}>
                XX-XXXXX
              </strong>{' '}
              or{' '}
              <strong style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#1a2e22' }}>
                XXXX-XXXX
              </strong>{' '}
              are imported.
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {files.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#466460' }}>
                  Selected files · {formatBytes(totalSize)}
                </p>
                <button
                  type="button"
                  onClick={requestClearFiles}
                  disabled={isImporting}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: '#ef4444',
                    cursor: isImporting ? 'not-allowed' : 'pointer',
                    opacity: isImporting ? 0.6 : 1,
                  }}
                >
                  Remove all
                </button>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {files.map((file) => (
                  <div
                    key={fileKey(file)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: '1px solid #e2ebe8',
                      background: '#fff',
                    }}
                  >
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f4f8f6',
                        color: '#466460',
                        flexShrink: 0,
                      }}
                    >
                      <FileSpreadsheet size={17} strokeWidth={2} />
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#1a2e22',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#7a9e8e' }}>
                        {formatBytes(file.size)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(fileKey(file))}
                      disabled={isImporting}
                      aria-label={`Remove ${file.name}`}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        border: 'none',
                        background: '#f4f8f6',
                        color: '#7a9e8e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        opacity: isImporting ? 0.6 : 1,
                      }}
                    >
                      <X size={15} strokeWidth={2.4} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column-reverse' : 'row',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 14,
              borderTop: '1px solid #eef3f1',
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isImporting || files.length >= MAX_FILES}
              style={pillButtonStyle(
                '#f4f8f6',
                '#466460',
                isImporting || files.length >= MAX_FILES,
                '1px solid #e2ebe8'
              )}
            >
              Add more files
            </button>
            <button
              type="button"
              onClick={requestImport}
              disabled={!files.length || isImporting}
              style={pillButtonStyle('#466460', '#fff', !files.length || isImporting)}
            >
              {isImporting
                ? 'Importing...'
                : `Import ${files.length || ''} file${files.length === 1 ? '' : 's'}`.replace(
                    /\s+/g,
                    ' '
                  )}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── Result ── */}
      {result && (
        <>
          <SectionLabel>Last Import</SectionLabel>

          <SectionCard>
            <Row
              label="Files processed"
              sub="Excel files read in this batch."
              right={<CountBadge>{result.filesProcessed ?? 0}</CountBadge>}
            />
            <Row
              label="Unique IDs found"
              sub="Valid IDs detected across all uploaded files."
              right={<CountBadge>{result.totalProcessed ?? 0}</CountBadge>}
            />
            <Row
              label="IDs inserted"
              sub="New IDs saved and now authorized to register."
              right={<CountBadge tone="success">{result.inserted ?? 0}</CountBadge>}
            />
            <Row
              label="Duplicates skipped"
              sub="IDs already present in the authorized list."
              last={!((result.duplicates ?? 0) > 0 || (result.insertedIds?.length ?? 0) > 0)}
              right={<CountBadge tone="warning">{result.duplicates ?? 0}</CountBadge>}
            />

            {((result.insertedIds?.length ?? 0) > 0 || (result.duplicates ?? 0) > 0) && (
              <div
                style={{
                  padding: '16px 18px',
                  display: 'grid',
                  gap: 18,
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#047857',
                    }}
                  >
                    Inserted ({result.insertedIds?.length ?? 0})
                  </p>
                  <IdList
                    ids={result.insertedIds || []}
                    tone="success"
                    emptyText="No new IDs were inserted from this batch."
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: '0 0 8px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#b45309',
                    }}
                  >
                    Duplicates skipped ({result.duplicateIds?.length ?? 0})
                  </p>
                  <IdList
                    ids={result.duplicateIds || []}
                    tone="warning"
                    emptyText="No duplicates were found in this batch."
                  />
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
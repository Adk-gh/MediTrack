// C:\Users\HP\MediTrack\frontend\src\components\student\supportSettings.jsx

import React, { useState, useEffect, useRef } from 'react';
import HelpCenter from './HelpCenter';

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

// ─────────────────────────────────────────────────────────────────────────────
// Local UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

const Row = ({ label, sub, right, last, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid #eef3f1',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#f9fafa';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
  >
    <div style={{ flex: 1, paddingRight: 12 }}>
      <p
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#1a2e22',
          margin: 0,
        }}
      >
        {label}
      </p>

      {sub && (
        <p
          style={{
            fontSize: 12,
            color: '#7a9e8e',
            margin: '3px 0 0',
          }}
        >
          {sub}
        </p>
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


// ─── Reusable Confirmation Modal ──────────────────────────────────────────────
const ActionConfirmModal = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-confirm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onCancel?.();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000,
        background: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 376,
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #dce7e3',
          padding: '26px 28px 24px',
          boxShadow: '0 16px 38px rgba(15, 23, 42, 0.22)',
          boxSizing: 'border-box',
        }}
      >
        <h3
          id="support-confirm-title"
          style={{
            margin: 0,
            color: '#10251f',
            fontSize: 16,
            lineHeight: 1.35,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: '10px 0 20px',
            color: '#6f998b',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              minWidth: 72,
              height: 34,
              padding: '0 16px',
              borderRadius: 11,
              border: '1px solid #d7e2de',
              background: '#f8fbfa',
              color: '#355b52',
              fontSize: 12,
              fontWeight: 600,
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
              minWidth: 80,
              height: 34,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: '#466f65',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmableRemoveButton = ({
  label = 'Remove',
  itemLabel = 'this item',
  onConfirm,
  style,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={style}>
        {label}
      </button>

      <ActionConfirmModal
        open={open}
        title="Delete Item?"
        message={`Are you sure you want to delete ${itemLabel}? This change will be applied when you save.`}
        confirmText="Delete"
        tone="delete"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm?.();
        }}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentSupportSettings({ isMobile }) {
  const [showFAQ, setShowFAQ] = useState(false);

  const [activeModal, setActiveModal] = useState(null);
  // 'contact' | 'feedback' | null

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  const [pendingAction, setPendingAction] = useState(null);

  const fileInputRef = useRef(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch user profile on mount to autofill email
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) return;

        const response = await fetch(`${API_URL}/user/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (
          response.ok &&
          result.success &&
          result.data?.email
        ) {
          setEmail(result.data.email);
        }
      } catch (err) {
        console.error(
          '[Support] Failed to fetch user email:',
          err
        );
      }
    };

    fetchUserProfile();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Toast
  // ───────────────────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'success') => {
    setToast({
      show: true,
      message: msg,
      type,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: '',
        type: 'success',
      });
    }, 3000);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Help Center
  // ───────────────────────────────────────────────────────────────────────────

  const handleHelpCenter = () => {
    setShowFAQ(true);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Image Upload
  // ───────────────────────────────────────────────────────────────────────────

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Allowed image types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast(
        'Only JPG, PNG, WEBP, and GIF images are allowed.',
        'error'
      );

      e.target.value = '';
      return;
    }

    // 5 MB limit
    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      showToast(
        'Image is too large. Maximum file size is 5 MB.',
        'error'
      );

      e.target.value = '';
      return;
    }

    // Save file
    setAttachment(file);

    // Create preview
    const previewUrl = URL.createObjectURL(file);

    setAttachmentPreview(previewUrl);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Remove Attachment
  // ───────────────────────────────────────────────────────────────────────────

  const clearAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
    }

    setAttachment(null);
    setAttachmentPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Format file size
  // ───────────────────────────────────────────────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';

    if (bytes < 1024) {
      return `${bytes} Bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const requestRemoveAttachment = () => {
    if (!attachment) return;

setPendingAction({
  type: 'remove-attachment',
  title: 'Remove Attachment?',
  message: `Are you sure you want to remove "${attachment.name}" from this message?`,
  confirmText: 'Remove',
});
  };

  const requestSubmit = () => {
    if (!message.trim() || !email.trim() || isSubmitting) return;

setPendingAction({
  type: 'submit',
  title:
    activeModal === 'contact'
      ? 'Send Support Message?'
      : 'Submit Feedback?',
  message:
    activeModal === 'contact'
      ? 'Your message and any selected attachment will be sent to the MediTrack support team.'
      : 'Your feedback and any selected attachment will be submitted to the MediTrack team.',
  confirmText:
    activeModal === 'contact'
      ? 'Send Message'
      : 'Submit Feedback',
});
  };

  const confirmPendingAction = async () => {
    const action = pendingAction;
    if (!action) return;

    setPendingAction(null);

    if (action.type === 'remove-attachment') {
      clearAttachment();
      return;
    }

    if (action.type === 'submit') {
      await performSubmit();
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Submit Support / Feedback
  // ───────────────────────────────────────────────────────────────────────────

  const performSubmit = async () => {

    if (!message.trim() || !email.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      // FormData is required for file uploads
      const formData = new FormData();

      formData.append('type', activeModal);
      formData.append('email', email.trim());
      formData.append('message', message.trim());

      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await fetch(
        `${API_URL}/support/send-email`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Failed to send message.'
        );
      }

      showToast(
        activeModal === 'contact'
          ? 'Message sent to support!'
          : 'Thank you for your feedback!'
      );

      // Close modal
      setActiveModal(null);

      // Clear message
      setMessage('');

      // Clear attachment
      clearAttachment();
    } catch (err) {
      console.error('[Support] Error:', err);

      showToast(
        err.message || 'Failed to send message.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Close Modal
  // ───────────────────────────────────────────────────────────────────────────

  const handleCloseModal = () => {
    if (isSubmitting) return;

    setActiveModal(null);
    setMessage('');
    clearAttachment();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // If FAQ is open, render Help Center
  // ───────────────────────────────────────────────────────────────────────────

  if (showFAQ) {
    return (
      <HelpCenter
        isMobile={isMobile}
        onBack={() => setShowFAQ(false)}
      />
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Main UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: isMobile ? '16px 12px' : '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ─────────────────────────────────────────────────────────────────────
          Toast Notification
      ───────────────────────────────────────────────────────────────────── */}

      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            background:
              toast.type === 'error'
                ? '#ef4444'
                : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow:
              '0 10px 25px rgba(0,0,0,0.18)',
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

      {/* ─────────────────────────────────────────────────────────────────────
          Support Modal
      ───────────────────────────────────────────────────────────────────── */}

      {activeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              padding: '24px 28px',
              width: '100%',
              maxWidth: 450,
              boxShadow:
                '0 10px 25px rgba(0,0,0,0.18)',
              border: '1px solid #e2ebe8',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}

            <div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#1a2e22',
                  margin: '0 0 6px',
                }}
              >
                {activeModal === 'contact'
                  ? 'Contact Clinic Support'
                  : 'Send Feedback'}
              </p>

              <p
                style={{
                  fontSize: 13,
                  color: '#7a9e8e',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {activeModal === 'contact'
                  ? 'Describe your issue below and the clinic staff will get back to you.'
                  : 'Let us know how we can improve your MediTrack experience.'}
              </p>
            </div>

            {/* ───────────────────────────────────────────────────────────────
                Email Form
            ─────────────────────────────────────────────────────────────── */}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #e2ebe8',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* To */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderBottom: '1px solid #e2ebe8',
                  background: '#f9fafa',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#7a9e8e',
                    width: 45,
                  }}
                >
                  To:
                </span>

                <span
                  style={{
                    fontSize: 13,
                    color: '#1a2e22',
                    fontWeight: 500,
                  }}
                >
                  Clinic Support
                </span>
              </div>

              {/* From */}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderBottom: '1px solid #e2ebe8',
                  background: '#fff',
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#7a9e8e',
                    width: 45,
                  }}
                >
                  From:
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="your.email@example.com"
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: '#1a2e22',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Message */}

              <textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                placeholder="Type your message here..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '14px',
                  border: 'none',
                  background: '#fff',
                  fontSize: 13,
                  color: '#1a2e22',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* ───────────────────────────────────────────────────────────────
                Image Attachment
            ─────────────────────────────────────────────────────────────── */}

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#466460',
                  }}
                >
                  Attachment
                </span>

                <span
                  style={{
                    fontSize: 11,
                    color: '#9ab3a8',
                  }}
                >
                  Optional · Max 5 MB
                </span>
              </div>

              {!attachment ? (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    minHeight: 78,
                    border: '1px dashed #b8cec5',
                    borderRadius: 12,
                    background: '#f9fbfa',
                    color: '#466460',
                    cursor: isSubmitting
                      ? 'not-allowed'
                      : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    opacity: isSubmitting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      lineHeight: 1,
                    }}
                  >
                    📷
                  </span>

                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Attach an image
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      color: '#8aa69b',
                    }}
                  >
                    JPG, PNG, WEBP, or GIF
                  </span>
                </button>
              ) : (
                <div
                  style={{
                    border: '1px solid #dce9e4',
                    borderRadius: 12,
                    padding: 10,
                    background: '#f9fbfa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Image Preview */}

                  {attachmentPreview && (
                    <img
                      src={attachmentPreview}
                      alt="Attachment preview"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border:
                          '1px solid #dce9e4',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  {/* File Information */}

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1a2e22',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {attachment.name}
                    </p>

                    <p
                      style={{
                        margin: '3px 0 0',
                        fontSize: 11,
                        color: '#8aa69b',
                      }}
                    >
                      {formatFileSize(
                        attachment.size
                      )}
                    </p>
                  </div>

                  {/* Remove */}

                  <button
                    type="button"
                    onClick={requestRemoveAttachment}
                    disabled={isSubmitting}
                    title="Remove attachment"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border:
                        '1px solid #e2ebe8',
                      background: '#fff',
                      color: '#ef4444',
                      cursor: isSubmitting
                        ? 'not-allowed'
                        : 'pointer',
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Hidden File Input */}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAttachmentChange}
                style={{ display: 'none' }}
              />
            </div>

            {/* ───────────────────────────────────────────────────────────────
                Buttons
            ─────────────────────────────────────────────────────────────── */}

            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 4,
              }}
            >
              {/* Cancel */}

              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                style={{
                  background: '#f4f8f6',
                  color: '#466460',
                  border: '1px solid #e2ebe8',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isSubmitting
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                Cancel
              </button>

              {/* Send */}

              <button
                type="button"
                onClick={requestSubmit}
                disabled={
                  isSubmitting ||
                  !message.trim() ||
                  !email.trim()
                }
                style={{
                  background: '#466460',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    isSubmitting ||
                    !message.trim() ||
                    !email.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    isSubmitting ||
                    !message.trim() ||
                    !email.trim()
                      ? 0.6
                      : 1,
                }}
              >
                {isSubmitting
                  ? 'Sending...'
                  : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ActionConfirmModal
        open={Boolean(pendingAction)}
        title={pendingAction?.title || 'Confirm Action'}
        message={pendingAction?.message || ''}
        confirmText={pendingAction?.confirmText || 'Confirm'}
        tone={pendingAction?.tone || 'save'}
        loading={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />

      {/* ─────────────────────────────────────────────────────────────────────
          Main UI
      ───────────────────────────────────────────────────────────────────── */}

      <SectionLabel>Get Help</SectionLabel>

      <SectionCard>
        <Row
          label="Help Center"
          sub="Browse FAQs and guides"
          onClick={handleHelpCenter}
          right={
            <span
              style={{
                color: '#b0c8be',
                fontSize: 18,
              }}
            >
              ›
            </span>
          }
        />

        <Row
          label="Contact Support"
          sub="Reach out to the clinic team"
          onClick={() =>
            setActiveModal('contact')
          }
          right={
            <span
              style={{
                color: '#b0c8be',
                fontSize: 18,
              }}
            >
              ›
            </span>
          }
        />

        <Row
          label="Send Feedback"
          sub="Help us improve MediTrack"
          onClick={() =>
            setActiveModal('feedback')
          }
          last
          right={
            <span
              style={{
                color: '#b0c8be',
                fontSize: 18,
              }}
            >
              ›
            </span>
          }
        />
      </SectionCard>
    </div>
  );
}
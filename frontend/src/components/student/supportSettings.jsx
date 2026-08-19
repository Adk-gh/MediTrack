// C:\Users\HP\MediTrack\frontend\src\components\student\supportSettings.jsx
import React, { useState, useEffect } from 'react';
import HelpCenter from './HelpCenter'; // Import the new FAQ component

const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/$/, '');

// ─── Local UI Helpers ────────────────────────────────────────────────────────
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

const Row = ({ label, sub, right, last, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px',
      borderBottom: last ? 'none' : '1px solid #eef3f1',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafa'}
    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <div style={{ flex: 1, paddingRight: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2e22', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: 12, color: '#7a9e8e', margin: '3px 0 0' }}>{sub}</p>}
    </div>
    {right}
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

export default function StudentSupportSettings({ isMobile }) {
  const [showFAQ, setShowFAQ] = useState(false); // State to toggle FAQ view
  const [activeModal, setActiveModal] = useState(null); // 'contact' | 'feedback' | null
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch user profile on mount to autofill email
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/user/profile`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (response.ok && result.success && result.data?.email) {
          setEmail(result.data.email);
        }
      } catch (err) {
        console.error('[Support] Failed to fetch user email:', err);
      }
    };

    fetchUserProfile();
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleHelpCenter = () => {
    // Switch the view to the FAQ component instead of opening a new tab
    setShowFAQ(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/support/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: activeModal,
          email: email,
          message: message,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send message.');
      }

      showToast(activeModal === 'contact' ? 'Message sent to support!' : 'Thank you for your feedback!');
      setActiveModal(null);
      setMessage('');
    } catch (err) {
      console.error('[Support] Error:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If showFAQ is true, render ONLY the HelpCenter component
  if (showFAQ) {
    return <HelpCenter isMobile={isMobile} onBack={() => setShowFAQ(false)} />;
  }

  // Otherwise, render the standard support menu
  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff',
          padding: '12px 20px', borderRadius: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
          zIndex: 99999, fontSize: 13, fontWeight: 600, maxWidth: 'calc(100vw - 40px)', textAlign: 'center',
        }}>
          {toast.message}
        </div>
      )}

      {/* Support Modals */}
      {activeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '24px 28px',
            width: '100%', maxWidth: 450, boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            border: '1px solid #e2ebe8', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a2e22', margin: '0 0 6px' }}>
                {activeModal === 'contact' ? 'Contact Clinic Support' : 'Send Feedback'}
              </p>
              <p style={{ fontSize: 13, color: '#7a9e8e', margin: 0, lineHeight: 1.5 }}>
                {activeModal === 'contact'
                  ? 'Describe your issue below and the clinic staff will get back to you.'
                  : 'Let us know how we can improve your MediTrack experience.'}
              </p>
            </div>

            {/* Email Form Wrapper */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              border: '1px solid #e2ebe8', borderRadius: 12, overflow: 'hidden'
            }}>

              {/* "To" Field (Read-only) */}
              <div style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px',
                borderBottom: '1px solid #e2ebe8', background: '#f9fafa'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7a9e8e', width: 45 }}>To:</span>
                <span style={{ fontSize: 13, color: '#1a2e22', fontWeight: 500 }}>Clinic Support</span>
              </div>

              {/* "From" Field */}
              <div style={{
                display: 'flex', alignItems: 'center', padding: '10px 14px',
                borderBottom: '1px solid #e2ebe8', background: '#fff'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7a9e8e', width: 45 }}>From:</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    fontSize: 13, color: '#1a2e22', outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Message Field */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={5}
                style={{
                  width: '100%', padding: '14px', border: 'none',
                  background: '#fff', fontSize: 13, color: '#1a2e22', resize: 'none',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setActiveModal(null); setMessage(''); }}
                disabled={isSubmitting}
                style={{
                  background: '#f4f8f6', color: '#466460', border: '1px solid #e2ebe8',
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim() || !email.trim()}
                style={{
                  background: '#466460', color: '#fff', border: 'none',
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: (isSubmitting || !message.trim() || !email.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || !message.trim() || !email.trim()) ? 0.6 : 1,
                }}
              >
                {isSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main UI */}
      <SectionLabel>Get Help</SectionLabel>
      <SectionCard>
        <Row
          label="Help Center"
          sub="Browse FAQs and guides"
          onClick={handleHelpCenter}
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
        <Row
          label="Contact Support"
          sub="Reach out to the clinic team"
          onClick={() => setActiveModal('contact')}
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
        <Row
          label="Send Feedback"
          sub="Help us improve MediTrack"
          onClick={() => setActiveModal('feedback')}
          last
          right={<span style={{ color: '#b0c8be', fontSize: 18 }}>›</span>}
        />
      </SectionCard>
    </div>
  );
}
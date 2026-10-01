import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const [userEmail, setUserEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const hasAttempted = useRef(false);

  useEffect(() => {
    if (hasAttempted.current) return;

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (email) setUserEmail(email);

    if (!token || !email) {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new verification email.');
      return;
    }

    hasAttempted.current = true;
    navigate('/verify-email', { replace: true });

    const verifyEmail = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. Please try again.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResend = async () => {
    if (!userEmail) {
      setResendMessage('Please enter an email address.');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setResendMessage('A new verification email has been sent!');
      } else {
        setResendMessage(data.message || 'Failed to resend email. Please try again later.');
      }
    } catch (err) {
      setResendMessage('Network error while resending. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes v-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes m-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .lf-desktop-wrapper { display: block; height: 100vh; height: 100dvh; overflow-y: auto; }
        .lf-mobile-wrapper  { display: none; }
        @media (max-width: 640px) { .lf-desktop-wrapper { display: none !important; } .lf-mobile-wrapper  { display: flex !important; } }

        .v-container { animation: v-fadeUp 0.5s ease-out forwards; }
        .v-icon { width: 80px; height: 80px; margin: 0 auto 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .v-icon.success { background: #d1fae5; }
        .v-icon.error { background: #fee2e2; }
        .v-icon svg { width: 40px; height: 40px; }
        .v-icon.success svg { color: #059669; }
        .v-icon.error svg { color: #dc2626; }

        .v-btn { display: inline-block; padding: 14px 24px; background: #466460; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 12px; width: 100%; box-sizing: border-box; transition: all 0.2s; border: none; cursor: pointer; font-size: 16px; }
        .v-btn:hover:not(:disabled) { background: #3d5550; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(70,100,96,0.25); }
        .v-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .v-btn-secondary { background: transparent; color: #466460; border: 2px solid #466460; }
        .v-btn-secondary:hover:not(:disabled) { background: #f3f4f6; }

        .email-input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; box-sizing: border-box; margin-bottom: 8px; font-size: 14px; }
        .email-label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px; text-align: left; }

        @media (max-width: 640px) {
          .lf-mobile-wrapper { width: 100%; min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: #F2F4F3; box-sizing: border-box; z-index: 10; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); overflow-y: auto; }
          .m-topbar { display: flex; align-items: center; justify-content: center; padding: 20px 24px 0; flex-shrink: 0; animation: m-fadeIn 0.4s ease both; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-hero { padding: 36px 28px 24px; flex-shrink: 0; animation: m-fadeUp 0.5s ease 0.1s both; }
          .m-eyebrow { font-size: 12px; font-weight: 600; color: #4A8C82; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
          .m-title { font-size: 30px; font-weight: 800; color: #1A2E2B; line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 8px; }
          .m-card { background: #fff; border-radius: 28px 28px 0 0; padding: 48px 24px 56px; flex: 1; box-shadow: 0 -2px 24px rgba(42,72,68,0.08); animation: m-fadeUp 0.5s ease 0.2s both; display: flex; flex-direction: column; align-items: center; text-align: center; }
          .m-status-icon { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
          .m-status-icon.loading { background: #f3f4f6; } .m-status-icon.success { background: #d1fae5; color: #059669; } .m-status-icon.error { background: #fee2e2; color: #dc2626; }
          .m-status-icon svg { width: 36px; height: 36px; }
          .m-status-title { font-size: 22px; font-weight: 800; color: #1A2E2B; margin-bottom: 12px; }
          .m-status-text { font-size: 15px; color: #6B8580; line-height: 1.5; margin-bottom: 24px; }
          .m-btn-primary { width: 100%; padding: 17px; border-radius: 18px; border: none; background: #2D5C52; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; text-decoration: none; display: block; box-sizing: border-box; margin-bottom: 12px;}
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.7; }
          .m-btn-secondary { background: transparent; color: #2D5C52; border: 2px solid #2D5C52; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout>
          <div className="v-container" style={{ width: '100%', maxWidth: '480px', margin: '0 auto', padding: '48px 40px', textAlign: 'center' }}>
            {status === 'loading' && (
              <>
                <div className="v-icon" style={{ background: '#f3f4f6' }}>
                  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Verifying Email...</h2>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="v-icon success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#059669' }}>Email Verified!</h2>
                <p style={{ color: '#6b7280', marginBottom: 20 }}>{message}</p>
                <Link to="/login" className="v-btn">Go to Login</Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="v-icon error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>Verification Failed</h2>
                <p style={{ color: '#6b7280', marginBottom: 20 }}>{message}</p>

                {!userEmail && (
                  <div style={{ marginBottom: '16px' }}>
                    <label className="email-label">Enter email to resend link</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="email-input"
                    />
                  </div>
                )}

                <button onClick={handleResend} disabled={isResending || !userEmail} className="v-btn v-btn-secondary">
                  {isResending ? 'Sending...' : 'Resend Verification Email'}
                </button>

                {resendMessage && (
                  <p style={{ marginTop: 12, fontSize: 14, color: resendMessage.includes('sent') ? '#059669' : '#dc2626', fontWeight: 500 }}>
                    {resendMessage}
                  </p>
                )}

                <Link to="/login" className="v-btn">Go to Login</Link>
              </>
            )}
          </div>
        </AuthLayout>
      </div>

      {/* ══════════════════════ MOBILE ══════════════════════ */}
      <div className="lf-mobile-wrapper">
        <div className="m-topbar">
          <span className="m-logo-name">MediTrack</span>
        </div>

        <div className="m-hero">
          <p className="m-eyebrow">Account Setup</p>
          <h1 className="m-title">Email<br />Verification</h1>
        </div>

        <div className="m-card" style={{ width: '100%', maxWidth: '100%' }}>
          {status === 'loading' && (
            <>
              <div className="m-status-icon loading">
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="m-status-title">Verifying...</h2>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="m-status-icon success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="m-status-title success">Verified!</h2>
              <p className="m-status-text">{message}</p>
              <Link to="/login" className="m-btn-primary" style={{ width: '100%' }}>Go to Login</Link>
            </>
          )}

          {status === 'error' && (
            <div style={{ width: '100%' }}>
              <div className="m-status-icon error" style={{ margin: '0 auto 24px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="m-status-title error">Verification Failed</h2>
              <p className="m-status-text">{message}</p>

              {!userEmail && (
                <div style={{ marginBottom: '20px', width: '100%' }}>
                  <label className="email-label">Enter email to resend link</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="email-input"
                  />
                </div>
              )}

              <button onClick={handleResend} disabled={isResending || !userEmail} className="m-btn-primary m-btn-secondary">
                {isResending ? 'Sending...' : 'Resend Verification'}
              </button>

              {resendMessage && (
                <p style={{ marginBottom: 16, fontSize: 14, color: resendMessage.includes('sent') ? '#059669' : '#dc2626', fontWeight: 600 }}>
                  {resendMessage}
                </p>
              )}

              <Link to="/login" className="m-btn-primary">Go to Login</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VerifyEmail;
// frontend/src/features/ForgotPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Polling function to check status after submission
  const checkEmailStatus = async (targetEmail, attempts = 5) => {
    if (attempts <= 0) return;

    try {
      const res = await fetch(`${API_URL}/auth/email-status?email=${encodeURIComponent(targetEmail)}`);
      const data = await res.json();

      if (data.status === 'bounced') {
        setError('The email address bounced. Please check for typos and try again.');
        setMessage(''); // Clear the success message
        return;
      } else if (data.status === 'delivered') {
        // Confirmed delivered! Keep the success message active.
        return;
      }

      // If still pending/queued in Resend, poll again in 3 seconds
      setTimeout(() => checkEmailStatus(targetEmail, attempts - 1), 3000);
    } catch (err) {
      // Silently fail on network blips so we don't disrupt the user UI
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to send reset email');
        setLoading(false);
      } else {
        setMessage(data.message || 'Password reset email sent! Check your inbox.');
        setLoading(false);

        // Start polling the backend for bounce/delivery updates
        checkEmailStatus(email);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fp-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes m-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes m-slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .lf-spinner {
          display: inline-block; width: 15px; height: 15px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%;
          animation: lf-spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }

        /* ── Visibility ── */
        .lf-desktop-wrapper { display: block; }
        .lf-mobile-wrapper  { display: none; }
        @media (max-width: 640px) {
          .lf-desktop-wrapper { display: none !important; }
          .lf-mobile-wrapper  { display: flex !important; }
        }

        /* ── Desktop ── */
        .fp-container { animation: fp-fadeUp 0.5s ease-out forwards; }
        .fp-input {
          width: 100%; padding: 14px 16px;
          border: 1.5px solid #d1d5db; border-radius: 8px;
          font-size: 15px; transition: all 0.2s; background: #f9fafb;
          box-sizing: border-box;
        }
        .fp-input:focus {
          outline: none; border-color: #466460;
          box-shadow: 0 0 0 3px rgba(70, 100, 96, 0.15); background: #fff;
        }
        .fp-btn {
          width: 100%; padding: 14px; background: #466460; color: white;
          border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .fp-btn:hover:not(:disabled) {
          background: #3D5550; transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(70,100,96,0.25);
        }
        .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .fp-back { display: block; text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        .fp-back a { color: #466460; text-decoration: none; font-weight: 600; }
        .fp-back a:hover { text-decoration: underline; }
        .fp-icon {
          width: 64px; height: 64px; margin: 0 auto 20px;
          background: #f0f4f3; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .fp-icon svg { width: 32px; height: 32px; color: #466460; }
        @media (max-width: 480px) {
          .fp-container { padding: 30px 24px; }
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            width: 100%; min-height: 100dvh; display: flex; flex-direction: column;
            background: #F2F4F3; box-sizing: border-box; z-index: 10;
            padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
          }
          .m-topbar {
            display: flex; align-items: center; justify-content: center;
            padding: 20px 24px 0; flex-shrink: 0; animation: m-fadeIn 0.4s ease both;
          }
          .m-logo-wrap { display: flex; align-items: center; gap: 10px; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-hero {
            padding: 36px 28px 24px; flex-shrink: 0; animation: m-fadeUp 0.5s ease 0.1s both;
          }
          .m-eyebrow {
            font-size: 12px; font-weight: 600; color: #4A8C82;
            letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px;
          }
          .m-title {
            font-size: 30px; font-weight: 800; color: #1A2E2B;
            line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 8px;
          }
          .m-subtitle { font-size: 14px; color: #6B8580; line-height: 1.5; }
          .m-card {
            background: #fff; border-radius: 28px 28px 0 0;
            padding: 36px 24px 56px; flex: 1; box-shadow: 0 -2px 24px rgba(42,72,68,0.08);
            animation: m-fadeUp 0.5s ease 0.2s both; min-width: 0;
          }
          .m-error {
            display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px;
            background: #FFF0F0; border-radius: 14px; border: 1px solid #FFCCCC;
            animation: m-slideDown 0.3s ease;
          }
          .m-error-icon {
            width: 20px; height: 20px; border-radius: 50%; background: #FF4444;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .m-error-text { font-size: 13.5px; color: #C0392B; font-weight: 500; line-height: 1.4; }
          .m-success {
            display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px;
            background: #EDFAF4; border-radius: 14px; border: 1px solid #A7EED0;
            animation: m-slideDown 0.3s ease;
          }
          .m-success-icon {
            width: 20px; height: 20px; border-radius: 50%; background: #22C77A;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .m-success-text { font-size: 13.5px; color: #0A7850; font-weight: 500; line-height: 1.4; }
          .m-field { margin-bottom: 16px; min-width: 0; }
          .m-field-label {
            font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px;
            text-transform: uppercase; color: #8AA09C; margin-bottom: 8px; display: block;
          }
          .m-input-pill {
            display: flex; align-items: center; background: #F4F7F6; border-radius: 16px;
            border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
            overflow: hidden; min-width: 0;
          }
          .m-input-pill:focus-within {
            border-color: #3D7A6F; background: #fff; box-shadow: 0 0 0 4px rgba(61,122,111,0.1);
          }
          .m-pill-icon {
            padding: 0 6px 0 16px; display: flex; align-items: center;
            color: #A0B8B4; transition: color 0.2s; flex-shrink: 0;
          }
          .m-input-pill:focus-within .m-pill-icon { color: #3D7A6F; }
          .m-pill-input {
            flex: 1; min-width: 0; border: none; background: transparent; outline: none;
            font-size: 15px; font-family: inherit; color: #1A2E2B; padding: 15px 16px 15px 8px;
          }
          .m-pill-input::placeholder { color: #B5C8C5; }
          .m-btn-primary {
            width: 100%; padding: 17px; border-radius: 18px; border: none;
            background: #2D5C52; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit;
            cursor: pointer; letter-spacing: 0.1px; transition: transform 0.15s, background 0.2s;
            margin-top: 6px; margin-bottom: 24px; -webkit-tap-highlight-color: transparent;
          }
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
          .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className="lf-desktop-wrapper">
        <AuthLayout>
          <div className={`fp-container ${!isLoaded ? 'opacity-0' : ''}`} style={{ maxWidth: 420, margin: '0 auto', padding: '40px' }}>
            <div className="fp-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#1f2937' }}>
              Forgot Password?
            </h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="fp-input"
                  required
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 8, marginBottom: 20, color: '#dc2626', fontSize: 14
                }}>
                  {error}
                </div>
              )}

              {message && (
                <div style={{
                  padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: 8, marginBottom: 20, color: '#16a34a', fontSize: 14
                }}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading} className="fp-btn">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="fp-back">
              Remember your password? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </AuthLayout>
      </div>

      {/* ══════════════════════ MOBILE ══════════════════════ */}
      <div className="lf-mobile-wrapper">
        <div className="m-topbar">
          <div className="m-logo-wrap">
            <span className="m-logo-name">MediTrack</span>
          </div>
        </div>

        <div className="m-hero">
          <p className="m-eyebrow">Health Portal</p>
          <h1 className="m-title">Forgot your<br />password?</h1>
          <p className="m-subtitle">Enter your email and we'll send you a link to reset it.</p>
        </div>

        <div className="m-card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="m-error">
                <div className="m-error-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path d="M6 3v3M6 8.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="m-error-text">{error}</p>
              </div>
            )}
            {message && (
              <div className="m-success">
                <div className="m-success-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                    <path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="m-success-text">{message}</p>
              </div>
            )}

            <div className="m-field">
              <label className="m-field-label">Email</label>
              <div className="m-input-pill">
                <span className="m-pill-icon">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M3 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
                    <path d="M2 6l8 6 8-6"/>
                  </svg>
                </span>
                <input
                  type="email"
                  className="m-pill-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="m-btn-primary">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="m-footer">
              Remember your password?{' '}
              <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
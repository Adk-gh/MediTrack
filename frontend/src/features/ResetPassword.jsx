//C:\Users\HP\MediTrack\frontend\src\features\ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DEFAULT_PASSWORD_RULES = { minLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialCharacter: true };

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordRules, setPasswordRules] = useState(DEFAULT_PASSWORD_RULES);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load reset link + password rules
  useEffect(() => {
    setIsLoaded(true);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
      setRulesLoading(false);
      return;
    }

    const loadPasswordRules = async () => {
      try {
        setRulesLoading(true);
        const response = await fetch(`${API_URL}/system-config`, { headers: { Accept: 'application/json' } });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load password requirements.');
        }

        setPasswordRules({ ...DEFAULT_PASSWORD_RULES, ...(data.data?.password_rules || {}) });
        setIsReady(true);
      } catch (err) {
        console.error('[ResetPassword] Failed to load password rules:', err);
        setPasswordRules(DEFAULT_PASSWORD_RULES);
        setIsReady(true);
      } finally {
        setRulesLoading(false);
      }
    };

    loadPasswordRules();
  }, [searchParams]);

  // Validation
  const validatePassword = (value) => {
    if (value.length < passwordRules.minLength) return `Password must be at least ${passwordRules.minLength} characters.`;
    if (passwordRules.requireUppercase && !/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter.';
    if (passwordRules.requireLowercase && !/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter.';
    if (passwordRules.requireNumber && !/[0-9]/.test(value)) return 'Password must contain at least one number.';
    if (passwordRules.requireSpecialCharacter && !/[^A-Za-z0-9]/.test(value)) return 'Password must contain at least one special character.';
    return null;
  };

  const passwordChecks = {
    minLength: password.length >= passwordRules.minLength,
    uppercase: !passwordRules.requireUppercase || /[A-Z]/.test(password),
    lowercase: !passwordRules.requireLowercase || /[a-z]/.test(password),
    number: !passwordRules.requireNumber || /[0-9]/.test(password),
    special: !passwordRules.requireSpecialCharacter || /[^A-Za-z0-9]/.test(password),
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to reset password.');
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error('[ResetPassword] Reset password error:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Icons & Helpers
  const eyeOpenIcon = (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );

  const eyeClosedIcon = (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06" />
    </svg>
  );

  const Requirement = ({ show, passed, children }) => {
    if (!show) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: passed ? '#16805C' : '#7A8F8A', marginBottom: 5 }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: passed ? '#DCF7EA' : '#EEF2F1', color: passed ? '#16805C' : '#9AA9A5', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
          {passed ? '✓' : '•'}
        </span>
        <span>{children}</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        /* Force the entire page to allow natural scrolling (overrides layout restrictions) */
        html, body, #root {
          height: auto !important;
          min-height: 100vh;
          overflow-y: auto !important;
        }

        @keyframes rp-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rp-spin { to { transform: rotate(360deg); } }
        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes m-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes m-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes m-slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        .lf-spinner { display: inline-block; width: 15px; height: 15px; border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: lf-spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        .lf-desktop-wrapper { display: block; padding-bottom: 60px; }
        .lf-mobile-wrapper { display: none; }

        @media (max-width: 640px) {
          .lf-desktop-wrapper { display: none !important; }
          .lf-mobile-wrapper { display: flex !important; }
        }

        .rp-container { animation: rp-fadeUp 0.5s ease-out forwards; }
        .rp-input { width: 100%; padding: 14px 16px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 15px; transition: all 0.2s; background: #f9fafb; box-sizing: border-box; }
        .rp-input:focus { outline: none; border-color: #466460; box-shadow: 0 0 0 3px rgba(70, 100, 96, 0.15); background: #fff; }
        .rp-btn { width: 100%; padding: 14px; background: #466460; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .rp-btn:hover:not(:disabled) { background: #3D5550; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(70,100,96,0.25); }
        .rp-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .rp-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: #f0f4f3; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .rp-icon svg { width: 32px; height: 32px; color: #466460; }

        @media (max-width: 480px) { .rp-container { padding: 30px 24px; } }

        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            /* Removed position fixed and height/overflow restrictions */
            width: 100%;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            background: #F2F4F3;
            box-sizing: border-box;
            z-index: 10;
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
          .m-topbar { display: flex; align-items: center; justify-content: center; padding: 20px 24px 0; flex-shrink: 0; animation: m-fadeIn 0.4s ease both; }
          .m-logo-wrap { display: flex; align-items: center; gap: 10px; }
          .m-logo-name { font-size: 17px; font-weight: 700; color: #2D4744; letter-spacing: -0.3px; }
          .m-hero { padding: 36px 28px 24px; flex-shrink: 0; animation: m-fadeUp 0.5s ease 0.1s both; }
          .m-eyebrow { font-size: 12px; font-weight: 600; color: #4A8C82; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 10px; }
          .m-title { font-size: 30px; font-weight: 800; color: #1A2E2B; line-height: 1.15; letter-spacing: -0.6px; margin-bottom: 8px; }
          .m-subtitle { font-size: 14px; color: #6B8580; line-height: 1.5; }
          .m-card { background: #fff; border-radius: 28px 28px 0 0; padding: 36px 24px 56px; flex: 1; box-shadow: 0 -2px 24px rgba(42,72,68,0.08); animation: m-fadeUp 0.5s ease 0.2s both; min-width: 0; }
          .m-error { display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px; background: #FFF0F0; border-radius: 14px; border: 1px solid #FFCCCC; animation: m-slideDown 0.3s ease; }
          .m-error-icon { width: 20px; height: 20px; border-radius: 50%; background: #FF4444; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .m-error-text { font-size: 13.5px; color: #C0392B; font-weight: 500; line-height: 1.4; }
          .m-success { display: flex; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 20px; background: #EDFAF4; border-radius: 14px; border: 1px solid #A7EED0; animation: m-slideDown 0.3s ease; }
          .m-success-icon { width: 20px; height: 20px; border-radius: 50%; background: #22C77A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .m-success-text { font-size: 13.5px; color: #0A7850; font-weight: 500; line-height: 1.4; }
          .m-field { margin-bottom: 16px; min-width: 0; }
          .m-field-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; color: #8AA09C; margin-bottom: 8px; display: block; }
          .m-input-pill { display: flex; align-items: center; background: #F4F7F6; border-radius: 16px; border: 1.5px solid transparent; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s; overflow: hidden; min-width: 0; }
          .m-input-pill:focus-within { border-color: #3D7A6F; background: #fff; box-shadow: 0 0 0 4px rgba(61,122,111,0.1); }
          .m-pill-input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font-size: 15px; font-family: inherit; color: #1A2E2B; padding: 15px 14px; }
          .m-pill-input::placeholder { color: #B5C8C5; }
          .m-pill-btn { background: none; border: none; cursor: pointer; padding: 0 16px; display: flex; align-items: center; color: #A0B8B4; transition: color 0.2s; flex-shrink: 0; }
          .m-pill-btn:hover { color: #3D7A6F; }
          .m-btn-primary { width: 100%; padding: 17px; border-radius: 18px; border: none; background: #2D5C52; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.1px; transition: transform 0.15s, background 0.2s; margin-top: 6px; margin-bottom: 24px; -webkit-tap-highlight-color: transparent; }
          .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
          .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .m-btn-ghost { display: block; width: 100%; padding: 16px; border-radius: 18px; border: 1.5px solid #DDE5E3; background: transparent; color: #2D5C52; font-size: 15px; font-weight: 600; font-family: inherit; text-align: center; text-decoration: none; cursor: pointer; transition: background 0.2s, border-color 0.2s; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          .m-btn-ghost:hover { background: #F4F7F6; border-color: #A8C4BE; }
          .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
          .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }
          .m-spinner-wrap { text-align: center; padding: 30px 0 10px; }
          .m-spinner { width: 32px; height: 32px; margin: 0 auto 16px; border: 3px solid #E8EDEC; border-top-color: #2D5C52; border-radius: 50%; animation: rp-spin 0.8s linear infinite; }
          .m-spinner-text { color: #8AA09C; font-size: 13.5px; }
          .m-password-rules { margin: -4px 0 18px; padding: 12px 14px; background: #F4F7F6; border: 1px solid #E1EAE7; border-radius: 14px; }
          .m-password-rules-title { font-size: 11px; font-weight: 700; color: #6B8580; text-transform: uppercase; letter-spacing: 0.7px; margin: 0 0 8px; }
        }
      `}</style>

      {/* DESKTOP */}
      <div className="lf-desktop-wrapper">
        <AuthLayout widthClass="max-w-[480px]">
          <div className={`rp-container ${!isLoaded ? 'opacity-0' : ''}`} style={{ maxWidth: 480, margin: '0 auto', padding: '40px' }}>
            <div className="rp-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21V11a2.25 2.25 0 012-2h5.5a2.25 2.25 0 012 2v.75l-2.256-2.256A2.25 2.25 0 0113.5 16.5h-2.378a2.25 2.25 0 01-2.244-2.244V12.89a2.25 2.25 0 00-.659-1.591L3.662 6.694a2.25 2.25 0 011.591-.659H9.75z" />
              </svg>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#1f2937' }}>Reset Password</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 14 }}>Enter your new password below.</p>

            {!isReady && !error ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#466460', borderRadius: '50%', animation: 'rp-spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: '#6b7280', fontSize: 14 }}>{rulesLoading ? 'Loading password requirements...' : 'Preparing reset link...'}</p>
              </div>
            ) : error && !isReady ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, color: '#dc2626', fontSize: 14 }}>{error}</div>
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>The reset link has expired or is invalid. Please request a new one.</p>
                <Link to="/forgot-password" style={{ display: 'inline-block', padding: '12px 24px', background: '#466460', color: 'white', textDecoration: 'none', borderRadius: 8, fontWeight: 600 }}>Request New Reset Link</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>New Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" className="rp-input" required minLength={passwordRules.minLength} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                </div>

                <div style={{ marginBottom: 20, padding: '12px 14px', background: '#f4f8f6', border: '1px solid #e2ebe8', borderRadius: 10 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#466460', textTransform: 'uppercase', letterSpacing: 0.6 }}>Password Requirements</p>
                  <Requirement show passed={passwordChecks.minLength}>At least {passwordRules.minLength} characters</Requirement>
                  <Requirement show={passwordRules.requireUppercase} passed={passwordChecks.uppercase}>At least one uppercase letter</Requirement>
                  <Requirement show={passwordRules.requireLowercase} passed={passwordChecks.lowercase}>At least one lowercase letter</Requirement>
                  <Requirement show={passwordRules.requireNumber} passed={passwordChecks.number}>At least one number</Requirement>
                  <Requirement show={passwordRules.requireSpecialCharacter} passed={passwordChecks.special}>At least one special character</Requirement>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="rp-input" required minLength={passwordRules.minLength} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                </div>

                {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 20, color: '#dc2626', fontSize: 14 }}>{error}</div>}
                {message && <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 20, color: '#16a34a', fontSize: 14 }}>{message}</div>}

                <button type="submit" disabled={loading} className="rp-btn">{loading ? 'Updating...' : 'Update Password'}</button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" style={{ color: '#466460', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Back to Login</Link>
            </div>
          </div>
        </AuthLayout>
      </div>

      {/* MOBILE */}
      <div className="lf-mobile-wrapper">
        <div className="m-topbar">
          <div className="m-logo-wrap"><span className="m-logo-name">MediTrack</span></div>
        </div>

        <div className="m-hero">
          <p className="m-eyebrow">Health Portal</p>
          <h1 className="m-title">Reset your<br />password.</h1>
          <p className="m-subtitle">Enter your new password below.</p>
        </div>

        <div className="m-card">
          {!isReady && !error ? (
            <div className="m-spinner-wrap">
              <div className="m-spinner" />
              <p className="m-spinner-text">{rulesLoading ? 'Loading password requirements...' : 'Preparing reset link...'}</p>
            </div>
          ) : error && !isReady ? (
            <div>
              <div className="m-error">
                <div className="m-error-icon">
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 3v3M6 8.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
                <p className="m-error-text">{error}</p>
              </div>
              <p style={{ color: '#8AA09C', fontSize: 13.5, marginBottom: 20, textAlign: 'center' }}>The reset link has expired or is invalid. Please request a new one.</p>
              <Link to="/forgot-password" className="m-btn-ghost">Request New Reset Link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="m-error">
                  <div className="m-error-icon"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 3v3M6 8.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg></div>
                  <p className="m-error-text">{error}</p>
                </div>
              )}

              {message && (
                <div className="m-success">
                  <div className="m-success-icon"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2.5 6l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <p className="m-success-text">{message}</p>
                </div>
              )}

              <div className="m-field">
                <label className="m-field-label">New password</label>
                <div className="m-input-pill">
                  <input type={showPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Enter new password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={passwordRules.minLength} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                  <button type="button" className="m-pill-btn" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? eyeClosedIcon : eyeOpenIcon}
                  </button>
                </div>
              </div>

              <div className="m-password-rules">
                <p className="m-password-rules-title">Password requirements</p>
                <Requirement show passed={passwordChecks.minLength}>At least {passwordRules.minLength} characters</Requirement>
                <Requirement show={passwordRules.requireUppercase} passed={passwordChecks.uppercase}>At least one uppercase letter</Requirement>
                <Requirement show={passwordRules.requireLowercase} passed={passwordChecks.lowercase}>At least one lowercase letter</Requirement>
                <Requirement show={passwordRules.requireNumber} passed={passwordChecks.number}>At least one number</Requirement>
                <Requirement show={passwordRules.requireSpecialCharacter} passed={passwordChecks.special}>At least one special character</Requirement>
              </div>

              <div className="m-field">
                <label className="m-field-label">Confirm password</label>
                <div className="m-input-pill">
                  <input type={showConfirmPassword ? 'text' : 'password'} className="m-pill-input" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={passwordRules.minLength} autoComplete="new-password" onPaste={(e) => e.preventDefault()} />
                  <button type="button" className="m-pill-btn" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? eyeClosedIcon : eyeOpenIcon}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="m-btn-primary">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}

          <p className="m-footer"><Link to="/login">Back to Login</Link></p>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
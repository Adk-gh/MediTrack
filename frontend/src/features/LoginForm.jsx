// frontend/src/components/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import authService from '../services/auth.service.js';
import { loginSchema, getFieldErrors } from '../validation/schemas.js';

const LoginForm = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Real-time validation
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const errors = getFieldErrors(loginSchema, { email, password });
      setFieldErrors(errors);
    }
  }, [email, password, touched]);

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = { email, password };
    const validation = loginSchema.safeParse(formData);

    if (!validation.success) {
      const errors = getFieldErrors(loginSchema, formData);
      setFieldErrors(errors);
      setTouched({ email: true, password: true });
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await authService.login({ email, password });

      if (data.token) {
        // Persist auth data
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.role);       // 👈 nested under data.user
        localStorage.setItem('uid', data.user.uid);
        localStorage.setItem('name', data.user.name);

        const role = data.user.role;

        if (role === 'admin' || role === 'doctor') {
          navigate('/dashboard');
        } else if (role === 'student' || role === 'employee') {
          navigate('/student/meditrack');
        } else {
          setError('Unknown account role. Please contact support.');
        }
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes lf-spin { to { transform: rotate(360deg); } }
        @keyframes lf-fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lf-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lf-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes lf-slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .lf-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lf-spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        /* ── Visibility toggles ── */
        .lf-mobile-only  { display: none !important; }
        .lf-desktop-only { display: block !important; }

        @media (max-width: 640px) {
          .lf-mobile-only  { display: flex !important; }
          .lf-desktop-only { display: none  !important; }
          .lf-desktop-wrapper { display: none  !important; }
          .lf-mobile-wrapper  { display: flex  !important; }
        }
        @media (min-width: 641px) {
          .lf-desktop-wrapper { display: block !important; }
          .lf-mobile-wrapper  { display: none  !important; }
        }

        /* Animations - loaded state */
        .lf-animate-loaded .lf-field {
          animation: lf-fadeInUp 0.5s ease forwards;
          opacity: 0;
        }
        .lf-animate-loaded .lf-field:nth-child(1) { animation-delay: 0.1s; }
        .lf-animate-loaded .lf-field:nth-child(2) { animation-delay: 0.2s; }
        .lf-animate-loaded .lf-btn-group {
          animation: lf-fadeInUp 0.5s ease forwards;
          animation-delay: 0.3s;
          opacity: 0;
        }
        .lf-animate-loaded .lf-hero-brand {
          animation: lf-fadeIn 0.6s ease forwards;
        }
        .lf-animate-loaded .lf-hero-title {
          animation: lf-fadeInUp 0.5s ease forwards;
          animation-delay: 0.15s;
          opacity: 0;
        }
        .lf-animate-loaded .lf-hero-sub {
          animation: lf-fadeInUp 0.5s ease forwards;
          animation-delay: 0.25s;
          opacity: 0;
        }
        .lf-animate-loaded .lf-card {
          animation: lf-fadeInUp 0.5s ease forwards;
          animation-delay: 0.35s;
          opacity: 0;
        }

        /* ══════════════════════════
           SHARED
        ══════════════════════════ */
        .lf-error {
          margin-bottom: 15px;
          padding: 12px 16px;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 1px solid #fecaca;
          color: #dc2626;
          font-size: 14px;
          border-radius: 12px;
          text-align: center;
          animation: lf-slideIn 0.3s ease;
        }
        .lf-field { text-align: left; margin-bottom: 15px; }

        /* ══════════════════════════
           DESKTOP — pill inputs
        ══════════════════════════ */
        .lf-label-desktop {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 6px;
          margin-left: 4px;
          transition: color 0.2s ease;
        }
        .lf-input-desktop {
          width: 100%;
          padding: 14px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 50px;
          box-sizing: border-box;
          outline: none;
          font-size: 14px;
          font-family: inherit;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: #f8fafc;
        }
        .lf-input-desktop:focus {
          border-color: #4a635d;
          background: #fff;
          box-shadow: 0 4px 12px rgba(74, 99, 93, 0.15);
          transform: translateY(-1px);
        }
        .lf-input-desktop::placeholder { color: #94a3b8; }

        .lf-forgot-desktop {
          display: block;
          text-align: right;
          font-size: 13px;
          font-weight: 600;
          color: #4a635d;
          text-decoration: none;
          margin-top: -5px;
          margin-bottom: 15px;
          transition: opacity 0.2s ease;
        }
        .lf-forgot-desktop:hover {
          opacity: 0.8;
        }

        .lf-desktop-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }
        .lf-btn-primary-desktop {
          width: 200px; padding: 12px;
          border-radius: 50px;
          font-size: 14px; font-weight: 700;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, #4a635d 0%, #3d5249 100%);
          color: #fff; border: none;
          font-family: inherit;
          box-shadow: 0 4px 14px rgba(74, 99, 93, 0.3);
        }
        .lf-btn-primary-desktop:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(74, 99, 93, 0.4);
        }
        .lf-btn-primary-desktop:active:not(:disabled) {
          transform: translateY(0);
        }
        .lf-btn-primary-desktop:disabled { opacity: 0.7; cursor: not-allowed; }
        .lf-btn-secondary-desktop {
          width: 200px; padding: 12px;
          border-radius: 50px;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent; color: #4a635d;
          border: 2px solid #e2e8f0;
          text-align: center; text-decoration: none;
          display: inline-block; box-sizing: border-box;
        }
        .lf-btn-secondary-desktop:hover {
          border-color: #4a635d;
          background: rgba(74, 99, 93, 0.05);
          transform: translateY(-2px);
        }

        /* ══════════════════════════
           MOBILE — native app
        ══════════════════════════ */
        @media (max-width: 640px) {
          .lf-mobile-wrapper {
            position: fixed; inset: 0;
            flex-direction: column;
            background: linear-gradient(180deg, #f0f2f1 0%, #e8eeec 100%);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            z-index: 0;
          }

          /* Hero */
          .lf-hero {
            position: relative;
            background: linear-gradient(135deg, #2d5a52 0%, #1e3d35 100%);
            padding: 56px 28px 52px;
            overflow: hidden;
            flex-shrink: 0;
          }
          .lf-hero::before {
            content: '';
            position: absolute;
            top: -60px; right: -60px;
            width: 220px; height: 220px;
            border-radius: 50%;
            background: rgba(255,255,255,0.08);
            animation: lf-pulse 4s ease-in-out infinite;
          }
          .lf-hero::after {
            content: '';
            position: absolute;
            bottom: -80px; left: -40px;
            width: 200px; height: 200px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
            animation: lf-pulse 5s ease-in-out infinite 0.5s;
          }
          .lf-brand {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 28px;
            position: relative; z-index: 1;
          }
          .lf-brand-icon {
            width: 38px; height: 38px;
            background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; color: #fff;
            backdrop-filter: blur(10px);
            transition: transform 0.3s ease;
          }
          .lf-brand-icon:hover {
            transform: scale(1.05) rotate(5deg);
          }
          .lf-brand-name { font-size: 17px; font-weight: 700; color: #fff; }
          .lf-hero-title {
            font-size: 32px; font-weight: 700; color: #fff;
            line-height: 1.2; margin-bottom: 8px;
            position: relative; z-index: 1;
          }
          .lf-hero-sub {
            font-size: 15px; color: rgba(255,255,255,0.7);
            position: relative; z-index: 1;
          }

          /* White card */
          .lf-card {
            background: #fff;
            border-radius: 28px 28px 0 0;
            padding: 36px 24px 48px;
            flex: 1;
            margin-top: -8px;
            box-shadow: 0 -8px 32px rgba(0,0,0,0.08);
          }

          /* Mobile labels */
          .lf-label-mobile {
            display: block;
            font-size: 12px; font-weight: 600;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 8px;
            transition: color 0.2s ease;
          }

          /* Icon input row */
          .lf-input-wrap {
            align-items: center;
            background: #f1f5f4;
            border-radius: 16px;
            border: 2px solid transparent;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
          }
          .lf-input-wrap:focus-within {
            border-color: #2d5a52;
            background: #fff;
            box-shadow: 0 4px 16px rgba(45, 90, 82, 0.15);
          }
          .lf-input-wrap:has(.lf-input-mobile:focus) .lf-label-mobile {
            color: #2d5a52;
          }
          .lf-input-icon {
            width: 52px; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
          }
          .lf-input-icon-box {
            width: 32px; height: 32px;
            background: linear-gradient(135deg, #2d5a52 0%, #1e3d35 100%);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.3s ease;
          }
          .lf-input-wrap:focus-within .lf-input-icon-box {
            transform: scale(1.1);
          }
          .lf-input-mobile {
            flex: 1;
            border: none; background: transparent; outline: none;
            font-size: 15px; font-family: inherit; color: #1e293b;
            padding: 16px 8px 16px 0;
          }
          .lf-input-mobile::placeholder { color: #94a3b8; }
          .lf-eye-btn {
            background: none; border: none; cursor: pointer;
            padding: 0 16px;
            display: flex; align-items: center; color: #94a3b8;
            transition: color 0.2s ease, transform 0.2s ease;
          }
          .lf-eye-btn:hover {
            color: #2d5a52;
            transform: scale(1.1);
          }

          /* Forgot */
          .lf-forgot {
            display: block; text-align: right;
            font-size: 13px; font-weight: 600;
            color: #2d5a52; text-decoration: none;
            margin-top: -4px; margin-bottom: 28px;
            transition: opacity 0.2s ease;
          }
          .lf-forgot:hover { opacity: 0.8; }

          /* Mobile buttons */
          .lf-btn-primary-mobile {
            width: 100%; padding: 16px;
            border-radius: 50px; border: none;
            background: linear-gradient(135deg, #2d5a52 0%, #1e3d35 100%);
            color: #fff;
            font-size: 16px; font-weight: 700; font-family: inherit;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 16px;
            box-shadow: 0 4px 16px rgba(45, 90, 82, 0.3);
          }
          .lf-btn-primary-mobile:hover:not(:disabled) {
            opacity: 0.92;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(45, 90, 82, 0.4);
          }
          .lf-btn-primary-mobile:active:not(:disabled) {
            transform: scale(0.98);
          }
          .lf-btn-primary-mobile:disabled { opacity: 0.6; cursor: not-allowed; }

          .lf-divider {
            display: flex; align-items: center; gap: 12px;
            margin-bottom: 16px;
          }
          .lf-divider-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); }
          .lf-divider-text { font-size: 13px; color: #94a3b8; font-weight: 500; }

          .lf-btn-secondary-mobile {
            display: block; width: 100%; padding: 15px;
            border-radius: 50px;
            border: 2px solid #e2e8f0;
            background: #fff; color: #1e293b;
            font-size: 15px; font-weight: 600; font-family: inherit;
            text-align: center; text-decoration: none; cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            margin-bottom: 28px; box-sizing: border-box;
          }
          .lf-btn-secondary-mobile:hover {
            border-color: #2d5a52;
            background: #f8faf9;
            transform: translateY(-2px);
          }

          .lf-footer-text { text-align: center; font-size: 13.5px; color: #64748b; }
          .lf-footer-link { color: #2d5a52; font-weight: 700; text-decoration: none; transition: opacity 0.2s ease; }
          .lf-footer-link:hover { opacity: 0.8; }
        }
      `}</style>

      {/* ══════════════════════ DESKTOP ══════════════════════ */}
      <div className={`lf-desktop-wrapper ${isLoaded ? 'lf-animate-loaded' : ''}`}>
        <AuthLayout title="Log In" widthClass="max-w-[320px]">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}

            <div className="lf-field">
              <label htmlFor="email" className="lf-label-desktop">Email</label>
              <input
                id="email"
                type="email"
                required
                className="lf-input-desktop"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
              />
            </div>

            <div className="lf-field">
              <label htmlFor="password" className="lf-label-desktop">Password</label>
              <input
                id="password"
                type="password"
                required
                className="lf-input-desktop"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
              />
            </div>

            <Link to="/forgot-password" className="lf-forgot-desktop">Forgot password?</Link>

            <div className="lf-desktop-actions lf-btn-group">
              <button type="submit" disabled={loading} className="lf-btn-primary-desktop">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <Link to="/signup" className="lf-btn-secondary-desktop">Signup</Link>
            </div>
          </form>
        </AuthLayout>
      </div>

      {/* ══════════════════════ MOBILE ══════════════════════ */}
      <div className={`lf-mobile-wrapper ${isLoaded ? 'lf-animate-loaded' : ''}`}>
        {/* Hero */}
        <div className="lf-hero">
          <div className="lf-brand lf-hero-brand">
            <div className="lf-brand-icon">＋</div>
            <span className="lf-brand-name">MediTrack</span>
          </div>
          <h1 className="lf-hero-title">Welcome back</h1>
          <p className="lf-hero-sub">Sign in to continue your health journey</p>
        </div>

        {/* Card */}
        <div className="lf-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="lf-error">{error}</div>}

            {/* Email */}
            <div className="lf-field">
              <label className="lf-label-mobile">Email</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon">
                  <div className="lf-input-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                </div>
                <input
                  type="email"
                  className="lf-input-mobile"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  required
                  autoComplete="email"
                  inputMode="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lf-field">
              <label className="lf-label-mobile">Password</label>
              <div className="lf-input-wrap lf-mobile-only">
                <div className="lf-input-icon">
                  <div className="lf-input-icon-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="lf-input-mobile"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lf-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Link to="/forgot-password" className="lf-forgot">Forgot password?</Link>

            <button type="submit" disabled={loading} className="lf-btn-primary-mobile">
              {loading && <span className="lf-spinner" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="lf-divider">
              <div className="lf-divider-line" />
              <span className="lf-divider-text">or</span>
              <div className="lf-divider-line" />
            </div>

            <Link to="/signup" className="lf-btn-secondary-mobile">Create account</Link>

            <p className="lf-footer-text">
              Don't have an account?{' '}
              <Link to="/signup" className="lf-footer-link">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
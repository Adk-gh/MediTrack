  // frontend/src/components/LoginForm.jsx

  import React, { useState, useEffect } from 'react';
  import { Link, useNavigate } from 'react-router-dom';
  import { AuthLayout } from '../layouts/AuthLayout.jsx';
  import { loginSchema, getFieldErrors } from '../validation/schemas.js';
  import { useLoading } from '../context/LoadingContext.jsx';

  // Firebase Imports
  import { signInWithEmailAndPassword } from "firebase/auth";
  import { doc, getDoc } from "firebase/firestore";
  import { auth, db } from '../firebase';

  const LoginForm = () => {
    const navigate = useNavigate();
    const { showLoading, hideLoading } = useLoading();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [touched, setTouched] = useState({});
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
      setIsLoaded(true);
    }, []);

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
      showLoading('Signing in', 'light');
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);
        let userData = { email: firebaseUser.email, uid: firebaseUser.uid };
        if (userSnap.exists()) {
          userData = { ...userData, ...userSnap.data() };
        } else {
          setError("User profile not found. Please contact the administrator.");
          setLoading(false);
          return;
        }
        localStorage.setItem('token', firebaseUser.accessToken);
        localStorage.setItem('role', userData.role || 'student');
        localStorage.setItem('uid', firebaseUser.uid);
        localStorage.setItem('name', `${userData.firstName || ''} ${userData.lastName || ''}`.trim());
        localStorage.setItem('user', JSON.stringify(userData));
        const role = userData.role?.toLowerCase().trim() || 'student';
        hideLoading();
        if (['nurse', 'doctor', 'dentist', 'admin', 'administrator'].includes(role)) {
          navigate('/dashboard');
        } else {
          navigate('/student/meditrack');
        }
      } catch (err) {
        hideLoading();
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError('Invalid email or password');
        } else if (err.code === 'auth/network-request-failed') {
          setError('Network error. Check your internet connection.');
        } else {
          setError('An error occurred during login. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <style>{`
          /* ── Animations ── */
          @keyframes lf-spin { to { transform: rotate(360deg); } }
          @keyframes m-fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes m-fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes m-slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes m-shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
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
          .lf-desktop-wrapper { display: block; }
          .lf-mobile-wrapper  { display: none; }
          @media (max-width: 640px) {
            .lf-desktop-wrapper { display: none !important; }
            .lf-mobile-wrapper  { display: flex !important; }
          }

          /* ── Desktop (unchanged) ── */
          .lf-animate-loaded .lf-field {
            animation: m-fadeUp 0.5s ease forwards;
            opacity: 0;
          }
          .lf-animate-loaded .lf-field:nth-child(1) { animation-delay: 0.1s; }
          .lf-animate-loaded .lf-field:nth-child(2) { animation-delay: 0.2s; }
          .lf-animate-loaded .lf-btn-group {
            animation: m-fadeUp 0.5s ease forwards;
            animation-delay: 0.3s;
            opacity: 0;
          }
          .lf-error-desktop {
            margin-bottom: 15px; padding: 12px 16px;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border: 1px solid #fecaca; color: #dc2626;
            font-size: 14px; border-radius: 12px; text-align: center;
          }
          .lf-field { text-align: left; margin-bottom: 15px; }
          .lf-label-desktop {
            display: block; font-size: 14px; font-weight: 600;
            color: #4a5568; margin-bottom: 6px; margin-left: 4px;
          }
          .lf-input-desktop {
            width: 100%; padding: 14px 20px;
            border: 2px solid #e2e8f0; border-radius: 50px;
            box-sizing: border-box; outline: none;
            font-size: 14px; font-family: inherit;
            transition: all 0.25s; background: #f8fafc;
          }
          .lf-input-desktop:focus {
            border-color: #466460; background: #fff;
            box-shadow: 0 4px 12px rgba(70,100,96,0.15);
            transform: translateY(-1px);
          }
          .lf-forgot-desktop {
            display: block; text-align: right; font-size: 13px;
            font-weight: 600; color: #466460; text-decoration: none;
            margin-top: -5px; margin-bottom: 15px;
          }
          .lf-desktop-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 10px; }
          .lf-btn-primary-desktop {
            width: 200px; padding: 12px; border-radius: 50px;
            font-size: 14px; font-weight: 700; cursor: pointer;
            background: linear-gradient(135deg, #466460 0%, #38524d 100%);
            color: #fff; border: none; font-family: inherit;
            box-shadow: 0 4px 14px rgba(70,100,96,0.3);
            transition: all 0.25s;
          }
          .lf-btn-primary-desktop:hover:not(:disabled) {
            opacity: 0.9; transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(70,100,96,0.4);
          }
          .lf-btn-primary-desktop:disabled { opacity: 0.7; cursor: not-allowed; }
          .lf-btn-secondary-desktop {
            width: 200px; padding: 12px; border-radius: 50px;
            font-size: 14px; font-weight: 600; cursor: pointer;
            background: transparent; color: #466460;
            border: 2px solid #e2e8f0; text-align: center;
            text-decoration: none; display: inline-block;
            box-sizing: border-box; transition: all 0.25s;
          }
          .lf-btn-secondary-desktop:hover {
            border-color: #466460;
            background: rgba(70,100,96,0.05);
            transform: translateY(-2px);
          }

          /* ════════════════════════════════════
            MOBILE — redesigned native shell
          ════════════════════════════════════ */
          @media (max-width: 640px) {
            .lf-mobile-wrapper {
              position: fixed; inset: 0;
              flex-direction: column;
              background: #F2F4F3;
              overflow-y: auto;
              -webkit-overflow-scrolling: touch;
            }

            /* ── Top strip ── */
            .m-topbar {
              display: flex; align-items: center; justify-content: center;
              padding: 20px 24px 0;
              flex-shrink: 0;
            }
            .m-logo-wrap {
              display: flex; align-items: center; gap: 10px;
              animation: m-fadeIn 0.5s ease both;
            }
            .m-logo-img { height: 32px; border-radius: 8px; }
            .m-logo-name {
              font-size: 17px; font-weight: 700;
              color: #2D4744; letter-spacing: -0.3px;
            }

            /* ── Hero text ── */
            .m-hero {
              padding: 36px 28px 28px;
              flex-shrink: 0;
              animation: m-fadeUp 0.5s ease 0.1s both;
            }
            .m-eyebrow {
              font-size: 12px; font-weight: 600;
              color: #4A8C82; letter-spacing: 1.2px;
              text-transform: uppercase; margin-bottom: 10px;
            }
            .m-title {
              font-size: 34px; font-weight: 800;
              color: #1A2E2B; line-height: 1.1;
              letter-spacing: -0.8px; margin-bottom: 8px;
            }
            .m-subtitle {
              font-size: 15px; color: #6B8580; line-height: 1.5;
            }

            /* ── Form card ── */
            .m-card {
              background: #fff;
              border-radius: 28px 28px 0 0;
              padding: 32px 24px 52px;
              flex: 1;
              box-shadow: 0 -2px 24px rgba(42,72,68,0.08);
              animation: m-fadeUp 0.5s ease 0.2s both;
            }

            /* ── Error banner ── */
            .m-error {
              display: flex; align-items: center; gap: 10px;
              padding: 12px 14px; margin-bottom: 20px;
              background: #FFF0F0; border-radius: 14px;
              border: 1px solid #FFCCCC;
              animation: m-slideDown 0.3s ease;
            }
            .m-error-icon {
              width: 20px; height: 20px; border-radius: 50%;
              background: #FF4444;
              display: flex; align-items: center; justify-content: center;
              flex-shrink: 0;
            }
            .m-error-text { font-size: 13.5px; color: #C0392B; font-weight: 500; line-height: 1.4; }

            /* ── Field group ── */
            .m-field { margin-bottom: 16px; }
            .m-field-label {
              font-size: 11.5px; font-weight: 700;
              letter-spacing: 0.7px; text-transform: uppercase;
              color: #8AA09C; margin-bottom: 8px; display: block;
            }

            /* ── Floating input pill ── */
            .m-input-pill {
              display: flex; align-items: center;
              background: #F4F7F6; border-radius: 16px;
              border: 1.5px solid transparent;
              transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
              overflow: hidden;
            }
            .m-input-pill:focus-within {
              border-color: #3D7A6F;
              background: #fff;
              box-shadow: 0 0 0 4px rgba(61,122,111,0.1);
            }
            .m-pill-icon {
              padding: 0 6px 0 16px;
              display: flex; align-items: center;
              color: #A0B8B4; transition: color 0.2s;
              flex-shrink: 0;
            }
            .m-input-pill:focus-within .m-pill-icon { color: #3D7A6F; }
            .m-pill-input {
              flex: 1; border: none; background: transparent; outline: none;
              font-size: 15px; font-family: inherit; color: #1A2E2B;
              padding: 15px 8px 15px 8px;
            }
            .m-pill-input::placeholder { color: #B5C8C5; }
            .m-pill-btn {
              background: none; border: none; cursor: pointer;
              padding: 0 16px; display: flex; align-items: center;
              color: #A0B8B4; transition: color 0.2s;
              flex-shrink: 0;
            }
            .m-pill-btn:hover { color: #3D7A6F; }

            /* ── Forgot link ── */
            .m-forgot {
              display: block; text-align: right;
              font-size: 13px; font-weight: 600; color: #3D7A6F;
              text-decoration: none; margin: -4px 0 28px;
              -webkit-tap-highlight-color: transparent;
            }

            /* ── Primary CTA ── */
            .m-btn-primary {
              width: 100%; padding: 17px;
              border-radius: 18px; border: none;
              background: #2D5C52;
              color: #fff;
              font-size: 16px; font-weight: 700; font-family: inherit;
              cursor: pointer; letter-spacing: 0.1px;
              transition: transform 0.15s, background 0.2s;
              margin-bottom: 14px;
              -webkit-tap-highlight-color: transparent;
            }
            .m-btn-primary:active:not(:disabled) { transform: scale(0.97); }
            .m-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

            /* ── Divider ── */
            .m-divider {
              display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
            }
            .m-divider-line { flex: 1; height: 1px; background: #E8EDEC; }
            .m-divider-text { font-size: 13px; color: #A0B8B4; font-weight: 500; }

            /* ── Ghost CTA ── */
            .m-btn-ghost {
              display: block; width: 100%; padding: 16px;
              border-radius: 18px; border: 1.5px solid #DDE5E3;
              background: transparent; color: #2D5C52;
              font-size: 15px; font-weight: 600; font-family: inherit;
              text-align: center; text-decoration: none;
              cursor: pointer; transition: background 0.2s, border-color 0.2s;
              margin-bottom: 28px; box-sizing: border-box;
              -webkit-tap-highlight-color: transparent;
            }
            .m-btn-ghost:hover { background: #F4F7F6; border-color: #A8C4BE; }

            /* ── Footer ── */
            .m-footer { text-align: center; font-size: 13.5px; color: #8AA09C; }
            .m-footer a { color: #2D5C52; font-weight: 700; text-decoration: none; }

            /* ── Stagger animations ── */
            .m-loaded .m-hero   { animation: m-fadeUp 0.5s ease 0.05s both; }
            .m-loaded .m-card   { animation: m-fadeUp 0.5s ease 0.15s both; }
            .m-loaded .m-topbar { animation: m-fadeIn 0.4s ease both; }
          }
        `}</style>

        {/* ══════════════════════ DESKTOP ══════════════════════ */}
        <div className={`lf-desktop-wrapper ${isLoaded ? 'lf-animate-loaded' : ''}`}>
          <AuthLayout title="Log In" widthClass="max-w-[320px]">
            <form onSubmit={handleSubmit}>
              {error && <div className="lf-error-desktop">{error}</div>}
              <div className="lf-field">
                <label htmlFor="email-d" className="lf-label-desktop">Email</label>
                <input id="email-d" type="email" required className="lf-input-desktop"
                  placeholder="Enter your email" value={email}
                  onChange={(e) => setEmail(e.target.value)} onBlur={() => handleBlur('email')} />
              </div>
              <div className="lf-field">
                <label htmlFor="password-d" className="lf-label-desktop">Password</label>
                <input id="password-d" type="password" required className="lf-input-desktop"
                  placeholder="Enter your password" value={password}
                  onChange={(e) => setPassword(e.target.value)} onBlur={() => handleBlur('password')} />
              </div>
              <Link to="/forgot-password" className="lf-forgot-desktop">Forgot password?</Link>
              <div className="lf-desktop-actions lf-btn-group">
                <button type="submit" disabled={loading} className="lf-btn-primary-desktop">
                  {loading && <span className="lf-spinner" />}
                  {loading ? 'Logging in...' : 'Sign in'}
                </button>
                <div className="m-divider">
                <div className="m-divider-line" />
                <span className="m-divider-text">or</span>
                <div className="m-divider-line" />
              </div>
                <Link to="/signup" className="lf-btn-secondary-desktop">Create an Account</Link>
              </div>
            </form>
          </AuthLayout>
        </div>

        {/* ══════════════════════ MOBILE ══════════════════════ */}
        <div className={`lf-mobile-wrapper ${isLoaded ? 'm-loaded' : ''}`}>

          {/* Top bar */}
          <div className="m-topbar">
            <div className="m-logo-wrap">
              {/* <img src="/logo1.jpg" alt="MediTrack" className="m-logo-img" /> */}
              <span className="m-logo-name">MediTrack</span>
            </div>
          </div>

          {/* Hero text */}
          <div className="m-hero">
            <p className="m-eyebrow">Health Portal</p>
            <h1 className="m-title">Welcome<br />back.</h1>
            <p className="m-subtitle">Sign in to access your health records and appointments.</p>
          </div>

          {/* Card */}
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

              {/* Email */}
              <div className="m-field">
                <label className="m-field-label">Email</label>
                <div className="m-input-pill">
                  <span className="m-pill-icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M3 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>
                      <path d="M2 6l8 6 8-6"/>
                    </svg>
                  </span>
                  <input type="email" className="m-pill-input" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')} required autoComplete="email" inputMode="email" />
                </div>
              </div>

              {/* Password */}
              <div className="m-field">
                <label className="m-field-label">Password</label>
                <div className="m-input-pill">
                  <span className="m-pill-icon">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <rect x="4" y="9" width="12" height="9" rx="2"/>
                      <path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>
                    </svg>
                  </span>
                  <input type={showPassword ? 'text' : 'password'} className="m-pill-input"
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')} required autoComplete="current-password" />
                  <button type="button" className="m-pill-btn"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <path d="M3.5 3.5l13 13M8.34 8.41A3 3 0 0 0 11.6 11.6M4.5 5.6C3.2 6.8 2 8.5 2 10s3.13 5.5 8 5.5a10 10 0 0 0 3.5-.63M7 4.63A9.94 9.94 0 0 1 10 4.5c4.87 0 8 3 8 5.5 0 1.4-1.07 3-2.34 4.06"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                        <path d="M2 10s3.13-5.5 8-5.5S18 10 18 10s-3.13 5.5-8 5.5S2 10 2 10z"/>
                        <circle cx="10" cy="10" r="2.5"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <Link to="/forgot-password" className="m-forgot">Forgot password?</Link>

              <button type="submit" disabled={loading} className="m-btn-primary">
                {loading && <span className="lf-spinner" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              <div className="m-divider">
                <div className="m-divider-line" />
                <span className="m-divider-text">or</span>
                <div className="m-divider-line" />
              </div>

              <Link to="/signup" className="m-btn-ghost">Create an account</Link>


            </form>
          </div>
        </div>
      </>
    );
  };

  export default LoginForm;
// frontend/src/features/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { supabase } from '../supabase';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setIsLoaded(true);

    // First, check for error in URL hash (Supabase redirects with error info)
    const hashString = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hashString);
    const urlError = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    if (urlError) {
      // Parse the error description (URL encoded)
      const decodedError = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : 'Invalid or expired reset link';
      setError(decodedError);
      return;
    }

    // Get all possible tokens from URL
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const queryToken = searchParams.get('token');
    const queryRefreshToken = searchParams.get('refresh_token');
    const code = searchParams.get('code'); // Some Supabase setups use 'code'

    const finalToken = accessToken || queryToken || code;
    const finalRefreshToken = refreshToken || queryRefreshToken;

    if (!finalToken) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Try to set the session with the token
    supabase.auth.setSession({
      access_token: finalToken,
      refresh_token: finalRefreshToken || ''
    }).then(({ error }) => {
      if (error) {
        console.error('Set session error:', error);
        setError('Invalid or expired reset link: ' + error.message);
      } else {
        setIsReady(true);
      }
    }).catch(err => {
      console.error('Catch error:', err);
      setError('Failed to validate reset link');
    });
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes rp-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .rp-container {
          animation: rp-fadeUp 0.5s ease-out forwards;
        }
        .rp-input {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          transition: all 0.2s;
          background: #f9fafb;
        }
        .rp-input:focus {
          outline: none;
          border-color: #466460;
          box-shadow: 0 0 0 3px rgba(70, 100, 96, 0.15);
          background: #fff;
        }
        .rp-btn {
          width: 100%;
          padding: 14px;
          background: #466460;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rp-btn:hover:not(:disabled) {
          background: #3D5550;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(70,100,96,0.25);
        }
        .rp-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .rp-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: #f0f4f3;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rp-icon svg {
          width: 32px;
          height: 32px;
          color: #466460;
        }
        @media (max-width: 480px) {
          .rp-container { padding: 30px 24px; }
        }
      `}</style>

      <AuthLayout>
        <div className={`rp-container ${!isLoaded ? 'opacity-0' : ''}`} style={{ maxWidth: 420, margin: '0 auto', padding: '40px' }}>
          <div className="rp-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21V11a2.25 2.25 0 012-2h5.5a2.25 2.25 0 012 2v.75l-2.256-2.256A2.25 2.25 0 0113.5 16.5h-2.378a2.25 2.25 0 01-2.244-2.244V12.89a2.25 2.25 0 00-.659-1.591L3.662 6.694a2.25 2.25 0 011.591-.659H9.75z" />
            </svg>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', marginBottom: 8, color: '#1f2937' }}>
            Reset Password
          </h2>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
            Enter your new password below.
          </p>

{!isReady && !error ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: 32, height: 32,
                border: '3px solid #e5e7eb', borderTopColor: '#466460',
                borderRadius: '50%', animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Preparing reset link...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                padding: '20px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                marginBottom: 20,
                color: '#dc2626',
                fontSize: 14
              }}>
                {error}
              </div>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
                The reset link has expired or is invalid. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#466460',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontWeight: 600
                }}
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="rp-input"
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14, color: '#374151' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rp-input"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div style={{
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  marginBottom: 20,
                  color: '#dc2626',
                  fontSize: 14
                }}>
                  {error}
                </div>
              )}

              {message && (
                <div style={{
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  marginBottom: 20,
                  color: '#16a34a',
                  fontSize: 14
                }}>
                  {message}
                </div>
              )}

              <button type="submit" disabled={loading} className="rp-btn">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ color: '#466460', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
              Back to Login
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
};

export default ResetPassword;
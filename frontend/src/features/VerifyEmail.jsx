import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout.jsx';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        setMessage('Invalid verification link. Please request a new verification email.');
        return;
      }

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
          // Redirect to login after 3 seconds
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

  return (
    <>
      <style>{`
        @keyframes v-fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .v-container { animation: v-fadeUp 0.5s ease-out forwards; }
        .v-icon {
          width: 80px; height: 80px; margin: 0 auto 20px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .v-icon.success { background: #d1fae5; }
        .v-icon.error { background: #fee2e2; }
        .v-icon svg { width: 40px; height: 40px; }
        .v-icon.success svg { color: #059669; }
        .v-icon.error svg { color: #dc2626; }
        .v-btn {
          display: inline-block; padding: 12px 24px; background: #466460; color: white;
          text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;
        }
        .v-btn:hover { background: #3d5550; }
      `}</style>

      <AuthLayout>
        <div className="v-container" style={{ maxWidth: 420, margin: '0 auto', padding: '40px', textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <div className="v-icon" style={{ background: '#f3f4f6' }}>
                <svg className="animate-spin" viewBox="0 0 24 24" fill="none" stroke="#466460" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Verifying Email...</h2>
              <p style={{ color: '#6b7280' }}>Please wait while we verify your email address.</p>
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
              <p style={{ color: '#9ca3af', fontSize: 14 }}>Redirecting to login...</p>
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
              <Link to="/login" className="v-btn">Go to Login</Link>
            </>
          )}
        </div>
      </AuthLayout>
    </>
  );
};

export default VerifyEmail;

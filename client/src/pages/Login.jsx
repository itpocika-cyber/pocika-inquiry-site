import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const isExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager') {
        navigate('/admin-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'admin' || loggedUser.role === 'super_admin' || loggedUser.role === 'manager') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="card-pocika w-100 p-4 p-md-5" style={{ maxWidth: '440px' }}>
        <div className="text-center mb-4">
          <img
            src="/assets/logo/pocika-logo.png"
            alt="POCIKA"
            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
            className="mb-2"
          />
          <h1 className="text-page-title mb-1" style={{ fontSize: '1.5rem' }}>POCIKA</h1>
          <p className="text-muted-custom mb-0" style={{ fontSize: '0.9rem' }}>
            Inquiry & Site Visit Management
          </p>
        </div>

        {isExpired && (
          <div className="alert-pocika alert-warning mb-3 py-2 px-3 small">
            Your session has expired. Please sign in again.
          </div>
        )}

        {errorMessage && (
          <div className="alert-pocika alert-danger mb-3 py-2 px-3 small">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field-group mb-3">
            <label className="field-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-control-pocika"
              placeholder="name@pocika.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="field-group mb-4">
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control-pocika"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-pocika btn-pocika-primary w-100 mb-3"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Security / Admin notice */}
        <div className="border-top pt-3 mt-3 text-center">
          <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>
            Authorized personnel only. Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

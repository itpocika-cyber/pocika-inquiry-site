import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close drawer and dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open to prevent background scroll-through
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to={isAdmin ? "/admin-dashboard" : "/dashboard"} className="app-logo">
            <img src="/assets/logo/pocika-logo.png" alt="POCIKA Fire & Safety Products LLP" />
            <span className="app-logo-text">POCIKA</span>
          </Link>

          <nav className="main-nav" aria-label="Primary">
            {isAdmin ? (
              <>
                <Link
                  to="/admin-dashboard"
                  className={`main-nav-link ${location.pathname === '/admin-dashboard' ? 'is-active' : ''}`}
                >
                  Admin Dashboard
                </Link>
                <Link
                  to="/admin/team"
                  className={`main-nav-link ${location.pathname.startsWith('/admin/team') ? 'is-active' : ''}`}
                >
                  Manage Sales Team
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={`main-nav-link ${location.pathname === '/dashboard' || location.pathname === '/' ? 'is-active' : ''}`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/inquiries"
                  className={`main-nav-link ${location.pathname === '/inquiries' ? 'is-active' : ''}`}
                >
                  My Inquiries
                </Link>
              </>
            )}
          </nav>

          <div className="app-header-actions">
            {!isAdmin && (
              <Link
                to="/inquiry"
                className="btn-pocika btn-pocika-primary btn-sm d-none d-sm-inline-flex align-items-center gap-1"
                style={{ textDecoration: 'none' }}
              >
                + New Inquiry
              </Link>
            )}

            {user && (
              <div className="dropdown position-relative">
                <div
                  className="app-user-chip dropdown-toggle"
                  role="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                >
                  <span className="app-user-avatar">{getInitials(user.displayName || user.email)}</span>
                  <span className="d-none d-sm-inline">{user.displayName || user.email.split('@')[0]}</span>
                </div>

                {dropdownOpen && (
                  <ul
                    className="dropdown-menu dropdown-menu-end shadow-sm border-0 show"
                    style={{
                      borderRadius: '12px',
                      marginTop: '8px',
                      display: 'block',
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      zIndex: 1050
                    }}
                  >
                    <li className="px-3 py-2 border-bottom">
                      <div className="fw-semibold small">{user.displayName || 'User'}</div>
                      <div className="text-muted small">{user.email}</div>
                      <div className="badge bg-secondary text-capitalize mt-1" style={{ fontSize: '0.7rem' }}>
                        {user.role?.replace('_', ' ')}
                      </div>
                    </li>
                    <li>
                      <button
                        className="dropdown-item py-2 text-danger fw-medium"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}

            {/* Hamburger Toggle Button for Mobile */}
            <button
              className="nav-toggle"
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-In Mobile Navigation Drawer */}
      <aside
        className={`mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-label="Mobile Navigation"
      >
        <div className="mobile-drawer-header">
          <div className="d-flex align-items-center gap-2">
            <img src="/assets/logo/pocika-logo.png" alt="POCIKA" style={{ height: '30px', width: 'auto' }} />
            <span className="fw-bold" style={{ color: '#0B1F33', fontSize: '1.05rem', letterSpacing: '0.5px' }}>POCIKA</span>
          </div>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {user && (
          <div className="mobile-drawer-user">
            <div className="app-user-avatar">{getInitials(user.displayName || user.email)}</div>
            <div className="mobile-drawer-user-info">
              <div className="fw-semibold text-truncate">{user.displayName || 'User'}</div>
              <div className="text-muted small text-truncate">{user.email}</div>
              <span className="badge bg-secondary text-capitalize mt-1" style={{ fontSize: '0.65rem' }}>
                {user.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}

        <nav className="mobile-drawer-body" aria-label="Mobile Links">
          {isAdmin ? (
            <>
              <Link
                to="/admin-dashboard"
                className={`mobile-nav-link ${location.pathname === '/admin-dashboard' ? 'is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Admin Dashboard
              </Link>
              <Link
                to="/admin/team"
                className={`mobile-nav-link ${location.pathname.startsWith('/admin/team') ? 'is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Manage Sales Team
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className={`mobile-nav-link ${location.pathname === '/dashboard' || location.pathname === '/' ? 'is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/inquiries"
                className={`mobile-nav-link ${location.pathname === '/inquiries' ? 'is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                My Inquiries
              </Link>
              <Link
                to="/inquiry"
                className={`mobile-nav-link fw-semibold text-primary ${location.pathname === '/inquiry' ? 'is-active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                + New Inquiry
              </Link>
            </>
          )}
        </nav>

        <div className="mobile-drawer-footer">
          <button
            className="btn-pocika btn-pocika-danger-ghost w-100"
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

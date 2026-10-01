import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Book, Bell, LogOut, List } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { announcementApi } from '../api/announcementApi';

export default function AdminLayout({ children, title = 'Admin Dashboard', headerActions = null }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Announcement State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    setPostingAnnouncement(true);
    try {
      await announcementApi.createAnnouncement({
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        priority: announcementPriority
      });
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      alert('Announcement broadcasted to sales team!');
    } catch (err) {
      alert(`Failed to post announcement: ${err.message}`);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="admin-layout__backdrop d-lg-none"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

              {/* Sidebar */}
        <nav className={`admin-layout__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="admin-layout__sidebar-header">
            <Link to="/admin-dashboard" className="admin-brand">
              <img src="/assets/logo/pocika-logo.png" alt="POCIKA" className="admin-brand__logo" />
              <div>
                <div className="admin-brand__title">POCIKA</div>
                <div className="admin-brand__subtitle">Administration Portal</div>
              </div>
            </Link>
            <button
              type="button"
              className="btn-close d-lg-none"
              onClick={() => setSidebarOpen(false)}
            ></button>
          </div>

          <div className="admin-nav py-3">
            <Link to="/admin-dashboard" className={`admin-nav-item ${location.pathname === '/admin-dashboard' ? 'active' : ''}`}>
              <LayoutDashboard className="admin-nav-icon" />
              Dashboard
            </Link>
            <Link to="/inquiries" className={`admin-nav-item ${location.pathname === '/inquiries' ? 'active' : ''}`}>
              <List className="admin-nav-icon" />
              All Inquiries
            </Link>
            <Link to="/admin/team" className={`admin-nav-item ${location.pathname.startsWith('/admin/team') ? 'active' : ''}`}>
              <Users className="admin-nav-icon" />
              Manage Sales Team
            </Link>
            <Link to="/admin/catalog" className={`admin-nav-item ${location.pathname.startsWith('/admin/catalog') ? 'active' : ''}`}>
              <Book className="admin-nav-icon" />
              Product Catalog
            </Link>
            <button
              type="button"
              className="admin-nav-item w-100 text-start border-0 bg-transparent mt-2"
              onClick={() => setShowAnnouncementModal(true)}
            >
              <Bell className="admin-nav-icon" />
              Post Announcement
            </button>
          </div>

          {/* Sidebar Footer with current user & logout */}
          <div className="p-3 border-top mt-auto">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div className="d-flex align-items-center">
              <div
                className="rounded-circle bg-light d-flex justify-content-center align-items-center me-2 fw-bold text-primary"
                style={{ width: '36px', height: '36px' }}
              >
                {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="text-truncate" style={{ maxWidth: '130px' }}>
                <div className="fw-bold small text-truncate">{user?.displayName || 'Administrator'}</div>
                <div className="text-muted small text-truncate" style={{ fontSize: '0.7rem' }}>{user?.email}</div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline-danger w-100 btn-sm d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="admin-layout__main">
        {/* Top Header */}
        <header className="admin-layout__header">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-light btn-sm d-lg-none me-3"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="h5 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>
              {title}
            </h1>
          </div>
          {headerActions && (
            <div className="d-flex align-items-center gap-2">
              {headerActions}
            </div>
          )}
        </header>

        {/* Dynamic Content */}
        <div className="p-3 p-md-4">
          {children}
        </div>
      </main>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }}></div>
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1055 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <form onSubmit={handlePostAnnouncement}>
                  <div className="modal-header border-bottom-0 pb-0">
                    <h5 className="modal-title fw-bold">Broadcast Announcement</h5>
                    <button type="button" className="btn-close" onClick={() => setShowAnnouncementModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. New Pricing Update"
                        value={announcementTitle}
                        onChange={e => setAnnouncementTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Priority</label>
                      <select
                        className="form-select"
                        value={announcementPriority}
                        onChange={e => setAnnouncementPriority(e.target.value)}
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High Priority</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Message</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        placeholder="Write your message here..."
                        value={announcementMessage}
                        onChange={e => setAnnouncementMessage(e.target.value)}
                        required
                      ></textarea>
                      <div className="form-text">This will be pushed to all sales team members.</div>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0 pt-0">
                    <button type="button" className="btn btn-light" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={postingAnnouncement}>
                      {postingAnnouncement ? 'Posting...' : 'Broadcast Now'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

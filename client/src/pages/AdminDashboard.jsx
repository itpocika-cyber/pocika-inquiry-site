import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../api/client';
import { inquiryApi } from '../api/inquiryApi';
import { announcementApi } from '../api/announcementApi';
import { useAuthStore } from '../store/authStore';
import { isNewInquiry, markInquiryAsViewed } from '../utils/notificationTracker';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [viewedTick, setViewedTick] = useState(0);

  useEffect(() => {
    const handleViewedChange = () => setViewedTick((t) => t + 1);
    window.addEventListener('pocika_viewed_changed', handleViewedChange);
    return () => window.removeEventListener('pocika_viewed_changed', handleViewedChange);
  }, []);

  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    hot: 0,
    warm: 0,
    pendingFollowUps: 0,
    quotes: 0,
    renewalsDueSoon: 0,
    staleLeadsCount: 0,
    thisMonth: {
      total: 0,
      hot: 0,
      won: 0,
      lost: 0,
      pending: 0,
      conversionRate: 0
    },
    salesPerformance: []
  });
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [dealStatusFilter, setDealStatusFilter] = useState('');
  const [renewalsOnly, setRenewalsOnly] = useState(false);
  const [staleOnly, setStaleOnly] = useState(false);
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [salespeopleList, setSalespeopleList] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [followUpFilter, setFollowUpFilter] = useState('all');

  // Excel Export State
  const [exportingExcel, setExportingExcel] = useState(false);

  // Manager Review Modal State
  const [reviewInquiry, setReviewInquiry] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Reviewed');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quick Reschedule Follow-up Modal State
  const [rescheduleInquiry, setRescheduleInquiry] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // Announcement Modal State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState('normal');
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Sidebar toggle on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 25, // 25 rows per page per Phase 10 spec
        sort
      });

      if (search.trim()) params.append('search', search.trim());
      if (opportunity) params.append('opportunity', opportunity);
      if (salesperson) params.append('salesPerson', salesperson);
      if (dealStatusFilter) params.append('dealStatus', dealStatusFilter);
      if (renewalsOnly) params.append('renewalsDueInDays', '30');
      if (staleOnly) params.append('isStale', 'true');

      const [sumRes, inqRes, fuRes] = await Promise.all([
        api.get('/inquiries/summary'),
        api.get(`/inquiries?${params.toString()}`),
        api.get('/inquiries?hasFollowUp=true&sortBy=nextFollowUpDate&limit=50')
      ]);

      if (sumRes.data) setSummary(sumRes.data);
      if (inqRes.data) {
        const items = inqRes.data.items || [];
        setInquiries(items);
        setTotalPages(inqRes.data.pagination?.totalPages || 1);
        setTotalCount(inqRes.data.pagination?.totalCount || items.length);
      }
      if (fuRes.data?.items) {
        setFollowUps(fuRes.data.items);
      }
    } catch (err) {
      console.warn('Admin fetch warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalespeople = async () => {
    try {
      const res = await api.get('/users?role=sales_person');
      if (res.data?.users) {
        const list = res.data.users.map(u => u.displayName || u.email).filter(Boolean);
        setSalespeopleList(list);
      }
    } catch (err) {
      console.warn('Failed to load salespeople list:', err.message);
    }
  };

  useEffect(() => {
    fetchSalespeople();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [currentPage, opportunity, salesperson, dealStatusFilter, renewalsOnly, staleOnly, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchDashboardData();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClear = () => {
    setSearch('');
    setOpportunity('');
    setSalesperson('');
    setDealStatusFilter('');
    setRenewalsOnly(false);
    setStaleOnly(false);
    setSort('newest');
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    Boolean(search.trim()),
    Boolean(opportunity),
    Boolean(salesperson),
    Boolean(dealStatusFilter),
    renewalsOnly,
    staleOnly,
    sort !== 'newest'
  ].filter(Boolean).length;
  const hasActiveFilters = activeFiltersCount > 0;

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (opportunity) params.opportunity = opportunity;
      if (salesperson) params.salesPerson = salesperson;
      if (dealStatusFilter) params.dealStatus = dealStatusFilter;
      if (renewalsOnly) params.renewalsDueInDays = 30;
      if (staleOnly) params.isStale = 'true';

      const response = await inquiryApi.exportExcel(params);
      const blob = response instanceof Blob ? response : new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `POCIKA_Inquiries_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(`Excel export failed: ${err.message}`);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleOpenReview = (inq) => {
    setReviewInquiry(inq);
    setReviewStatus(inq.managerReview?.status || 'Approved');
    setReviewRemarks(inq.managerReview?.remarks || '');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewInquiry) return;
    setSubmittingReview(true);

    try {
      await api.patch(`/inquiries/${reviewInquiry._id || reviewInquiry.inquiryNumber}`, {
        managerReview: {
          status: reviewStatus,
          remarks: reviewRemarks
        }
      });
      setReviewInquiry(null);
      fetchDashboardData();
    } catch (err) {
      alert(`Review submission failed: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenReschedule = (inq) => {
    setRescheduleInquiry(inq);
    setRescheduleDate(inq.followUp?.followUpDate || '');
    setRescheduleNote(inq.followUp?.nextActionCommitment || inq.remarks || '');
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleInquiry) return;
    setSavingReschedule(true);

    try {
      await api.patch(`/inquiries/${rescheduleInquiry._id || rescheduleInquiry.inquiryNumber}`, {
        'followUp.followUpDate': rescheduleDate,
        'followUp.nextActionCommitment': rescheduleNote
      });
      setRescheduleInquiry(null);
      fetchDashboardData();
    } catch (err) {
      alert(`Failed to reschedule follow-up: ${err.message}`);
    } finally {
      setSavingReschedule(false);
    }
  };

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

  const getOppBadge = (opp) => {
    switch (opp) {
      case 'HOT': return 'badge-hot';
      case 'WARM': return 'badge-warm';
      case 'COLD': return 'badge-cold';
      case 'FUTURE POTENTIAL': return 'badge-future-potential';
      case 'DEALER DEVELOPMENT': return 'badge-dealer-development';
      case 'NO REQUIREMENT': return 'badge-no-requirement';
      default: return 'badge-secondary';
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const overdueFollowUps = followUps.filter(
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate < today && x.followUp?.dealStatus !== 'Won' && x.followUp?.dealStatus !== 'Lost'
  );
  const todayFollowUps = followUps.filter((x) => x.followUp?.followUpDate === today);
  const weekFollowUps = followUps.filter(
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate >= today && x.followUp.followUpDate <= weekAhead
  );

  let displayedFollowUps = followUps;
  if (followUpFilter === 'overdue') displayedFollowUps = overdueFollowUps;
  else if (followUpFilter === 'today') displayedFollowUps = todayFollowUps;
  else if (followUpFilter === 'this_week') displayedFollowUps = weekFollowUps;

  // Top 3 performers for quick widget
  const topPerformers = (summary.salesPerformance || []).slice(0, 3);

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
          <Link to="/admin-dashboard" className="admin-nav-item active">
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
          <Link to="/admin/team" className="admin-nav-item">
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Manage Sales Team
          </Link>
          <Link to="/admin/catalog" className="admin-nav-item">
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Product Catalog
          </Link>
          <button
            type="button"
            className="admin-nav-item w-100 text-start border-0 bg-transparent"
            onClick={() => setShowAnnouncementModal(true)}
          >
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Post Announcement
          </button>
        </div>

        {/* Sidebar Footer with current user & logout */}
        <div className="p-3 border-top mt-auto d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div
              className="rounded-circle bg-light d-flex justify-content-center align-items-center me-2 fw-bold text-primary"
              style={{ width: '36px', height: '36px' }}
            >
              {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="text-truncate" style={{ maxWidth: '130px' }}>
              <div className="fw-bold small text-truncate">{user?.displayName || 'Administrator'}</div>
              <div className="text-muted small text-truncate">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            title="Logout"
            onClick={handleLogout}
          >
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
              Admin Dashboard
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              disabled={exportingExcel}
              onClick={handleExportExcel}
              title="Download filtered inquiries as Excel spreadsheet"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>
                {exportingExcel ? (
                  'Exporting...'
                ) : (
                  <>
                    <span className="d-none d-sm-inline">Export to Excel (.xlsx)</span>
                    <span className="d-sm-none">Excel</span>
                  </>
                )}
              </span>
            </button>
            <Link to="/admin/team" className="btn btn-sm btn-pocika-secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="d-none d-sm-inline">Manage Team</span>
              <span className="d-sm-none">Team</span>
            </Link>
          </div>
        </header>

        <div className="admin-layout__content p-3 p-md-4 flex-grow-1">
          {/* Top KPI Row - Modern SaaS Elevation */}
          <div className="row g-3 mb-4">
            {/* Total Inquiries */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--primary">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">Total Inquiries</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value">{summary.total || 0}</div>
                  <div className="admin-kpi-card__subtext">All inquiries recorded</div>
                </div>
              </div>
            </div>

            {/* Today's Visits */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--indigo">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">Today's Visits</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value" style={{ color: '#4F46E5' }}>{summary.today || 0}</div>
                  <div className="admin-kpi-card__subtext">Visits done today</div>
                </div>
              </div>
            </div>

            {/* HOT Leads */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--danger">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">HOT Leads</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value text-danger">{summary.hot || 0}</div>
                  <div className="admin-kpi-card__subtext">Immediate follow-up</div>
                </div>
              </div>
            </div>

            {/* Won This Month */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--success">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">Won (Month)</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value text-success">{summary.thisMonth?.won || 0}</div>
                  <div className="admin-kpi-card__subtext">Deals closed this month</div>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--info">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">Win Rate</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#F0F9FF', color: '#0284C7' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value" style={{ color: '#0284C7' }}>
                    {summary.thisMonth?.conversionRate || 0}%
                  </div>
                  <div className="admin-kpi-card__subtext">Monthly conversion</div>
                </div>
              </div>
            </div>

            {/* Pending Follow-ups */}
            <div className="col-6 col-md-4 col-xl-2">
              <div className="admin-kpi-card admin-kpi-card--warning">
                <div className="admin-kpi-card__header">
                  <span className="admin-kpi-card__label">Follow-ups</span>
                  <div className="admin-kpi-card__icon-box" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="admin-kpi-card__value" style={{ color: '#D97706' }}>
                    {summary.pendingFollowUps || 0}
                  </div>
                  <div className="admin-kpi-card__subtext">Pending commitments</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Layout: Left = All Inquiries, Right = Reminders & Widgets */}
          <div className="row g-4">
            {/* Left Column: All Inquiries & Filters (70% width on large screens) */}
            <div className="col-12 col-xl-8">
              {/* Filter Bar */}
              <div className="admin-filter-bar mb-3">
                {/* Tier 1: Search Bar + Reset Filters Action */}
                <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center justify-content-between mb-3 pb-3 border-bottom">
                  <div className="position-relative flex-grow-1">
                    <svg
                      className="position-absolute text-muted"
                      style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      type="text"
                      className="form-control-pocika"
                      style={{ paddingLeft: '2.4rem', paddingRight: search ? '2.2rem' : undefined }}
                      placeholder="Search inquiry no, customer name, location, product..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        type="button"
                        className="btn btn-sm position-absolute border-0 text-muted p-0 d-flex align-items-center justify-content-center"
                        style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', width: '22px', height: '22px', background: 'transparent' }}
                        onClick={() => setSearch('')}
                        title="Clear search text"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`btn-pocika btn-pocika-secondary text-nowrap px-3 ${!hasActiveFilters ? 'opacity-75' : ''}`}
                    onClick={handleClear}
                    title="Reset all filters"
                    style={{ height: '40px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span>Reset Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="badge rounded-pill bg-danger text-white ms-1" style={{ fontSize: '0.7rem' }}>
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Tier 2: 4 Evenly Spaced Dropdowns */}
                <div className="row g-2">
                  <div className="col-6 col-md-3">
                    <label className="filter-label">Salesperson</label>
                    <select
                      className="form-control-pocika"
                      value={salesperson}
                      onChange={(e) => {
                        setSalesperson(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Salespeople</option>
                      {salespeopleList.map((sp) => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="filter-label">Deal Status</label>
                    <select
                      className="form-control-pocika"
                      value={dealStatusFilter}
                      onChange={(e) => {
                        setDealStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="filter-label">Opportunity</label>
                    <select
                      className="form-control-pocika"
                      value={opportunity}
                      onChange={(e) => {
                        setOpportunity(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Opportunities</option>
                      <option value="HOT">HOT</option>
                      <option value="WARM">WARM</option>
                      <option value="COLD">COLD</option>
                      <option value="FUTURE POTENTIAL">FUTURE POTENTIAL</option>
                      <option value="DEALER DEVELOPMENT">DEALER DEVELOPMENT</option>
                      <option value="NO REQUIREMENT">NO REQUIREMENT</option>
                    </select>
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="filter-label">Sort</label>
                    <select
                      className="form-control-pocika"
                      value={sort}
                      onChange={(e) => {
                        setSort(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="followup">Follow-up Date</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inquiries Table Card with Horizontal Slider */}
              <div className="card-pocika p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                      All Inquiries
                    </h2>
                    <span className="badge rounded-pill text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                      {totalCount}
                    </span>
                    {(renewalsOnly || staleOnly) && (
                      <span className="badge bg-warning text-dark small">
                        Filtered: {renewalsOnly ? 'Renewals Due' : ''} {staleOnly ? 'Stale Leads' : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-muted small">
                    25 records per page
                  </span>
                </div>

                {loading ? (
                  <LoadingSpinner message="Loading inquiries for review..." />
                ) : inquiries.length === 0 ? (
                  <EmptyState
                    title="No inquiries found"
                    description="No inquiries match your current filter criteria."
                    actionLabel="Reset Filters"
                    onAction={handleClear}
                  />
                ) : (
                  <>
                    {/* Desktop Table View with Horizontal Slider */}
                    <div
                      className="d-none d-lg-block table-slider-container"
                      style={{ maxHeight: '68vh' }}
                    >
                      <table className="table-pocika-data">
                        <thead>
                          <tr>
                            <th>Inquiry No.</th>
                            <th>Date</th>
                            <th>Company</th>
                            <th>Salesperson</th>
                            <th>Opportunity</th>
                            <th>Deal Status</th>
                            <th>Review</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inquiries.map((inq) => {
                            const unviewed = isNewInquiry(inq);
                            return (
                              <tr
                                key={inq._id || inq.inquiryNumber}
                                style={unviewed ? { backgroundColor: 'rgba(197, 34, 31, 0.04)' } : {}}
                              >
                                <td className="fw-semibold">
                                  <Link
                                    to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                    className="text-decoration-none fw-semibold d-inline-flex align-items-center gap-1"
                                    style={{ color: 'var(--color-navy)' }}
                                    onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
                                  >
                                    {inq.inquiryNumber}
                                    {unviewed && (
                                      <span
                                        className="badge text-white rounded-pill ms-1"
                                        style={{ fontSize: '0.60rem', padding: '2px 6px', letterSpacing: '0.4px', backgroundColor: 'var(--color-primary)' }}
                                        title="New unviewed inquiry"
                                      >
                                        ● NEW
                                      </span>
                                    )}
                                  </Link>
                                </td>
                                <td>{formatDate(inq.date)}</td>
                                <td className="fw-medium text-truncate" style={{ maxWidth: '200px' }}>
                                  {inq.customer?.companyName || 'Unknown'}
                                </td>
                                <td>
                                  <span className="badge bg-light text-dark border">
                                    {inq.salesPerson || '-'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                                    {inq.visit?.opportunity || '-'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      inq.followUp?.dealStatus === 'Won'
                                        ? 'bg-success'
                                        : inq.followUp?.dealStatus === 'Lost'
                                        ? 'bg-danger'
                                        : 'bg-warning text-dark'
                                    }`}
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    {inq.followUp?.dealStatus || 'Pending'}
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`badge ${
                                      inq.managerReview?.status === 'Approved'
                                        ? 'bg-success'
                                        : inq.managerReview?.status === 'Rejected'
                                        ? 'bg-danger'
                                        : inq.managerReview?.status === 'Needs Follow-up'
                                        ? 'bg-warning text-dark'
                                        : inq.managerReview?.status === 'Reviewed'
                                        ? 'bg-info text-dark'
                                        : 'bg-secondary'
                                    }`}
                                    style={{ fontSize: '0.72rem' }}
                                  >
                                    {inq.managerReview?.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <div className="table-actions">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => handleOpenReview(inq)}
                                      title="Review this inquiry"
                                    >
                                      Review
                                    </button>
                                    <Link
                                      to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                      className="btn btn-sm btn-pocika-secondary"
                                      onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
                                    >
                                      View
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="d-lg-none d-flex flex-column gap-3">
                      {inquiries.map((inq) => (
                        <div key={inq._id || inq.inquiryNumber} className="border rounded-3 p-3 bg-white shadow-sm">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="fw-bold">{inq.inquiryNumber}</span>
                            <div className="d-flex gap-1">
                              <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                                {inq.visit?.opportunity}
                              </span>
                              <span
                                className={`badge ${
                                  inq.followUp?.dealStatus === 'Won'
                                    ? 'bg-success'
                                    : inq.followUp?.dealStatus === 'Lost'
                                    ? 'bg-danger'
                                    : 'bg-warning text-dark'
                                }`}
                                style={{ fontSize: '0.68rem' }}
                              >
                                {inq.followUp?.dealStatus || 'Pending'}
                              </span>
                            </div>
                          </div>
                          <div className="fw-semibold">{inq.customer?.companyName}</div>
                          <div className="text-muted small mb-2">
                            Sales: {inq.salesPerson || '-'} · {formatDate(inq.date)}
                          </div>
                          <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                            <span className="badge bg-secondary" style={{ fontSize: '0.72rem' }}>
                              {inq.managerReview?.status || 'Pending Review'}
                            </span>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn-pocika btn-pocika-ghost btn-sm py-1 px-2"
                                onClick={() => handleOpenReview(inq)}
                              >
                                Review
                              </button>
                              <Link
                                to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                className="btn-pocika btn-pocika-secondary btn-sm py-1 px-2"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-pocika btn-pocika-secondary btn-sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          &larr; Previous 25
                        </button>
                        <span className="text-muted small">
                          Page {currentPage} of {totalPages} ({totalCount} total)
                        </span>
                        <button
                          type="button"
                          className="btn-pocika btn-pocika-secondary btn-sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next 25 &rarr;
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Follow-ups, Renewals, Stale Leads & Top Performers (30% width) */}
            <div className="col-12 col-xl-4">
              {/* Team Follow-ups & Reminders Card */}
              <div className="card-pocika p-3 p-md-4 mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-2 mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <h2 className="text-field-label m-0" style={{ fontSize: '1.05rem' }}>
                      Team Follow-ups
                    </h2>
                    <span className="badge bg-primary rounded-pill small">
                      {followUps.length}
                    </span>
                  </div>

                  {/* Filter Pills */}
                  <div className="d-flex flex-wrap gap-1">
                    {[
                      { key: 'all', label: 'All', count: followUps.length },
                      { key: 'overdue', label: 'Overdue', count: overdueFollowUps.length, badgeCls: 'bg-danger text-white' },
                      { key: 'today', label: 'Today', count: todayFollowUps.length, badgeCls: 'bg-warning text-dark' },
                      { key: 'this_week', label: '7d', count: weekFollowUps.length }
                    ].map((pill) => (
                      <button
                        key={pill.key}
                        type="button"
                        className={`btn btn-sm py-0 px-2 d-inline-flex align-items-center gap-1 ${
                          followUpFilter === pill.key
                            ? 'btn-primary'
                            : 'btn-outline-secondary'
                        }`}
                        style={{ fontSize: '0.72rem', borderRadius: '12px' }}
                        onClick={() => setFollowUpFilter(pill.key)}
                      >
                        <span>{pill.label}</span>
                        {pill.count > 0 && (
                          <span
                            className={`badge ${
                              followUpFilter === pill.key
                                ? 'bg-white text-primary'
                                : pill.badgeCls || 'bg-light text-secondary border'
                            }`}
                            style={{ fontSize: '0.65rem', padding: '1px 4px' }}
                          >
                            {pill.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {displayedFollowUps.length === 0 ? (
                  <div className="text-muted small py-3 text-center">
                    No {followUpFilter !== 'all' ? followUpFilter.replace('_', ' ') : ''} follow-ups scheduled.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {displayedFollowUps.slice(0, 10).map((inq) => {
                      const isOverdue = inq.followUp?.followUpDate && inq.followUp.followUpDate < today && inq.followUp?.dealStatus !== 'Won' && inq.followUp?.dealStatus !== 'Lost';
                      const isToday = inq.followUp?.followUpDate === today;

                      return (
                        <div key={inq._id || inq.inquiryNumber} className="border-bottom pb-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <Link
                              to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                              className="fw-semibold small text-primary text-decoration-none text-truncate"
                              style={{ maxWidth: '170px' }}
                            >
                              {inq.customer?.companyName || inq.inquiryNumber}
                            </Link>
                            {isOverdue ? (
                              <span className="badge bg-danger text-white" style={{ fontSize: '0.68rem' }}>
                                Overdue ({formatDate(inq.followUp?.followUpDate)})
                              </span>
                            ) : isToday ? (
                              <span className="badge bg-warning text-dark" style={{ fontSize: '0.68rem' }}>
                                Today
                              </span>
                            ) : (
                              <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem' }}>
                                {formatDate(inq.followUp?.followUpDate)}
                              </span>
                            )}
                          </div>
                          <div className="text-muted small d-flex justify-content-between align-items-center">
                            <span>
                              {inq.salesPerson || 'Sales'} · {inq.followUp?.nextActionCommitment || inq.followUp?.nextAction || 'Follow-up'}
                            </span>
                            <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              {inq.visit?.opportunity || '-'}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary py-0 px-2"
                              style={{ fontSize: '0.72rem' }}
                              onClick={() => handleOpenReschedule(inq)}
                              title="Quickly change follow-up date without leaving"
                            >
                              ⚡ Reschedule
                            </button>
                            <Link
                              to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                              className="text-primary small text-decoration-none fw-medium"
                              style={{ fontSize: '0.75rem' }}
                            >
                              View Details &rarr;
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actionable Alert 1: Renewals Due Soon (Next 30 Days) */}
              <div
                className={`card-pocika p-3 mb-3 d-flex justify-content-between align-items-center ${
                  renewalsOnly ? 'border-primary shadow-sm' : ''
                }`}
                style={{ cursor: 'pointer', background: renewalsOnly ? 'var(--color-primary-soft)' : 'var(--color-white)' }}
                onClick={() => {
                  setRenewalsOnly(!renewalsOnly);
                  setCurrentPage(1);
                }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">📅</span>
                    <span className="fw-bold small" style={{ color: 'var(--color-navy)' }}>
                      Renewals Due Soon (30 Days)
                    </span>
                  </div>
                  <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                    AMC & refilling expiries needing outreach
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary rounded-pill">
                    {summary.renewalsDueSoon || 0}
                  </span>
                  <span className="btn btn-sm btn-outline-primary py-0 px-2" style={{ fontSize: '0.7rem' }}>
                    {renewalsOnly ? 'Active' : 'Filter'}
                  </span>
                </div>
              </div>

              {/* Actionable Alert 2: Needs Attention / Stale Leads */}
              <div
                className={`card-pocika p-3 mb-4 d-flex justify-content-between align-items-center ${
                  staleOnly ? 'border-danger shadow-sm' : ''
                }`}
                style={{ cursor: 'pointer', background: staleOnly ? 'var(--color-danger-soft)' : 'var(--color-white)' }}
                onClick={() => {
                  setStaleOnly(!staleOnly);
                  setCurrentPage(1);
                }}
              >
                <div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">⚠️</span>
                    <span className="fw-bold small text-danger">
                      Needs Attention / Stale Leads
                    </span>
                  </div>
                  <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                    Overdue follow-ups with no recent visits
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-danger rounded-pill">
                    {summary.staleLeadsCount || 0}
                  </span>
                  <span className="btn btn-sm btn-outline-danger py-0 px-2" style={{ fontSize: '0.7rem' }}>
                    {staleOnly ? 'Active' : 'Filter'}
                  </span>
                </div>
              </div>

              {/* Top Sales Performers Widget (Podium view with link to full Manage Team) */}
              {topPerformers.length > 0 && (
                <div className="card-pocika p-3">
                  <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                    <h2 className="text-field-label m-0" style={{ fontSize: '0.95rem' }}>
                      🏆 Top Performers (This Month)
                    </h2>
                    <Link to="/admin/team" className="text-primary small text-decoration-none">
                      Full Leaderboard &rarr;
                    </Link>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {topPerformers.map((sp, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-light">
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: '1.1rem' }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                          </span>
                          <div>
                            <div className="fw-semibold small">{sp.name}</div>
                            <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              {sp.totalThisMonth} Visits · {sp.hotLeads} Hot
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-success text-white" style={{ fontSize: '0.7rem' }}>
                            {sp.wonDeals} Won
                          </span>
                          <div className="text-primary fw-bold small" style={{ fontSize: '0.75rem' }}>
                            {sp.conversionRate}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Quick Reschedule Follow-up Modal */}
      {rescheduleInquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">
                  Reschedule Follow-up
                </h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRescheduleInquiry(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveReschedule}>
                <div className="modal-body p-4">
                  <div className="mb-2 text-muted small">
                    Inquiry: <strong>{rescheduleInquiry.inquiryNumber}</strong> · {rescheduleInquiry.customer?.companyName}
                  </div>
                  <div className="mb-3">
                    <label className="field-label">New Follow-up Date *</label>
                    <input
                      type="date"
                      className="form-control-pocika"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="field-label">Next Action / Short Note</label>
                    <textarea
                      className="form-control-pocika"
                      rows="2"
                      placeholder="e.g. Called client; requested quotation revision next Tuesday..."
                      value={rescheduleNote}
                      onChange={(e) => setRescheduleNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-secondary btn-sm"
                    onClick={() => setRescheduleInquiry(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary btn-sm"
                    disabled={savingReschedule}
                  >
                    {savingReschedule ? 'Saving...' : 'Update Follow-up'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewInquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">Review Inquiry: {reviewInquiry.inquiryNumber}</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReviewInquiry(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveReview}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="field-label">Review Status</label>
                    <select
                      className="form-control-pocika"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                    >
                      <option value="Reviewed">Reviewed</option>
                      <option value="Needs Follow-up">Needs Follow-up</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="field-label">Internal Remarks (Manager Only)</label>
                    <textarea
                      className="form-control-pocika"
                      rows="3"
                      placeholder="Notes for sales team or audit (excluded from PDF)..."
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-secondary"
                    onClick={() => setReviewInquiry(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={submittingReview}
                  >
                    {submittingReview ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">Broadcast Announcement to Team</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAnnouncementModal(false)}
                ></button>
              </div>
              <form onSubmit={handlePostAnnouncement}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="field-label">Announcement Title</label>
                    <input
                      type="text"
                      className="form-control-pocika"
                      placeholder="e.g. Special Discount on Fire Alarm Systems this week"
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="field-label">Priority</label>
                    <select
                      className="form-control-pocika"
                      value={announcementPriority}
                      onChange={(e) => setAnnouncementPriority(e.target.value)}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent / High Priority</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="field-label">Message / Details</label>
                    <textarea
                      className="form-control-pocika"
                      rows="3"
                      placeholder="Enter announcement text shown to sales team upon logging in..."
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-secondary"
                    onClick={() => setShowAnnouncementModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={postingAnnouncement}
                  >
                    {postingAnnouncement ? 'Broadcasting...' : 'Broadcast Announcement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

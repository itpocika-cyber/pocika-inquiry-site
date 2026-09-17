import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    hot: 0,
    warm: 0,
    pendingFollowUps: 0,
    quotes: 0
  });
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [salespeopleList, setSalespeopleList] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [followUpFilter, setFollowUpFilter] = useState('all');

  // Manager Review Modal State
  const [reviewInquiry, setReviewInquiry] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Reviewed');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Sidebar toggle on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        sort
      });

      if (search.trim()) params.append('search', search.trim());
      if (opportunity) params.append('opportunity', opportunity);
      if (salesperson) params.append('salesPerson', salesperson);

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
  }, [currentPage, opportunity, salesperson, sort]);

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
    setSort('newest');
    setCurrentPage(1);
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
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate < today && x.status !== 'Won' && x.status !== 'Lost'
  );
  const todayFollowUps = followUps.filter((x) => x.followUp?.followUpDate === today);
  const weekFollowUps = followUps.filter(
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate >= today && x.followUp.followUpDate <= weekAhead
  );

  let displayedFollowUps = followUps;
  if (followUpFilter === 'overdue') displayedFollowUps = overdueFollowUps;
  else if (followUpFilter === 'today') displayedFollowUps = todayFollowUps;
  else if (followUpFilter === 'this_week') displayedFollowUps = weekFollowUps;

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
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <div className="h4 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>POCIKA</div>
            <div className="text-muted small">Administration Portal</div>
          </div>
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
        <header className="admin-layout__header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-light d-lg-none me-3"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="h4 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>
              Admin Dashboard
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link to="/admin/team" className="btn-pocika btn-pocika-secondary btn-sm d-inline-flex align-items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Manage Sales Team
            </Link>
          </div>
        </header>

        <div className="admin-layout__content p-3 p-md-4 flex-grow-1">
          {/* KPI Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center">
                <div className="text-helper small mb-1">Total Inquiries</div>
                <div className="fs-3 fw-bold" style={{ color: 'var(--color-navy)' }}>{summary.total || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center">
                <div className="text-helper small mb-1">Today's Visits</div>
                <div className="fs-3 fw-bold text-primary">{summary.today || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center border-bottom border-3 border-danger">
                <div className="text-helper small mb-1">HOT Opps</div>
                <div className="fs-3 fw-bold text-danger">{summary.hot || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center border-bottom border-3 border-warning">
                <div className="text-helper small mb-1">WARM Opps</div>
                <div className="fs-3 fw-bold text-warning">{summary.warm || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center">
                <div className="text-helper small mb-1">Pending Follow-ups</div>
                <div className="fs-3 fw-bold text-secondary">{summary.pendingFollowUps || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-4 col-xl-2">
              <div className="card-pocika p-3 text-center">
                <div className="text-helper small mb-1">Quote Required</div>
                <div className="fs-3 fw-bold text-info">{summary.quotes || 0}</div>
              </div>
            </div>
          </div>

          {/* Team Follow-ups & Reminders Card */}
          <div className="card-pocika p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                  Team Follow-ups & Reminders
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
                  { key: 'this_week', label: 'Next 7 Days', count: weekFollowUps.length }
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    className={`btn btn-sm py-1 px-3 d-inline-flex align-items-center gap-1 ${
                      followUpFilter === pill.key
                        ? 'btn-primary'
                        : 'btn-outline-secondary'
                    }`}
                    style={{ fontSize: '0.8rem', borderRadius: '16px' }}
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
                        style={{ fontSize: '0.7rem', padding: '1px 6px' }}
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
                No {followUpFilter !== 'all' ? followUpFilter.replace('_', ' ') : ''} follow-ups scheduled across the team.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Inquiry No.</th>
                      <th>Company</th>
                      <th>Salesperson</th>
                      <th>Follow-up Date</th>
                      <th>Opportunity</th>
                      <th>Next Action</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFollowUps.slice(0, 6).map((inq) => {
                      const isOverdue = inq.followUp?.followUpDate && inq.followUp.followUpDate < today && inq.status !== 'Won' && inq.status !== 'Lost';
                      const isToday = inq.followUp?.followUpDate === today;

                      return (
                        <tr key={inq._id || inq.inquiryNumber}>
                          <td className="fw-semibold">
                            <Link to={`/inquiries/${inq.inquiryNumber || inq._id}`} className="text-primary text-decoration-none">
                              {inq.inquiryNumber}
                            </Link>
                          </td>
                          <td className="fw-medium">{inq.customer?.companyName || 'Unknown'}</td>
                          <td>
                            <span className="badge bg-light text-dark border">
                              {inq.salesPerson || '-'}
                            </span>
                          </td>
                          <td>
                            {isOverdue ? (
                              <span className="badge bg-danger text-white">
                                Overdue ({formatDate(inq.followUp?.followUpDate)})
                              </span>
                            ) : isToday ? (
                              <span className="badge bg-warning text-dark">
                                Today
                              </span>
                            ) : (
                              <span className="badge bg-light text-dark border">
                                {formatDate(inq.followUp?.followUpDate)}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                              {inq.visit?.opportunity || '-'}
                            </span>
                          </td>
                          <td className="small text-muted">
                            {Array.isArray(inq.followUp?.nextAction) ? inq.followUp.nextAction.join(', ') : inq.followUp?.nextAction || 'Follow-up'}
                          </td>
                          <td className="text-end">
                            <Link
                              to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                              className="btn-pocika btn-pocika-ghost btn-sm"
                            >
                              View &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="card-pocika p-3 mb-4">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="field-label mb-1">Search Inquiries</label>
                <input
                  type="text"
                  className="form-control-pocika"
                  placeholder="Inquiry no, customer, location, product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="field-label mb-1">Opportunity</label>
                <select
                  className="form-control-pocika"
                  value={opportunity}
                  onChange={(e) => {
                    setOpportunity(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All</option>
                  <option value="HOT">HOT</option>
                  <option value="WARM">WARM</option>
                  <option value="COLD">COLD</option>
                  <option value="FUTURE POTENTIAL">FUTURE POTENTIAL</option>
                  <option value="DEALER DEVELOPMENT">DEALER DEVELOPMENT</option>
                  <option value="NO REQUIREMENT">NO REQUIREMENT</option>
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="field-label mb-1">Salesperson</label>
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
              <div className="col-6 col-md-2">
                <label className="field-label mb-1">Sort</label>
                <select
                  className="form-control-pocika"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="followup">Follow-up Date</option>
                </select>
              </div>
              <div className="col-6 col-md-2">
                <button
                  type="button"
                  className="btn-pocika btn-pocika-secondary w-100"
                  onClick={handleClear}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Inquiries Table */}
          <div className="card-pocika p-4">
            <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
              All Inquiries
            </h2>

            {loading ? (
              <LoadingSpinner message="Loading inquiries for administrative review..." />
            ) : inquiries.length === 0 ? (
              <EmptyState
                title="No inquiries found"
                description="No inquiries match your current administrative filter criteria."
                actionLabel="Clear Filters"
                onAction={handleClear}
              />
            ) : (
              <>
                <div className="d-none d-lg-block table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Inquiry No.</th>
                        <th>Date</th>
                        <th>Company</th>
                        <th>Salesperson</th>
                        <th>Opportunity</th>
                        <th>Manager Review</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries.map((inq) => (
                        <tr key={inq._id || inq.inquiryNumber}>
                          <td className="fw-semibold">{inq.inquiryNumber}</td>
                          <td>{formatDate(inq.date)}</td>
                          <td>{inq.customer?.companyName || 'Unknown'}</td>
                          <td>{inq.salesPerson || '-'}</td>
                          <td>
                            <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                              {inq.visit?.opportunity || '-'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                inq.managerReview?.status === 'Approved'
                                  ? 'bg-success'
                                  : inq.managerReview?.status === 'Rejected'
                                  ? 'bg-danger'
                                  : 'bg-secondary'
                              }`}
                            >
                              {inq.managerReview?.status || 'Pending'}
                            </span>
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn-pocika btn-pocika-ghost btn-sm me-1"
                              onClick={() => handleOpenReview(inq)}
                            >
                              Review
                            </button>
                            <Link
                              to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                              className="btn-pocika btn-pocika-secondary btn-sm"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="d-lg-none d-flex flex-column gap-3">
                  {inquiries.map((inq) => (
                    <div key={inq._id || inq.inquiryNumber} className="border rounded-3 p-3 bg-white">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold">{inq.inquiryNumber}</span>
                        <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                          {inq.visit?.opportunity}
                        </span>
                      </div>
                      <div className="fw-semibold">{inq.customer?.companyName}</div>
                      <div className="text-muted small mb-2">
                        Sales: {inq.salesPerson || '-'} · {formatDate(inq.date)}
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                        <span className="badge bg-secondary">
                          {inq.managerReview?.status || 'Pending'}
                        </span>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn-pocika btn-pocika-ghost btn-sm"
                            onClick={() => handleOpenReview(inq)}
                          >
                            Review
                          </button>
                          <Link
                            to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                            className="btn-pocika btn-pocika-secondary btn-sm"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn-pocika btn-pocika-secondary btn-sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span className="text-muted small">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      className="btn-pocika btn-pocika-secondary btn-sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Manager Review Modal */}
      {reviewInquiry && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">
                  Manager Review: {reviewInquiry.inquiryNumber}
                </h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setReviewInquiry(null)}
                ></button>
              </div>
              <form onSubmit={handleSaveReview}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <div className="text-helper mb-1">Company / Customer</div>
                    <div className="fw-semibold">{reviewInquiry.customer?.companyName}</div>
                  </div>
                  <div className="mb-3">
                    <label className="field-label mb-2">Review Status</label>
                    <div className="chip-group">
                      {['Pending', 'Reviewed', 'Approved', 'Rejected'].map((st) => (
                        <label key={st} className="chip-option">
                          <input
                            type="radio"
                            name="revStatus"
                            checked={reviewStatus === st}
                            onChange={() => setReviewStatus(st)}
                          />
                          {st}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="field-label">Manager Remarks / Feedback</label>
                    <textarea
                      className="form-control-pocika"
                      rows="3"
                      value={reviewRemarks}
                      onChange={(e) => setReviewRemarks(e.target.value)}
                      placeholder="Add guidance or notes for salesperson..."
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
                    {submittingReview ? 'Saving...' : 'Submit Review'}
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

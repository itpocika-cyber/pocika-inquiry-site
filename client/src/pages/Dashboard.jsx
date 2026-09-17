import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState({ total: 0, today: 0, hot: 0, pendingFollowUps: 0 });
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    // Check if draft exists
    const draft = localStorage.getItem('pocika_inquiry_draft');
    if (draft) setHasDraft(true);

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [sumRes, inqRes, fuRes] = await Promise.all([
          api.get('/inquiries/summary'),
          api.get('/inquiries?limit=10'),
          api.get('/inquiries?hasFollowUp=true&sortBy=nextFollowUpDate&limit=50')
        ]);

        if (sumRes.data) setSummary(sumRes.data);
        if (inqRes.data?.items) setRecentInquiries(inqRes.data.items.slice(0, 5));
        if (fuRes.data?.items) {
          setAllFollowUps(fuRes.data.items);
        } else if (inqRes.data?.items) {
          // fallback if endpoint returns standard items
          setAllFollowUps(inqRes.data.items.filter(x => x.followUp?.followUpDate));
        }
      } catch (err) {
        console.warn('Dashboard load warning:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

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
      const parts = d.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
      }
      return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const overdueFollowUps = allFollowUps.filter(
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate < today && x.status !== 'Won' && x.status !== 'Lost'
  );
  const todayFollowUps = allFollowUps.filter((x) => x.followUp?.followUpDate === today);
  const weekFollowUps = allFollowUps.filter(
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate >= today && x.followUp.followUpDate <= weekAhead
  );

  let displayedFollowUps = allFollowUps;
  if (followUpFilter === 'overdue') displayedFollowUps = overdueFollowUps;
  else if (followUpFilter === 'today') displayedFollowUps = todayFollowUps;
  else if (followUpFilter === 'this_week') displayedFollowUps = weekFollowUps;

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        {/* Top greeting & Action */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-page-title mb-1">
              Welcome back, {user?.displayName || 'Sales Executive'}
            </h1>
            <p className="text-muted-custom mb-0">
              Here is an overview of your visits and open inquiries.
            </p>
          </div>
          <div>
            <Link to="/inquiry" className="btn-pocika btn-pocika-primary d-inline-flex align-items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Inquiry
            </Link>
          </div>
        </div>

        {/* Draft Notice Banner */}
        {hasDraft && (
          <div className="alert-pocika alert-info mb-4 d-flex justify-content-between align-items-center">
            <div>
              <strong>You have an unsaved draft!</strong> You can continue where you left off.
            </div>
            <Link to="/inquiry" className="btn-pocika btn-pocika-primary btn-sm">
              Resume Draft
            </Link>
          </div>
        )}

        {/* KPI Row */}
        <div className="row g-3 mb-4" id="kpi-container">
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center">
              <div className="text-helper mb-1">Total Inquiries</div>
              <div className="fs-2 fw-bold" style={{ color: 'var(--color-navy)' }}>
                {summary.total || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center">
              <div className="text-helper mb-1">Today's Visits</div>
              <div className="fs-2 fw-bold" style={{ color: 'var(--color-primary)' }}>
                {summary.today || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center">
              <div className="text-helper mb-1">HOT Opps</div>
              <div className="fs-2 fw-bold text-danger">
                {summary.hot || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center">
              <div className="text-helper mb-1">Pending Follow-ups</div>
              <div className="fs-2 fw-bold text-warning">
                {summary.pendingFollowUps || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="row g-4">
          {/* Left: Recent Inquiries */}
          <div className="col-lg-8">
            <div className="card-pocika p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                  Recent Inquiries
                </h2>
                <Link to="/inquiries" className="btn-pocika btn-pocika-ghost btn-sm">
                  View All &rarr;
                </Link>
              </div>

              {loading ? (
                <LoadingSpinner message="Loading recent inquiries..." />
              ) : recentInquiries.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted mb-3">No inquiries recorded yet.</p>
                  <Link to="/inquiry" className="btn-pocika btn-pocika-primary">
                    Create First Inquiry
                  </Link>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="d-none d-md-block table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Inquiry No.</th>
                          <th>Date</th>
                          <th>Company / Client</th>
                          <th>Opportunity</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentInquiries.map((inq) => (
                          <tr key={inq._id || inq.inquiryNumber}>
                            <td className="fw-medium">{inq.inquiryNumber || '-'}</td>
                            <td>{formatDate(inq.date)}</td>
                            <td>{inq.customer?.companyName || 'Unknown'}</td>
                            <td>
                              <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                                {inq.visit?.opportunity || '-'}
                              </span>
                            </td>
                            <td className="text-end">
                              <Link
                                to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                className="btn-pocika btn-pocika-ghost btn-sm"
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
                  <div className="d-md-none d-flex flex-column gap-3">
                    {recentInquiries.map((inq) => (
                      <div key={inq._id || inq.inquiryNumber} className="border rounded-3 p-3 bg-white">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span className="fw-bold">{inq.inquiryNumber}</span>
                          <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`}>
                            {inq.visit?.opportunity}
                          </span>
                        </div>
                        <div className="fw-semibold text-truncate mb-1">
                          {inq.customer?.companyName}
                        </div>
                        <div className="text-muted small mb-2">
                          {inq.customer?.siteLocation} · {formatDate(inq.date)}
                        </div>
                        <Link
                          to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                          className="btn-pocika btn-pocika-secondary btn-sm w-100"
                        >
                          View Details
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Upcoming Follow-ups Widget */}
          <div className="col-lg-4">
            <div className="card-pocika p-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                  Follow-up Reminders
                </h2>
                <span className="badge bg-primary rounded-pill small">
                  {allFollowUps.length}
                </span>
              </div>

              {/* Filter Pills */}
              <div className="d-flex flex-wrap gap-1 mb-3">
                {[
                  { key: 'all', label: 'All', count: allFollowUps.length },
                  { key: 'overdue', label: 'Overdue', count: overdueFollowUps.length, badgeCls: 'bg-danger text-white' },
                  { key: 'today', label: 'Today', count: todayFollowUps.length, badgeCls: 'bg-warning text-dark' },
                  { key: 'this_week', label: '7 Days', count: weekFollowUps.length }
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    className={`btn btn-sm py-1 px-2 d-inline-flex align-items-center gap-1 ${
                      followUpFilter === pill.key
                        ? 'btn-primary'
                        : 'btn-outline-secondary'
                    }`}
                    style={{ fontSize: '0.75rem', borderRadius: '14px' }}
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
                        style={{ fontSize: '0.7rem', padding: '1px 5px' }}
                      >
                        {pill.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {displayedFollowUps.length === 0 ? (
                <div className="text-muted small py-3 text-center">
                  No {followUpFilter !== 'all' ? followUpFilter.replace('_', ' ') : ''} follow-ups scheduled.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {displayedFollowUps.slice(0, 8).map((inq) => {
                    const isOverdue = inq.followUp?.followUpDate && inq.followUp.followUpDate < today && inq.status !== 'Won' && inq.status !== 'Lost';
                    const isToday = inq.followUp?.followUpDate === today;

                    return (
                      <div key={inq._id || inq.inquiryNumber} className="border-bottom pb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <Link
                            to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                            className="fw-semibold small text-primary text-decoration-none text-truncate"
                            style={{ maxWidth: '160px' }}
                          >
                            {inq.customer?.companyName || inq.inquiryNumber}
                          </Link>
                          {isOverdue ? (
                            <span className="badge bg-danger text-white small" style={{ fontSize: '0.7rem' }}>
                              Overdue ({formatDate(inq.followUp?.followUpDate)})
                            </span>
                          ) : isToday ? (
                            <span className="badge bg-warning text-dark small" style={{ fontSize: '0.7rem' }}>
                              Today
                            </span>
                          ) : (
                            <span className="badge bg-light text-dark small border" style={{ fontSize: '0.7rem' }}>
                              {formatDate(inq.followUp?.followUpDate)}
                            </span>
                          )}
                        </div>
                        <div className="text-muted small d-flex justify-content-between align-items-center">
                          <span>
                            Action: {Array.isArray(inq.followUp?.nextAction) ? inq.followUp.nextAction.join(', ') : inq.followUp?.nextAction || 'Follow-up'}
                          </span>
                          <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {inq.visit?.opportunity || '-'}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="text-helper" style={{ fontSize: '0.75rem' }}>
                            {inq.inquiryNumber}
                          </span>
                          <Link
                            to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                            className="text-primary small text-decoration-none fw-medium"
                            style={{ fontSize: '0.78rem' }}
                          >
                            View &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

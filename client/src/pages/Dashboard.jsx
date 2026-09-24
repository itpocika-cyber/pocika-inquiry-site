import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { announcementApi } from '../api/announcementApi';
import { useAuthStore } from '../store/authStore';
import { isNewInquiry, markInquiryAsViewed } from '../utils/notificationTracker';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState({
    total: 0,
    today: 0,
    hot: 0,
    pendingFollowUps: 0,
    renewalsDueSoon: 0,
    staleLeadsCount: 0
  });
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const [viewedTick, setViewedTick] = useState(0);

  useEffect(() => {
    const handleViewedChange = () => setViewedTick((t) => t + 1);
    window.addEventListener('pocika_viewed_changed', handleViewedChange);
    return () => window.removeEventListener('pocika_viewed_changed', handleViewedChange);
  }, []);

  useEffect(() => {
    // Check if draft exists
    const draft = localStorage.getItem('pocika_inquiry_draft');
    if (draft) setHasDraft(true);

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [sumRes, inqRes, fuRes, annRes] = await Promise.all([
          api.get('/inquiries/summary'),
          api.get('/inquiries?limit=25&sort=newest'),
          api.get('/inquiries?hasFollowUp=true&sortBy=nextFollowUpDate&limit=100'),
          announcementApi.getAnnouncements().catch(() => ({ data: [] }))
        ]);

        if (sumRes.data) setSummary(sumRes.data);
        if (inqRes.data?.items) {
          // Dashboard shows top 10 recent inquiries
          setRecentInquiries(inqRes.data.items.slice(0, 10));
        }
        if (fuRes.data?.items) {
          setAllFollowUps(fuRes.data.items);
        } else if (inqRes.data?.items) {
          setAllFollowUps(inqRes.data.items.filter(x => x.followUp?.followUpDate));
        }

        // Filter out dismissed announcements
        const dismissed = JSON.parse(localStorage.getItem('pocika_dismissed_announcements') || '[]');
        const activeAnn = (annRes.data || []).filter(a => !dismissed.includes(a._id));
        setAnnouncements(activeAnn);
      } catch (err) {
        console.warn('Dashboard load warning:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleDismissAnnouncement = (annId) => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('pocika_dismissed_announcements') || '[]');
      if (!dismissed.includes(annId)) {
        dismissed.push(annId);
        localStorage.setItem('pocika_dismissed_announcements', JSON.stringify(dismissed));
      }
    } catch (e) {
      console.warn('Dismiss save error:', e);
    }
    setAnnouncements(announcements.filter(a => a._id !== annId));
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
    (x) => x.followUp?.followUpDate && x.followUp.followUpDate < today && x.followUp?.dealStatus !== 'Won' && x.followUp?.dealStatus !== 'Lost'
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
        {/* Team Announcements Banners */}
        {announcements.map((ann) => (
          <div
            key={ann._id}
            className={`alert mb-4 d-flex justify-content-between align-items-start border ${
              ann.priority === 'urgent'
                ? 'alert-danger border-danger'
                : 'alert-warning border-warning'
            }`}
            style={{ borderRadius: '12px' }}
          >
            <div className="d-flex align-items-start gap-2">
              <span style={{ fontSize: '1.25rem' }}>
                {ann.priority === 'urgent' ? '🚨' : '📢'}
              </span>
              <div>
                <strong className="d-block mb-1">{ann.title}</strong>
                <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>{ann.message}</p>
                <div className="text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                  Posted by {ann.createdBy?.name || 'Management'} · {formatDate(ann.createdAt)}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-close ms-2"
              onClick={() => handleDismissAnnouncement(ann._id)}
              title="Dismiss announcement"
            />
          </div>
        ))}

        {/* Top greeting & Action */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-page-title mb-1">
              Welcome back, {user?.displayName || 'Sales Executive'}
            </h1>
            <p className="text-muted-custom mb-0">
              Here is an overview of your visits, reminders, and open inquiries.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link
              to="/catalog"
              className="btn-pocika btn-pocika-secondary d-inline-flex align-items-center gap-1"
            >
              <span>📖 Catalog</span>
            </Link>
            <Link
              to="/inquiry"
              className="btn-pocika btn-pocika-primary d-inline-flex align-items-center gap-2"
            >
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
              <div className="text-helper small mb-1">Total Inquiries</div>
              <div className="fs-2 fw-bold" style={{ color: 'var(--color-navy)' }}>
                {summary.total || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center">
              <div className="text-helper small mb-1">Today's Visits</div>
              <div className="fs-2 fw-bold" style={{ color: 'var(--color-primary)' }}>
                {summary.today || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center border-bottom border-3 border-danger">
              <div className="text-helper small mb-1">HOT Opps</div>
              <div className="fs-2 fw-bold text-danger">
                {summary.hot || 0}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card-pocika p-3 text-center border-bottom border-3 border-warning">
              <div className="text-helper small mb-1">Pending Follow-ups</div>
              <div className="fs-2 fw-bold text-warning">
                {summary.pendingFollowUps || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Reminders Bar: Renewals & Stale Leads */}
        {(summary.renewalsDueSoon > 0 || summary.staleLeadsCount > 0) && (
          <div className="row g-3 mb-4">
            {summary.renewalsDueSoon > 0 && (
              <div className="col-md-6">
                <Link
                  to="/inquiries?renewalsDueInDays=30"
                  className="card-pocika p-3 d-flex justify-content-between align-items-center text-decoration-none text-dark border-primary"
                  style={{ background: 'var(--color-primary-soft)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">📅</span>
                    <div>
                      <span className="fw-bold" style={{ color: 'var(--color-navy)' }}>
                        {summary.renewalsDueSoon} Renewal{summary.renewalsDueSoon > 1 ? 's' : ''} Due in 30 Days
                      </span>
                      <div className="text-muted small">Contracts & AMC expiring soon</div>
                    </div>
                  </div>
                  <span className="btn btn-sm btn-outline-primary py-1 px-2" style={{ fontSize: '0.75rem' }}>
                    View List &rarr;
                  </span>
                </Link>
              </div>
            )}
            {summary.staleLeadsCount > 0 && (
              <div className="col-md-6">
                <Link
                  to="/inquiries?isStale=true"
                  className="card-pocika p-3 d-flex justify-content-between align-items-center text-decoration-none text-dark border-danger"
                  style={{ background: 'var(--color-danger-soft)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-5">⚠️</span>
                    <div>
                      <span className="fw-bold text-danger">
                        {summary.staleLeadsCount} Lead{summary.staleLeadsCount > 1 ? 's' : ''} Need Attention
                      </span>
                      <div className="text-muted small">Overdue follow-ups without recent visits</div>
                    </div>
                  </div>
                  <span className="btn btn-sm btn-outline-danger py-1 px-2" style={{ fontSize: '0.75rem' }}>
                    Follow up &rarr;
                  </span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="row g-4">
          {/* Left: Recent Inquiries */}
          <div className="col-lg-8">
            <div className="card-pocika p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                    Recent Inquiries
                  </h2>
                  {recentInquiries.filter(isNewInquiry).length > 0 ? (
                    <span
                      className="badge bg-danger text-white rounded-pill px-2 py-1 small d-inline-flex align-items-center gap-1"
                      title="New inquiries waiting to be reviewed/viewed"
                    >
                      <span>🔔</span> {recentInquiries.filter(isNewInquiry).length} New
                    </span>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill small">
                      ✓ All Viewed
                    </span>
                  )}
                </div>
                <Link to="/inquiries" className="btn-pocika btn-pocika-ghost btn-sm d-none d-sm-inline-flex" title="View complete searchable list of all inquiries">
                  View All Inquiries ({summary.total || recentInquiries.length}) &rarr;
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
                  {/* Desktop Table View with Custom Horizontal Slider (Same as Admin) */}
                  <div className="d-none d-md-block table-slider-container mb-3">
                    <table className="table-pocika-data">
                      <thead>
                        <tr>
                          <th>Inquiry No.</th>
                          <th>Date</th>
                          <th>Company / Client</th>
                          <th>Salesperson</th>
                          <th>Opportunity</th>
                          <th>Deal Status</th>
                          <th>Next Follow-up</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentInquiries.map((inq) => {
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
                                  {inq.inquiryNumber || '-'}
                                  {unviewed && (
                                    <span
                                      className="badge rounded-pill text-white ms-1"
                                      style={{ fontSize: '0.60rem', padding: '2px 6px', letterSpacing: '0.4px', backgroundColor: 'var(--color-primary)' }}
                                      title="New unviewed inquiry"
                                    >
                                      ● NEW
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td>{formatDate(inq.date)}</td>
                              <td className="fw-medium text-truncate" style={{ maxWidth: '180px' }}>
                                {inq.customer?.companyName || 'Unknown'}
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border" style={{ fontSize: '0.72rem' }}>
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
                              <td>{formatDate(inq.followUp?.followUpDate)}</td>
                              <td className="text-end">
                                <Link
                                  to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                  className={`btn-pocika btn-sm ${unviewed ? 'btn-pocika-primary' : 'btn-pocika-ghost'}`}
                                  onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
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

                  {/* Mobile Sleek Modern List View (No bulky box-in-a-box) */}
                  <div className="d-md-none mobile-inquiry-list mb-3">
                    {recentInquiries.map((inq) => {
                      const unviewed = isNewInquiry(inq);
                      return (
                        <Link
                          key={inq._id || inq.inquiryNumber}
                          to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                          className={`mobile-inquiry-item ${unviewed ? 'is-unviewed' : ''}`}
                          onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
                        >
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-1 mb-1">
                                <span className="mobile-inquiry-company text-truncate">
                                  {inq.customer?.companyName || 'Unknown Company'}
                                </span>
                                {unviewed && (
                                  <span
                                    className="badge rounded-pill text-white flex-shrink-0"
                                    style={{ fontSize: '0.58rem', padding: '2px 5px', backgroundColor: 'var(--color-primary)' }}
                                  >
                                    NEW
                                  </span>
                                )}
                              </div>
                              <div className="mobile-inquiry-meta text-truncate">
                                <span className="fw-semibold" style={{ color: 'var(--color-navy)' }}>{inq.inquiryNumber}</span>
                                {inq.customer?.siteLocation && (
                                  <> · <span>{inq.customer.siteLocation}</span></>
                                )}
                                <span> · {formatDate(inq.date)}</span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                              <div className="d-flex flex-column align-items-end gap-1">
                                <span className={`badge-pocika ${getOppBadge(inq.visit?.opportunity)}`} style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                                  {inq.visit?.opportunity || '-'}
                                </span>
                                <span
                                  className={`badge ${
                                    inq.followUp?.dealStatus === 'Won'
                                      ? 'bg-success'
                                      : inq.followUp?.dealStatus === 'Lost'
                                      ? 'bg-danger'
                                      : 'bg-warning text-dark'
                                  }`}
                                  style={{ fontSize: '0.64rem', padding: '2px 5px' }}
                                >
                                  {inq.followUp?.dealStatus || 'Pending'}
                                </span>
                              </div>
                              <span className="mobile-inquiry-chevron">&rsaquo;</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* View All Inquiries Action Footer */}
                  <div className="pt-2 pb-1 border-top d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span className="text-muted small">
                      Showing {recentInquiries.length} of {summary.total || recentInquiries.length} inquiries
                    </span>
                    <Link
                      to="/inquiries"
                      className="btn-pocika btn-pocika-secondary btn-sm px-3 d-inline-flex align-items-center gap-1"
                      title="View complete searchable list of all inquiries"
                    >
                      <span>View All Inquiries</span>
                      <span aria-hidden="true">&rarr;</span>
                    </Link>
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
                    const isOverdue = inq.followUp?.followUpDate && inq.followUp.followUpDate < today && inq.followUp?.dealStatus !== 'Won' && inq.followUp?.dealStatus !== 'Lost';
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

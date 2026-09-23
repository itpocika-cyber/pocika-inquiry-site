import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { isNewInquiry, markInquiryAsViewed } from '../utils/notificationTracker';

export default function InquiriesList() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opportunity, setOpportunity] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [viewedTick, setViewedTick] = useState(0);

  useEffect(() => {
    const handleViewedChange = () => setViewedTick((t) => t + 1);
    window.addEventListener('pocika_viewed_changed', handleViewedChange);
    return () => window.removeEventListener('pocika_viewed_changed', handleViewedChange);
  }, []);

  const renewalsDueParam = searchParams.get('renewalsDueInDays');
  const isStaleParam = searchParams.get('isStale');

  useEffect(() => {
    const draft = localStorage.getItem('pocika_inquiry_draft');
    if (draft) setHasDraft(true);
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 25,
        sort
      });

      if (search.trim()) params.append('search', search.trim());
      if (opportunity) params.append('opportunity', opportunity);
      if (status) params.append('status', status);
      if (renewalsDueParam) params.append('renewalsDueInDays', renewalsDueParam);
      if (isStaleParam) params.append('isStale', isStaleParam);

      const res = await api.get(`/inquiries?${params.toString()}`);
      if (res.data) {
        setInquiries(res.data.items || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.warn('Inquiries fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [currentPage, opportunity, status, sort, renewalsDueParam, isStaleParam]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchInquiries();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleClearFilters = () => {
    setSearch('');
    setOpportunity('');
    setStatus('');
    setSort('newest');
    setCurrentPage(1);
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

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-page-title mb-1">{isAdmin ? 'All Inquiries' : 'My Inquiries'}</h1>
            <p className="text-muted-custom mb-0">
              {totalCount} total inquiry records found
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

        {/* Filter bar */}
        <div className="card-pocika p-3 mb-4">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-4">
              <label className="field-label mb-1">Search</label>
              <input
                type="text"
                className="form-control-pocika"
                placeholder="Inquiry number, company, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <label className="field-label mb-1">Opportunity</label>
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
              <label className="field-label mb-1">Sort By</label>
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
            <div className="col-12 col-md-2">
              <button
                type="button"
                className="btn-pocika btn-pocika-secondary w-100"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Inquiries Table Card */}
        <div className="card-pocika p-4">
          {loading ? (
            <LoadingSpinner message="Fetching inquiry records..." />
          ) : inquiries.length === 0 && !hasDraft ? (
            <EmptyState
              title="No matching inquiries"
              description="No inquiries match your current search or filter criteria. Try clearing your filters."
              actionLabel="Reset Filters"
              onAction={handleClearFilters}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="d-none d-lg-block table-responsive" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--color-bg)' }}>
                    <tr>
                      <th>Inquiry No.</th>
                      <th>Date</th>
                      <th>Company / Client</th>
                      <th>Salesperson</th>
                      <th>Location</th>
                      <th>Opportunity</th>
                      <th>Deal Status</th>
                      <th>Next Follow-up</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Draft row if on page 1 */}
                    {hasDraft && currentPage === 1 && !search && !opportunity && (
                      <tr className="table-warning">
                        <td className="fw-bold">
                          <span className="badge bg-warning text-dark me-2">DRAFT</span>
                          Unsaved Inquiry
                        </td>
                        <td>In progress</td>
                        <td>Active draft session</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td className="text-end">
                          <Link to="/inquiry" className="btn-pocika btn-pocika-primary btn-sm">
                            Resume
                          </Link>
                        </td>
                      </tr>
                    )}

                    {inquiries.map((inq) => {
                      const unviewed = isNewInquiry(inq);
                      return (
                        <tr
                          key={inq._id || inq.inquiryNumber}
                          style={unviewed ? { backgroundColor: 'rgba(255, 237, 237, 0.35)' } : {}}
                        >
                          <td className="fw-semibold">
                            <Link
                              to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                              className="text-primary text-decoration-none d-inline-flex align-items-center gap-1"
                              onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
                            >
                              {inq.inquiryNumber}
                              {unviewed && (
                                <span
                                  className="badge bg-danger text-white rounded-pill ms-1"
                                  style={{ fontSize: '0.60rem', padding: '2px 6px', letterSpacing: '0.4px' }}
                                  title="New unviewed inquiry"
                                >
                                  ● NEW
                                </span>
                              )}
                            </Link>
                          </td>
                          <td>{formatDate(inq.date)}</td>
                          <td className="fw-medium">{inq.customer?.companyName || 'Unknown'}</td>
                          <td>
                            <span className="badge bg-light text-dark border" style={{ fontSize: '0.72rem' }}>
                              {inq.salesPerson || '-'}
                            </span>
                          </td>
                          <td>{inq.customer?.siteLocation || '-'}</td>
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

              {/* Mobile Cards View */}
              <div className="d-lg-none d-flex flex-column gap-3">
                {hasDraft && currentPage === 1 && !search && !opportunity && (
                  <div className="border border-warning rounded-3 p-3 bg-warning-subtle">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="badge bg-warning text-dark">DRAFT</span>
                      <Link to="/inquiry" className="btn-pocika btn-pocika-primary btn-sm">
                        Resume &rarr;
                      </Link>
                    </div>
                    <div className="fw-bold">Unsaved draft in progress</div>
                    <div className="text-muted small">Continue where you left off.</div>
                  </div>
                )}

                {inquiries.map((inq) => {
                  const unviewed = isNewInquiry(inq);
                  return (
                    <div
                      key={inq._id || inq.inquiryNumber}
                      className={`border rounded-3 p-3 bg-white ${unviewed ? 'border-danger border-2' : ''}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold fs-6 d-inline-flex align-items-center gap-1">
                          {inq.inquiryNumber}
                          {unviewed && (
                            <span
                              className="badge bg-danger text-white rounded-pill ms-1"
                              style={{ fontSize: '0.62rem', padding: '2px 6px' }}
                            >
                              ● NEW
                            </span>
                          )}
                        </span>
                        <div className="d-flex gap-1 align-items-center">
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
                    <div className="fw-semibold mb-1">{inq.customer?.companyName}</div>
                    <div className="text-muted small mb-2">
                      {inq.customer?.siteLocation} · {formatDate(inq.date)}
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <span className="text-helper small">
                        Follow-up: {formatDate(inq.followUp?.followUpDate)}
                      </span>
                      <Link
                        to={`/inquiries/${inq.inquiryNumber || inq._id}`}
                        className={`btn-pocika btn-sm ${unviewed ? 'btn-pocika-primary' : 'btn-pocika-secondary'}`}
                        onClick={() => markInquiryAsViewed(inq._id, inq.inquiryNumber)}
                      >
                        View Details &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>

              {/* Pagination Controls */}
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
      </main>

      <Footer />
    </div>
  );
}

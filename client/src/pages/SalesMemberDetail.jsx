import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function SalesMemberDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [member, setMember] = useState(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [memberError, setMemberError] = useState(null);

  // Inquiries for this salesperson
  const [inquiries, setInquiries] = useState([]);
  const [totalInquiries, setTotalInquiries] = useState(0);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [inquiryError, setInquiryError] = useState(null);

  // KPIs
  const [kpis, setKpis] = useState({
    total: 0,
    hot: 0,
    pendingFollowUp: 0,
    thisMonth: 0
  });

  const fetchMember = async () => {
    setLoadingMember(true);
    setMemberError(null);
    try {
      // First try /users/:id
      const res = await api.get(`/users/${userId}`);
      if (res.data?.user) {
        setMember(res.data.user);
      } else if (res.data) {
        setMember(res.data);
      }
    } catch (err) {
      // Fallback: fetch from /users list
      try {
        const listRes = await api.get('/users');
        const found = (listRes.data?.users || []).find(
          (u) => (u.id || u.userId || u._id) === userId || u.email === userId
        );
        if (found) {
          setMember(found);
        } else {
          setMemberError('Sales team member not found.');
        }
      } catch (listErr) {
        setMemberError(err.message || 'Failed to load member profile.');
      }
    } finally {
      setLoadingMember(false);
    }
  };

  const fetchInquiries = async () => {
    if (!member) return;
    setLoadingInquiries(true);
    setInquiryError(null);

    try {
      const salesName = member.displayName || member.name || member.email;
      const params = new URLSearchParams({
        salesPerson: salesName,
        page: String(page),
        limit: '10'
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/inquiries?${params.toString()}`);
      if (res.data) {
        setInquiries(res.data.inquiries || []);
        setTotalInquiries(res.data.total || 0);
      }

      // Calculate member KPIs
      // Fetch up to 100 to compute stats accurately
      const allRes = await api.get(`/inquiries?salesPerson=${encodeURIComponent(salesName)}&limit=100`);
      const allInqs = allRes.data?.inquiries || [];
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let hotCount = 0;
      let pendingFollowUpCount = 0;
      let thisMonthCount = 0;

      allInqs.forEach((inq) => {
        if (inq.visit?.opportunity === 'HOT') hotCount++;
        if (inq.followUp?.followUpDate) {
          const fDate = new Date(inq.followUp.followUpDate);
          if (!isNaN(fDate.getTime()) && fDate >= new Date(now.setHours(0,0,0,0))) {
            pendingFollowUpCount++;
          }
        }
        if (inq.createdAt) {
          const cDate = new Date(inq.createdAt);
          if (cDate.getMonth() === currentMonth && cDate.getFullYear() === currentYear) {
            thisMonthCount++;
          }
        }
      });

      setKpis({
        total: allRes.data?.total || allInqs.length,
        hot: hotCount,
        pendingFollowUp: pendingFollowUpCount,
        thisMonth: thisMonthCount
      });

    } catch (err) {
      setInquiryError(err.message || 'Failed to load member inquiries.');
    } finally {
      setLoadingInquiries(false);
    }
  };

  useEffect(() => {
    fetchMember();
  }, [userId]);

  useEffect(() => {
    if (member) {
      fetchInquiries();
    }
  }, [member, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (member) {
        setPage(1);
        fetchInquiries();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = async () => {
    if (!member) return;
    const isSelf = member.id === currentUser?.id || member.userId === currentUser?.userId;
    if (isSelf) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }

    const action = member.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${member.displayName || member.email}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/users/${member.id || member.userId || member._id}`, {
        isActive: !member.isActive
      });
      if (res.data?.user) {
        setMember(res.data.user);
      } else {
        setMember({ ...member, isActive: !member.isActive });
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getOpportunityBadge = (opp) => {
    const clsMap = {
      HOT: 'badge-danger',
      WARM: 'badge-warning',
      COLD: 'badge-neutral',
      'FUTURE POTENTIAL': 'badge-primary',
      'DEALER DEVELOPMENT': 'badge-primary',
      'NO REQUIREMENT': 'badge-neutral'
    };
    return `badge ${clsMap[opp] || 'badge-neutral'}`;
  };

  const totalPages = Math.ceil(totalInquiries / 10) || 1;

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block flex-grow-1">
        {/* Breadcrumb Navigation */}
        <div className="mb-4">
          <Link to="/admin/team" className="text-decoration-none text-muted-custom d-inline-flex align-items-center gap-1 small fw-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Sales Team
          </Link>
        </div>

        {loadingMember ? (
          <LoadingSpinner message="Loading salesperson profile..." />
        ) : memberError ? (
          <div className="alert-pocika alert-danger">{memberError}</div>
        ) : !member ? (
          <EmptyState title="Member not found" message="The requested salesperson profile does not exist." />
        ) : (
          <>
            {/* Profile Header Card */}
            <div className="card-pocika p-4 mb-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                    style={{
                      width: '56px',
                      height: '56px',
                      fontSize: '1.25rem',
                      background: member.role === 'admin' ? 'var(--color-primary)' : 'var(--color-navy-light)'
                    }}
                  >
                    {(member.displayName || member.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <h1 className="h4 fw-bold mb-0 text-navy">{member.displayName || 'Sales Member'}</h1>
                      <span className="badge bg-secondary text-capitalize">
                        {member.role?.replace('_', ' ')}
                      </span>
                      {member.isActive ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-danger">Inactive</span>
                      )}
                    </div>
                    <div className="text-muted small mt-1">
                      {member.email} &bull; Joined: {formatDate(member.createdAt)} &bull; Last Login: {formatDate(member.lastLoginAt)}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className={`btn-pocika ${member.isActive ? 'btn-pocika-danger-ghost' : 'btn-pocika-primary'}`}
                    onClick={handleToggleStatus}
                    disabled={member.id === currentUser?.id || member.userId === currentUser?.userId}
                  >
                    {member.isActive ? 'Deactivate Access' : 'Activate Access'}
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
              <div className="col-sm-6 col-lg-3">
                <div className="card-pocika p-3 text-center">
                  <div className="text-muted small text-uppercase fw-semibold mb-1">Total Inquiries</div>
                  <div className="display-6 fw-bold text-navy">{kpis.total}</div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card-pocika p-3 text-center">
                  <div className="text-muted small text-uppercase fw-semibold mb-1">Hot Opportunities</div>
                  <div className="display-6 fw-bold text-danger">{kpis.hot}</div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card-pocika p-3 text-center">
                  <div className="text-muted small text-uppercase fw-semibold mb-1">Pending Follow-ups</div>
                  <div className="display-6 fw-bold text-warning">{kpis.pendingFollowUp}</div>
                </div>
              </div>
              <div className="col-sm-6 col-lg-3">
                <div className="card-pocika p-3 text-center">
                  <div className="text-muted small text-uppercase fw-semibold mb-1">Inquiries This Month</div>
                  <div className="display-6 fw-bold text-primary">{kpis.thisMonth}</div>
                </div>
              </div>
            </div>

            {/* Inquiries List for this member */}
            <div className="card-pocika p-4">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-3">
                <div>
                  <h2 className="h5 fw-bold mb-1 text-navy">Inquiries by {member.displayName || member.email}</h2>
                  <p className="text-muted small mb-0">Showing {inquiries.length} of {totalInquiries} total inquiries</p>
                </div>
                <div style={{ maxWidth: '300px', width: '100%' }}>
                  <input
                    type="text"
                    className="form-control-pocika"
                    placeholder="Search inquiries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingInquiries ? (
                <LoadingSpinner message="Loading inquiries..." />
              ) : inquiryError ? (
                <div className="alert-pocika alert-danger">{inquiryError}</div>
              ) : inquiries.length === 0 ? (
                <EmptyState
                  title="No inquiries found"
                  message={search ? "No inquiries match your search filter." : "This salesperson hasn't submitted any inquiries yet."}
                />
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Inquiry No.</th>
                          <th>Company / Client</th>
                          <th>Contact Person</th>
                          <th>Opportunity</th>
                          <th>Date</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inquiries.map((inq) => (
                          <tr key={inq._id || inq.inquiryNumber}>
                            <td className="fw-semibold">
                              <Link to={`/inquiries/${inq._id || inq.inquiryNumber}`} className="text-decoration-none">
                                {inq.inquiryNumber}
                              </Link>
                            </td>
                            <td>{inq.customer?.companyName || '-'}</td>
                            <td>
                              <div>{inq.customer?.contactPerson || '-'}</div>
                              <div className="small text-muted">{inq.customer?.mobile || ''}</div>
                            </td>
                            <td>
                              <span className={getOpportunityBadge(inq.visit?.opportunity)}>
                                {inq.visit?.opportunity || 'HOT'}
                              </span>
                            </td>
                            <td className="small text-muted">{formatDate(inq.date || inq.createdAt)}</td>
                            <td className="text-end">
                              <Link
                                to={`/inquiries/${inq._id || inq.inquiryNumber}`}
                                className="btn-pocika btn-pocika-ghost btn-sm"
                              >
                                View Details &rarr;
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                      <div className="small text-muted">
                        Page {page} of {totalPages}
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn-pocika btn-pocika-ghost btn-sm"
                          disabled={page <= 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="btn-pocika btn-pocika-ghost btn-sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

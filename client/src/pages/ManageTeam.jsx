import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function ManageTeam() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    displayName: '',
    email: '',
    role: 'sales_person',
    password: ''
  });
  const [createdSuccess, setCreatedSuccess] = useState(null); // { email, password, name }
  const [salesPerformance, setSalesPerformance] = useState([]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter !== '') params.append('isActive', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const [usersRes, sumRes] = await Promise.all([
        api.get(`/users?${params.toString()}`),
        api.get('/inquiries/summary').catch(() => ({ data: null }))
      ]);

      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
      if (sumRes.data?.salesPerformance) {
        setSalesPerformance(sumRes.data.salesPerformance);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/users', addForm);
      if (res.data?.user) {
        setCreatedSuccess({
          name: res.data.user.displayName,
          email: res.data.user.email,
          role: res.data.user.role,
          password: res.data.generatedPassword
        });
        setAddForm({ displayName: '', email: '', role: 'sales_person', password: '' });
        setShowAddModal(false);
        fetchUsers();
      }
    } catch (err) {
      alert(`Failed to create team member: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id || user.userId === currentUser?.userId) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }

    const action = user.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.displayName}?`)) {
      return;
    }

    try {
      const res = await api.patch(`/users/${user.id || user.userId}`, {
        isActive: !user.isActive
      });
      if (res.data?.user) {
        setUsers(users.map(u => (u.id === user.id ? { ...u, isActive: res.data.user.isActive } : u)));
      }
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Password copied to clipboard!');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'badge bg-danger';
      case 'manager':
        return 'badge bg-primary';
      case 'sales_person':
      default:
        return 'badge bg-info text-dark';
    }
  };

  const formatDate = (val) => {
    if (!val) return 'Never';
    try {
      return new Date(val).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        {/* Top Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-page-title mb-1">Manage Sales Team</h1>
            <p className="text-muted-custom mb-0">
              Create and manage team accounts, roles, and login access.
            </p>
          </div>
          <div>
            <button
              type="button"
              className="btn-pocika btn-pocika-primary d-inline-flex align-items-center gap-2"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Team Member
            </button>
          </div>
        </div>

        {/* Success Banner when a user was newly created */}
        {createdSuccess && (
          <div className="card-pocika p-4 mb-4 border-success" style={{ backgroundColor: '#f0fdf4' }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h3 className="fw-bold text-success mb-1" style={{ fontSize: '1.1rem' }}>
                  ✓ Team Member Created Successfully!
                </h3>
                <p className="small text-muted mb-2">
                  Share these login credentials with <strong>{createdSuccess.name}</strong>.
                </p>
                <div className="p-3 bg-white rounded-3 border d-inline-block">
                  <div className="small mb-1"><strong>Email:</strong> {createdSuccess.email}</div>
                  <div className="small mb-2">
                    <strong>Password:</strong> <code className="fw-bold fs-6">{createdSuccess.password}</code>
                  </div>
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-ghost btn-sm py-1 px-2"
                    onClick={() => copyToClipboard(createdSuccess.password)}
                  >
                    Copy Password
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setCreatedSuccess(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}

        {/* Sales Performance Leaderboard (This Month) */}
        {salesPerformance && salesPerformance.length > 0 && (
          <div className="card-pocika p-4 mb-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-2 mb-3">
              <div>
                <h2 className="text-field-label m-0" style={{ fontSize: '1.15rem' }}>
                  🏆 Sales Performance Leaderboard (This Month)
                </h2>
                <p className="text-muted small mb-0">
                  Rankings based on visits, hot opportunities, and won deals this month.
                </p>
              </div>
              <span className="badge bg-light text-primary border small">
                {salesPerformance.length} Sales Executives
              </span>
            </div>
            {/* Desktop Table View */}
            <div className="d-none d-md-block table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Rank & Salesperson</th>
                    <th className="text-center">Visits This Month</th>
                    <th className="text-center">Hot Leads</th>
                    <th className="text-center">Won Deals</th>
                    <th className="text-center">Lost Deals</th>
                    <th className="text-end">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPerformance.map((sp, idx) => (
                    <tr key={idx}>
                      <td className="fw-semibold">
                        <span className="me-2" style={{ fontSize: '1.1rem' }}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        {sp.name}
                      </td>
                      <td className="text-center fw-medium">{sp.totalThisMonth}</td>
                      <td className="text-center">
                        <span className="badge bg-danger text-white">{sp.hotLeads}</span>
                      </td>
                      <td className="text-center">
                        <span className="badge bg-success text-white">{sp.wonDeals}</span>
                      </td>
                      <td className="text-center text-muted">{sp.lostDeals}</td>
                      <td className="text-end fw-bold text-primary">{sp.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Leaderboard */}
            <div className="d-md-none d-flex flex-column gap-2">
              {salesPerformance.map((sp, idx) => (
                <div key={idx} className="border rounded-3 p-3 bg-white shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold d-flex align-items-center gap-2">
                      <span style={{ fontSize: '1.1rem' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <span>{sp.name}</span>
                    </div>
                    <span className="badge bg-primary fs-6">{sp.conversionRate}% Win</span>
                  </div>
                  <div className="d-flex justify-content-between text-muted small pt-2 border-top">
                    <span>Visits: <strong>{sp.totalThisMonth}</strong></span>
                    <span>Hot: <strong className="text-danger">{sp.hotLeads}</strong></span>
                    <span>Won: <strong className="text-success">{sp.wonDeals}</strong></span>
                    <span>Lost: <strong className="text-secondary">{sp.lostDeals}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="card-pocika p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-md-5">
              <input
                type="text"
                className="form-control-pocika"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-sm-4 col-md-3">
              <select
                className="form-control-pocika"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="sales_person">Sales Person</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-sm-4 col-md-3">
              <select
                className="form-control-pocika"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
            <div className="col-sm-4 col-md-1 text-end">
              {(search || roleFilter || statusFilter) && (
                <button
                  type="button"
                  className="btn-pocika btn-pocika-ghost btn-sm w-100"
                  onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Members Table */}
        {loading ? (
          <LoadingSpinner message="Loading team members..." />
        ) : error ? (
          <div className="alert-pocika alert-danger mb-4">{error}</div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No team members found"
            message={search || roleFilter ? "No members match the selected filters." : "Click 'Add Team Member' to create the first sales login."}
            actionText={!search && !roleFilter ? "Add Team Member" : undefined}
            onAction={!search && !roleFilter ? () => setShowAddModal(true) : undefined}
          />
        ) : (
          <div className="card-pocika overflow-hidden">
            {/* Desktop Table View */}
            <div className="d-none d-md-block table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Created</th>
                    <th className="text-end pe-4">Access Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalPages = Math.ceil(users.length / pageSize) || 1;
                    const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

                    return paginatedUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id || u.userId === currentUser?.userId;
                      const memberId = u.id || u.userId || u._id;
                      return (
                        <tr
                          key={memberId}
                          onClick={() => navigate(`/admin/team/${memberId}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  background: u.role === 'admin' ? 'var(--color-primary)' : '#0ea5e9'
                                }}
                              >
                                {(u.displayName || u.email).slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="fw-semibold">
                                  {u.displayName}
                                  {isSelf && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>You</span>}
                                </div>
                                <div className="small text-muted">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={getRoleBadgeClass(u.role)}>
                              {u.role?.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {u.isActive ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-secondary">Inactive</span>
                            )}
                          </td>
                          <td className="small text-muted">
                            {formatDate(u.lastLoginAt)}
                          </td>
                          <td className="small text-muted">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="text-end pe-4">
                            <div className="d-inline-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn-pocika btn-pocika-ghost btn-sm"
                                onClick={() => navigate(`/admin/team/${memberId}`)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className={`btn-pocika btn-sm ${u.isActive ? 'btn-pocika-secondary' : 'btn-pocika-primary'}`}
                                disabled={isSelf}
                                onClick={() => handleToggleStatus(u)}
                                title={isSelf ? 'Cannot deactivate self' : u.isActive ? 'Deactivate user access' : 'Activate user access'}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards for Team Members */}
            <div className="d-md-none d-flex flex-column gap-3 p-3">
              {(() => {
                const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);
                return paginatedUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id || u.userId === currentUser?.userId;
                  const memberId = u.id || u.userId || u._id;
                  return (
                    <div key={memberId} className="border rounded-3 p-3 bg-white shadow-sm">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                            style={{
                              width: '34px',
                              height: '34px',
                              background: u.role === 'admin' ? 'var(--color-primary)' : '#0ea5e9',
                              fontSize: '0.8rem'
                            }}
                          >
                            {(u.displayName || u.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold">
                              {u.displayName}
                              {isSelf && <span className="badge bg-secondary ms-1" style={{ fontSize: '0.62rem' }}>You</span>}
                            </div>
                            <div className="text-muted small">{u.email}</div>
                          </div>
                        </div>
                        <span className={getRoleBadgeClass(u.role)} style={{ fontSize: '0.72rem' }}>
                          {u.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                        <div>
                          {u.isActive ? (
                            <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>Active</span>
                          ) : (
                            <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>Inactive</span>
                          )}
                          <span className="text-muted small ms-2" style={{ fontSize: '0.7rem' }}>
                            Created: {formatDate(u.createdAt)}
                          </span>
                        </div>
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn-pocika btn-pocika-ghost btn-sm py-1 px-2"
                            onClick={() => navigate(`/admin/team/${memberId}`)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className={`btn-pocika btn-sm py-1 px-2 ${u.isActive ? 'btn-pocika-secondary' : 'btn-pocika-primary'}`}
                            disabled={isSelf}
                            onClick={() => handleToggleStatus(u)}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Pagination Controls */}
            {users.length > pageSize && (
              <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                <div className="small text-muted">
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, users.length)} of {users.length} members
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
                  <span className="small align-self-center px-2 text-muted">
                    Page {page} of {Math.ceil(users.length / pageSize)}
                  </span>
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-ghost btn-sm"
                    disabled={page >= Math.ceil(users.length / pageSize)}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Add Team Member</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>

              <form onSubmit={handleCreateUser}>
                <div className="modal-body p-4">
                  <div className="field-group mb-3">
                    <label className="field-label" htmlFor="displayName">
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      className="form-control-pocika"
                      placeholder="e.g. Kiran Mehta"
                      required
                      value={addForm.displayName}
                      onChange={(e) => setAddForm({ ...addForm, displayName: e.target.value })}
                    />
                  </div>

                  <div className="field-group mb-3">
                    <label className="field-label" htmlFor="newEmail">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      id="newEmail"
                      type="email"
                      className="form-control-pocika"
                      placeholder="name@pocika.com"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    />
                  </div>

                  <div className="field-group mb-3">
                    <label className="field-label" htmlFor="newRole">
                      System Role
                    </label>
                    <select
                      id="newRole"
                      className="form-control-pocika"
                      value={addForm.role}
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    >
                      <option value="sales_person">Sales Person (Standard)</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="field-group mb-2">
                    <label className="field-label" htmlFor="newPassword">
                      Password (Optional)
                    </label>
                    <input
                      id="newPassword"
                      type="text"
                      className="form-control-pocika"
                      placeholder="Leave blank to auto-generate a secure password"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    />
                    <div className="text-helper mt-1" style={{ fontSize: '0.8rem' }}>
                      If blank, the system will generate a secure temporary password.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-ghost"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Account'}
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

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import { catalogApi } from '../api/catalogApi';
import { uploadApi } from '../api/uploadApi';
import { useAuthStore } from '../store/authStore';
import { CATEGORIES, getProductImageUrl } from '../utils/productImages';

export default function ManageCatalog() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef(null);

  // Lightbox Preview State
  const [previewImage, setPreviewImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fire Extinguishers',
    subCategory: '',
    description: '',
    unit: 'Piece',
    price: '',
    specifications: '',
    imageUrl: '',
    isActive: true
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      const res = await catalogApi.getCatalog(params);
      setProducts(res.data?.items || res.data || []);
    } catch (err) {
      console.warn('Failed to load catalog:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Fire Extinguishers',
      subCategory: '',
      description: '',
      unit: 'Piece',
      price: '',
      specifications: '',
      imageUrl: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'Fire Extinguishers',
      subCategory: item.subCategory || '',
      description: item.description || '',
      unit: item.unit || 'Piece',
      price: item.price || item.priceHint || item.priceRange || '',
      specifications: Array.isArray(item.specifications)
        ? item.specifications.join(', ')
        : item.specifications || '',
      imageUrl: item.imageUrl || item.photo?.secureUrl || '',
      isActive: item.isActive !== false
    });
    setShowModal(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    setUploadingImg(true);
    try {
      const uploadData = new FormData();
      uploadData.append('photo', file);
      const res = await uploadApi.uploadDirect(uploadData);
      const uploadedUrl = res.data?.secureUrl || res.data?.photo?.secureUrl || res.data?.url;
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image. You can also paste an image URL directly.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Product name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        subCategory: formData.subCategory.trim(),
        description: formData.description.trim(),
        unit: formData.unit.trim(),
        price: formData.price.trim(),
        priceHint: formData.price.trim(),
        priceRange: formData.price.trim(),
        specifications: formData.specifications.trim(),
        imageUrl: formData.imageUrl.trim(),
        photo: {
          publicId: '',
          secureUrl: formData.imageUrl.trim()
        },
        isActive: formData.isActive
      };

      if (editingItem) {
        await catalogApi.updateCatalogItem(editingItem._id, payload);
      } else {
        await catalogApi.createCatalogItem(payload);
      }

      setShowModal(false);
      loadProducts();
    } catch (err) {
      alert(`Failed to save product: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the product catalog?`)) {
      return;
    }
    try {
      await catalogApi.deleteCatalogItem(id);
      loadProducts();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await catalogApi.updateCatalogItem(item._id, { isActive: !item.isActive });
      loadProducts();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Filter by status
  const filteredProducts = products.filter((item) => {
    if (statusFilter === 'active') return item.isActive !== false;
    if (statusFilter === 'inactive') return item.isActive === false;
    return true;
  });

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
          <Link to="/admin-dashboard" className="admin-nav-item">
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
          <Link to="/admin/catalog" className="admin-nav-item active">
            <svg className="admin-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Product Catalog
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
        <header className="admin-layout__header">
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-light btn-sm d-lg-none"
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Open Navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>
                Product Catalog
              </h1>
              <span className="badge bg-light text-secondary border rounded-pill small">
                {products.length} Items
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link
              to="/catalog"
              className="btn btn-sm btn-outline-secondary d-none d-sm-inline-flex align-items-center gap-2"
              title="Preview salesperson field view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>View as Salesperson</span>
            </Link>
            <button
              type="button"
              className="btn-pocika btn-pocika-primary btn-sm d-inline-flex align-items-center gap-2"
              onClick={handleOpenAdd}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Product</span>
            </button>
          </div>
        </header>

        <div className="admin-layout__content p-3 p-md-4 flex-grow-1">
          {/* Filter Bar */}
          <div className="card-pocika product-filter-bar p-3 mb-4">
            <div className="row g-2 align-items-end">
              {/* Single-line Search Input with embedded SVG */}
              <div className="col-12 col-md-4">
                <label className="field-label">Search Products</label>
                <div className="position-relative">
                  <svg
                    className="position-absolute text-muted"
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                    width="15"
                    height="15"
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
                    style={{ paddingLeft: '36px', height: '40px' }}
                    placeholder="Search name, specification, description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="col-6 col-md-3">
                <label className="field-label">Category</label>
                <select
                  className="form-control-pocika"
                  style={{ height: '40px' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories ({products.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div className="col-6 col-md-2">
                <label className="field-label">Status</label>
                <select
                  className="form-control-pocika"
                  style={{ height: '40px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* View Switcher & Reset */}
              <div className="col-12 col-md-3 d-flex justify-content-md-end align-items-center gap-2 pt-2 pt-md-0">
                <div className="product-view-toggle">
                  <button
                    type="button"
                    className={`btn-toggle-view ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Compact Table View"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-toggle-view ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid Showcase View"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    <span>Grid</span>
                  </button>
                </div>

                {(search || selectedCategory || statusFilter !== 'all') && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    style={{ height: '40px' }}
                    onClick={() => {
                      setSearch('');
                      setSelectedCategory('');
                      setStatusFilter('all');
                    }}
                    title="Reset filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Products Table or Grid */}
          <div className="card-pocika p-3 p-md-4">
            {loading ? (
              <LoadingSpinner message="Loading product catalog..." />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted mb-2">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                  </svg>
                </div>
                <h3 className="h6 fw-bold mb-1">No products found</h3>
                <p className="text-muted small mb-3">
                  No catalog items match your search or filter criteria.
                </p>
                <button
                  type="button"
                  className="btn-pocika btn-pocika-primary btn-sm"
                  onClick={handleOpenAdd}
                >
                  Add Product
                </button>
              </div>
            ) : viewMode === 'table' ? (
              /* ================== CLEAN TABLE VIEW ================== */
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '56px' }}>Photo</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Specifications</th>
                      <th>Indicative Price</th>
                      <th>Unit</th>
                      <th style={{ width: '90px' }}>Status</th>
                      <th className="text-end" style={{ width: '130px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((item) => {
                      const imgUrl = getProductImageUrl(item);
                      const displayPrice = item.price || item.priceHint || item.priceRange;
                      const displaySpecs = Array.isArray(item.specifications)
                        ? item.specifications.join(', ')
                        : item.specifications;

                      return (
                        <tr key={item._id}>
                          <td>
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={item.name}
                                className="product-thumb-img"
                                onClick={() => setPreviewImage({ url: imgUrl, title: item.name })}
                                title="Click to view photo"
                              />
                            ) : (
                              <div className="product-thumb-placeholder" title="No photo uploaded">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                              </div>
                            )}
                          </td>
                          <td className="fw-semibold">
                            <div
                              className="text-dark"
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleOpenEdit(item)}
                            >
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-muted small text-truncate" style={{ maxWidth: '280px', fontSize: '0.78rem' }}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="badge-category">
                              {item.category || 'General'}
                            </span>
                          </td>
                          <td className="small" style={{ maxWidth: '240px' }}>
                            {displaySpecs ? (
                              <span className="text-dark text-truncate d-inline-block" style={{ maxWidth: '230px' }} title={displaySpecs}>
                                {displaySpecs}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="fw-semibold" style={{ color: 'var(--color-navy)' }}>
                            {displayPrice ? (String(displayPrice).startsWith('₹') ? displayPrice : `₹${displayPrice}`) : (
                              <span className="text-muted fw-normal small">On Request</span>
                            )}
                          </td>
                          <td className="small text-muted">{item.unit || 'Piece'}</td>
                          <td>
                            <button
                              type="button"
                              className={`badge border-0 ${item.isActive ? 'bg-success' : 'bg-secondary'}`}
                              style={{ cursor: 'pointer', padding: '5px 9px', borderRadius: '4px' }}
                              onClick={() => handleToggleActive(item)}
                              title="Click to toggle status"
                            >
                              {item.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-2 d-inline-flex align-items-center gap-1"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit product"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger py-1 px-2 d-inline-flex align-items-center gap-1"
                                onClick={() => handleDelete(item._id, item.name)}
                                title="Delete product"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ================== CLEAN GRID VIEW ================== */
              <div className="product-catalog-grid">
                {filteredProducts.map((item) => {
                  const imgUrl = getProductImageUrl(item);
                  const displayPrice = item.price || item.priceHint || item.priceRange;
                  const displaySpecs = Array.isArray(item.specifications)
                    ? item.specifications.join(', ')
                    : item.specifications;

                  return (
                    <div key={item._id} className="product-card-modern">
                      <div
                        className="product-card-modern__media d-flex align-items-center justify-content-center"
                        style={{ backgroundColor: '#F8FAFC' }}
                        onClick={() => imgUrl && setPreviewImage({ url: imgUrl, title: item.name })}
                      >
                        {imgUrl ? (
                          <img src={imgUrl} alt={item.name} />
                        ) : (
                          <div className="text-muted text-center py-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <div className="small mt-1 text-muted">No photo uploaded</div>
                          </div>
                        )}
                        <div className="media-badge-top">
                          <span className="badge-category bg-white shadow-xs">
                            {item.category}
                          </span>
                        </div>
                        <div className="media-status-top">
                          <span className={`badge ${item.isActive ? 'bg-success' : 'bg-secondary'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="product-card-modern__body">
                        <div className="product-card-modern__title">{item.name}</div>
                        {item.description && (
                          <div className="product-card-modern__desc">{item.description}</div>
                        )}
                        {displaySpecs && (
                          <div className="product-card-modern__specs text-truncate" title={displaySpecs}>
                            <span className="fw-semibold">Specs:</span> {displaySpecs}
                          </div>
                        )}
                      </div>

                      <div className="product-card-modern__footer">
                        <div>
                          <div className="text-muted small" style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}>
                            Indicative Price
                          </div>
                          <div className="product-card-modern__price">
                            {displayPrice ? (String(displayPrice).startsWith('₹') ? displayPrice : `₹${displayPrice}`) : 'On Request'}
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2"
                            onClick={() => handleOpenEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => handleDelete(item._id, item.name)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ================== PRODUCT ADD/EDIT MODAL ================== */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow-lg" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold mb-0" style={{ color: 'var(--color-navy)' }}>
                  {editingItem ? `Edit Product: ${editingItem.name}` : 'Add New Product'}
                </h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body p-4" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                  {/* Photo Upload Section */}
                  <div className="mb-4">
                    <label className="field-label mb-1">Product Photo</label>
                    <div className="row g-3 align-items-center">
                      <div className="col-md-4">
                        <div
                          className={`product-upload-box ${formData.imageUrl ? 'has-preview' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="d-none"
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            onChange={handleImageFileChange}
                          />
                          {uploadingImg ? (
                            <div className="py-3">
                              <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                              <div className="small text-muted">Uploading...</div>
                            </div>
                          ) : formData.imageUrl ? (
                            <div>
                              <img
                                src={formData.imageUrl}
                                alt="Preview"
                                style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px' }}
                              />
                              <div className="mt-1 d-flex justify-content-between align-items-center">
                                <span className="small text-primary fw-semibold">Change photo</span>
                                <button
                                  type="button"
                                  className="btn btn-link text-danger p-0 small text-decoration-none"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFormData((prev) => ({ ...prev, imageUrl: '' }));
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-3 text-muted">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-1">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              <div className="small fw-semibold text-primary">Upload Product Photo</div>
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                JPG, PNG, WebP up to 10MB
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-8">
                        <label className="text-muted small mb-1">Or enter Image URL directly:</label>
                        <input
                          type="url"
                          className="form-control-pocika"
                          placeholder="https://your-domain.com/photo.jpg"
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        />
                        <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                          Upload an image file from your computer or paste a direct image URL.
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="my-3 text-muted-custom" />

                  {/* Product Details Form */}
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="field-label">Product Name *</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. ABC Stored Pressure Fire Extinguisher (6 Kg)"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="field-label">Category *</label>
                      <select
                        className="form-control-pocika"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        required
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="field-label">Indicative Price / Range</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. ₹2,500 - ₹3,200 or ₹1,450"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="field-label">Unit of Measure</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. Piece, Set, Metre, Year"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="field-label">Technical Specifications / Capacity</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. Capacity: 6kg | Working Pressure: 15 bar | Discharge: >13s | IS:15683"
                        value={formData.specifications}
                        onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="field-label">Description / Scope & Application Notes</label>
                      <textarea
                        className="form-control-pocika"
                        rows="2"
                        placeholder="Multi-purpose application, suitable fire classes, warranty coverage..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isActiveCheck"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="isActiveCheck">
                          Active Product (Visible to field salespeople in catalog reference)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={saving || uploadingImg}
                  >
                    {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Product'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================== IMAGE ZOOM LIGHTBOX ================== */}
      {previewImage && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content overflow-hidden border-0 shadow-2xl" style={{ borderRadius: '12px' }}>
              <div className="position-relative bg-dark text-center" style={{ minHeight: '300px', maxHeight: '480px' }}>
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3 z-3"
                  onClick={() => setPreviewImage(null)}
                  title="Close preview"
                ></button>
                <img
                  src={previewImage.url}
                  alt={previewImage.title || 'Product'}
                  style={{ maxHeight: '480px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              <div className="modal-footer py-2 px-3 bg-white justify-content-between">
                <span className="fw-semibold text-dark small">{previewImage.title}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-1 px-3"
                  onClick={() => setPreviewImage(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

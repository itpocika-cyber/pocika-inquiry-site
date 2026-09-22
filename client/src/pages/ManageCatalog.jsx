import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import { catalogApi } from '../api/catalogApi';
import { useAuthStore } from '../store/authStore';

const CATEGORIES = [
  'Fire Extinguishers',
  'Fire Alarm & Detection',
  'Fire Hydrant & Suppression',
  'PPE & Safety Equipment',
  'AMC & Refilling Services',
  'Pumps & Accessories',
  'Other'
];

export default function ManageCatalog() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Fire Extinguishers',
    subCategory: '',
    description: '',
    unit: 'Piece',
    price: '',
    specifications: '',
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
      price: item.price !== undefined && item.price !== null ? String(item.price) : '',
      specifications: Array.isArray(item.specifications) ? item.specifications.join(', ') : item.specifications || '',
      isActive: item.isActive !== false
    });
    setShowModal(true);
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
        price: formData.price ? formData.price.trim() : null,
        specifications: formData.specifications
          ? formData.specifications.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
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

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className="admin-layout__sidebar d-none d-lg-block">
        <div className="p-4 border-bottom">
          <div className="h4 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>POCIKA</div>
          <div className="text-muted small">Administration Portal</div>
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
      </nav>

      {/* Main Content Area */}
      <main className="admin-layout__main">
        <header className="admin-layout__header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
          <div>
            <Link to="/admin-dashboard" className="text-muted small text-decoration-none d-block mb-1">
              &larr; Back to Dashboard
            </Link>
            <h1 className="h4 mb-0 fw-bold" style={{ color: 'var(--color-navy)' }}>
              Manage Product Catalog
            </h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link to="/catalog" className="btn btn-sm btn-outline-secondary">
              👁️ View as Salesperson
            </Link>
            <button
              type="button"
              className="btn-pocika btn-pocika-primary btn-sm"
              onClick={handleOpenAdd}
            >
              + Add New Product
            </button>
          </div>
        </header>

        <div className="admin-layout__content p-3 p-md-4 flex-grow-1">
          {/* Filters Bar */}
          <div className="card-pocika p-3 mb-4">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-5">
                <label className="field-label mb-1">Search Products</label>
                <input
                  type="text"
                  className="form-control-pocika"
                  placeholder="Search by product name, specification, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-5">
                <label className="field-label mb-1">Category Filter</label>
                <select
                  className="form-control-pocika"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories ({products.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-2">
                <button
                  type="button"
                  className="btn-pocika btn-pocika-secondary w-100"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('');
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="card-pocika p-4">
            {loading ? (
              <LoadingSpinner message="Loading product catalog..." />
            ) : products.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted mb-3">No products found in this category.</p>
                <button
                  type="button"
                  className="btn-pocika btn-pocika-primary"
                  onClick={handleOpenAdd}
                >
                  Add First Product
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Specifications / Capacity</th>
                      <th>Indicative Price</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item) => (
                      <tr key={item._id}>
                        <td className="fw-semibold">
                          <div>{item.name}</div>
                          {item.description && (
                            <div className="text-muted small text-truncate" style={{ maxWidth: '250px' }}>
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {item.category}
                          </span>
                        </td>
                        <td className="small">
                          {Array.isArray(item.specifications) && item.specifications.length > 0
                            ? item.specifications.join(', ')
                            : '-'}
                        </td>
                        <td className="fw-medium text-primary">
                          {item.price ? (String(item.price).startsWith('₹') ? item.price : `₹${item.price}`) : 'On Request'}
                        </td>
                        <td className="small text-muted">{item.unit || 'Piece'}</td>
                        <td>
                          <button
                            type="button"
                            className={`badge border-0 ${item.isActive ? 'bg-success' : 'bg-secondary'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleToggleActive(item)}
                            title="Click to toggle status"
                          >
                            {item.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2 me-1"
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">
                  {editingItem ? `Edit Product: ${editingItem.name}` : 'Add New Product to Catalog'}
                </h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="field-label">Product Name *</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. ABC Stored Pressure Fire Extinguisher (4 Kg)"
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
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="field-label">Indicative Price / Range</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. ₹1,450 or ₹1,200 - ₹1,800"
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
                      <label className="field-label">Technical Specifications (Comma separated)</label>
                      <input
                        type="text"
                        className="form-control-pocika"
                        placeholder="e.g. IS:15683 certified, MAP 50%, Nitrogen propelled, 15 sec discharge"
                        value={formData.specifications}
                        onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="field-label">Description / Scope Notes</label>
                      <textarea
                        className="form-control-pocika"
                        rows="2"
                        placeholder="Standard applications, suitable fire classes, warranty details..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isActiveCheck"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label small fw-semibold" htmlFor="isActiveCheck">
                          Active (Visible to salespeople in mobile app catalog reference)
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
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Product'}
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

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import { catalogApi } from '../api/catalogApi';

const CATEGORIES = [
  'All',
  'Fire Extinguishers',
  'Fire Alarm & Detection',
  'Fire Hydrant & Suppression',
  'PPE & Safety Equipment',
  'AMC & Refilling Services',
  'Pumps & Accessories',
  'Other'
];

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (activeCategory !== 'All') params.category = activeCategory;
      const res = await catalogApi.getCatalog(params);
      const items = res.data?.items || res.data || [];
      // Only active items for salesperson view
      setProducts(items.filter((x) => x.isActive !== false));
    } catch (err) {
      console.warn('Catalog load error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <Link
              to="/dashboard"
              className="btn-pocika btn-pocika-ghost px-2 py-1 mb-2 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.875rem' }}
            >
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-page-title mb-1">Product Catalog Reference</h1>
            <p className="text-muted-custom mb-0">
              Technical specifications, standard capacities, and indicative pricing for field visits.
            </p>
          </div>
          <Link
            to="/inquiry"
            className="btn-pocika btn-pocika-primary d-inline-flex align-items-center gap-2"
          >
            <span>+ New Inquiry</span>
          </Link>
        </div>

        {/* Search & Category Chips */}
        <div className="card-pocika p-3 mb-4">
          <div className="mb-3">
            <input
              type="text"
              className="form-control-pocika"
              placeholder="Search by product name, specification, application..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="d-flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm py-1 px-3 ${
                  activeCategory === cat
                    ? 'btn-primary text-white fw-semibold'
                    : 'btn-outline-secondary'
                }`}
                style={{ borderRadius: '16px', fontSize: '0.82rem' }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading products..." />
          </div>
        ) : products.length === 0 ? (
          <div className="card-pocika p-5 text-center">
            <div className="fs-1 mb-2">📦</div>
            <h3 className="h5 fw-bold mb-1">No products found</h3>
            <p className="text-muted small mb-3">
              No catalog items match your search or selected category filter.
            </p>
            <button
              type="button"
              className="btn-pocika btn-pocika-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setActiveCategory('All');
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {products.map((item) => (
              <div key={item._id} className="col-md-6 col-lg-4">
                <div className="card-pocika h-100 p-3 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-light text-primary border" style={{ fontSize: '0.75rem' }}>
                        {item.category}
                      </span>
                      {item.unit && (
                        <span className="text-muted small">
                          Per {item.unit}
                        </span>
                      )}
                    </div>
                    <h2 className="fs-6 fw-bold mb-2" style={{ color: 'var(--color-navy)' }}>
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="text-muted small mb-3">
                        {item.description}
                      </p>
                    )}

                    {Array.isArray(item.specifications) && item.specifications.length > 0 && (
                      <div className="mb-3">
                        <span className="text-helper d-block mb-1" style={{ fontSize: '0.72rem' }}>
                          Specifications
                        </span>
                        <div className="d-flex flex-wrap gap-1">
                          {item.specifications.map((spec, sIdx) => (
                            <span
                              key={sIdx}
                              className="badge bg-light text-dark border"
                              style={{ fontSize: '0.72rem' }}
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-top mt-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>
                        Indicative Price
                      </span>
                      <span className="fw-bold text-primary" style={{ fontSize: '1rem' }}>
                        {item.price ? (String(item.price).startsWith('₹') ? item.price : `₹${item.price}`) : 'Quoted on site'}
                      </span>
                    </div>
                    <Link
                      to="/inquiry"
                      className="btn-pocika btn-pocika-ghost btn-sm py-1 px-2"
                      style={{ fontSize: '0.78rem' }}
                    >
                      Use in Inquiry &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

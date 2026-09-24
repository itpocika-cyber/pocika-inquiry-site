import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import { catalogApi } from '../api/catalogApi';
import { CATEGORIES, getProductImageUrl } from '../utils/productImages';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

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
          <div className="d-flex gap-2">
            <Link
              to="/inquiry"
              className="btn-pocika btn-pocika-primary d-inline-flex align-items-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Inquiry</span>
            </Link>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="card-pocika p-3 mb-4">
          <div className="mb-3">
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
                placeholder="Search by product name, specification, capacity..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 pb-1" style={{ overflowX: 'auto' }}>
            {['All', ...CATEGORIES].map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm py-1 px-3 ${
                    isActive
                      ? 'btn-primary text-white fw-semibold'
                      : 'btn-outline-secondary'
                  }`}
                  style={{ borderRadius: '16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="text-center py-5">
            <LoadingSpinner message="Loading products..." />
          </div>
        ) : products.length === 0 ? (
          <div className="card-pocika p-5 text-center">
            <div className="text-muted mb-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
            </div>
            <h3 className="h6 fw-bold mb-1">No products found</h3>
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
            {products.map((item) => {
              const imgUrl = getProductImageUrl(item);
              const displayPrice = item.price || item.priceHint || item.priceRange;
              const displaySpecs = Array.isArray(item.specifications)
                ? item.specifications.join(', ')
                : item.specifications;

              return (
                <div key={item._id} className="col-12 col-md-6 col-lg-4">
                  <div className="card-pocika h-100 p-0 overflow-hidden d-flex flex-column justify-content-between shadow-xs">
                    {/* Product Photo Banner (only if uploaded) */}
                    {imgUrl ? (
                      <div
                        className="position-relative bg-light"
                        style={{ height: '170px', overflow: 'hidden', cursor: 'pointer' }}
                        onClick={() => setSelectedProduct(item)}
                        title="Click to zoom photo"
                      >
                        <img
                          src={imgUrl}
                          alt={item.name}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div className="position-absolute top-0 start-0 m-2">
                          <span className="badge-category bg-white shadow-xs">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 pb-0 d-flex justify-content-between align-items-center">
                        <span className="badge-category">
                          {item.category}
                        </span>
                        <span className="text-muted small">Per {item.unit || 'Piece'}</span>
                      </div>
                    )}

                    <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                      <div>
                        <h2 className="fs-6 fw-bold mb-1" style={{ color: 'var(--color-navy)', lineHeight: 1.35 }}>
                          {item.name}
                        </h2>
                        {item.description && (
                          <p className="text-muted small mb-2" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}

                        {displaySpecs && (
                          <div className="mb-2 p-2 bg-light rounded border" style={{ fontSize: '0.74rem' }}>
                            <span className="text-helper d-block mb-1 fw-semibold">Specifications</span>
                            <span className="text-dark">{displaySpecs}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-top mt-2 d-flex justify-content-between align-items-center">
                        <div>
                          <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>
                            Indicative Price
                          </span>
                          <span className="fw-bold" style={{ fontSize: '1rem', color: 'var(--color-navy)' }}>
                            {displayPrice ? (String(displayPrice).startsWith('₹') ? displayPrice : `₹${displayPrice}`) : 'Quoted on site'}
                          </span>
                        </div>
                        {imgUrl && (
                          <span className="text-muted small">
                            Per {item.unit || 'Piece'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Image Lightbox Modal */}
      {selectedProduct && selectedProduct.imageUrl && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(5px)', zIndex: 1060 }}
          onClick={() => setSelectedProduct(null)}
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
                  onClick={() => setSelectedProduct(null)}
                  title="Close preview"
                ></button>
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  style={{ maxHeight: '480px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              <div className="modal-body p-4 bg-white">
                <span className="badge-category mb-2 d-inline-block">
                  {selectedProduct.category}
                </span>
                <h3 className="fs-5 fw-bold text-dark mb-1">{selectedProduct.name}</h3>

                {selectedProduct.description && (
                  <p className="text-muted small mb-3">{selectedProduct.description}</p>
                )}

                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                  <div>
                    <span className="text-muted small d-block">Indicative Price</span>
                    <span className="fs-6 fw-bold" style={{ color: 'var(--color-navy)' }}>
                      {selectedProduct.price || selectedProduct.priceHint || selectedProduct.priceRange || 'Quoted on site'}
                    </span>
                  </div>
                  <Link
                    to="/inquiry"
                    className="btn-pocika btn-pocika-primary btn-sm"
                    onClick={() => setSelectedProduct(null)}
                  >
                    Create Inquiry &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

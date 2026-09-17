import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

export default function InquiryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    productSpecification: '',
    requirementValue: '',
    expectedOrderValue: '',
    opportunity: '',
    followUpDate: '',
    remarks: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Lightbox State
  const [activePhoto, setActivePhoto] = useState(null);

  // Uploading additional photos
  const photoFileInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inquiries/${id}`);
      if (res.data) {
        setInquiry(res.data);
        setEditForm({
          productSpecification: res.data.requirement?.productSpecification || '',
          requirementValue: res.data.commercial?.requirementValue || '',
          expectedOrderValue: res.data.commercial?.expectedOrderValue || '',
          opportunity: res.data.visit?.opportunity || '',
          followUpDate: res.data.followUp?.followUpDate || '',
          remarks: res.data.remarks || ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load inquiry details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handlePdf = async (isDownload = false) => {
    setPdfGenerating(true);
    try {
      const blob = await api.get(`/inquiries/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));

      if (isDownload) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `POCIKA-Inquiry-${inquiry?.inquiryNumber || id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      alert(`PDF generation failed: ${err.message}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = {
        'requirement.productSpecification': editForm.productSpecification,
        'commercial.requirementValue': editForm.requirementValue ? Number(editForm.requirementValue) : null,
        'commercial.expectedOrderValue': editForm.expectedOrderValue ? Number(editForm.expectedOrderValue) : null,
        'visit.opportunity': editForm.opportunity,
        'followUp.followUpDate': editForm.followUpDate,
        remarks: editForm.remarks
      };

      const res = await api.patch(`/inquiries/${inquiry._id || inquiry.inquiryNumber}`, payload);
      setInquiry(res.data);
      setShowEditModal(false);
    } catch (err) {
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddPhotos = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));

    setUploadingPhotos(true);
    try {
      const res = await api.post(`/inquiries/${inquiry._id || inquiry.inquiryNumber}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.photos) {
        setInquiry({ ...inquiry, photos: res.data.photos });
      }
    } catch (err) {
      alert(`Photo upload failed: ${err.message}`);
    } finally {
      setUploadingPhotos(false);
      if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    }
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

  if (loading) {
    return (
      <div className="app-shell">
        <Header />
        <main className="container-app section-block text-center py-5">
          <p className="text-muted">Loading inquiry details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="app-shell">
        <Header />
        <main className="container-app section-block text-center py-5">
          <div className="alert-pocika alert-danger mb-4">{error || 'Inquiry not found.'}</div>
          <Link to="/inquiries" className="btn-pocika btn-pocika-secondary">
            &larr; Back to Inquiries
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        {/* Back Link & Header Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <Link
              to="/inquiries"
              className="btn-pocika btn-pocika-ghost px-2 py-1 mb-2 d-inline-flex align-items-center gap-1"
              style={{ fontSize: '0.875rem' }}
            >
              &larr; Back to Inquiries
            </Link>
            <h1 className="text-page-title mb-1">
              Inquiry: {inquiry.inquiryNumber}
            </h1>
            <p className="text-muted-custom mb-0">
              Recorded on {formatDate(inquiry.date)} by {inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'}
            </p>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-pocika btn-pocika-secondary"
              onClick={() => setShowEditModal(true)}
            >
              Edit Inquiry
            </button>
            <button
              type="button"
              className="btn-pocika btn-pocika-ghost"
              disabled={pdfGenerating}
              onClick={() => handlePdf(false)}
            >
              {pdfGenerating ? 'Generating...' : 'Preview PDF'}
            </button>
            <button
              type="button"
              className="btn-pocika btn-pocika-ghost"
              disabled={pdfGenerating}
              onClick={() => handlePdf(true)}
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* 2-Column Details Layout */}
        <div className="row g-4">
          {/* Main Info Column */}
          <div className="col-lg-8">
            {/* Customer & Contact */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Customer & Contact Information
              </h2>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="text-helper">Company / Client</div>
                  <div className="fw-semibold">{inquiry.customer?.companyName || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Contact Person</div>
                  <div className="fw-semibold">{inquiry.customer?.contactPerson || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Designation</div>
                  <div>{inquiry.customer?.designation || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Mobile No.</div>
                  <div>{inquiry.customer?.mobile || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Email</div>
                  <div>{inquiry.customer?.email || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">GST No.</div>
                  <div>{inquiry.customer?.gstNo || '-'}</div>
                </div>
                <div className="col-12">
                  <div className="text-helper">Site / Visit Location</div>
                  <div>{inquiry.customer?.siteLocation || '-'}</div>
                </div>
                {inquiry.customer?.billingAddress && (
                  <div className="col-12">
                    <div className="text-helper">Billing Address</div>
                    <div>{inquiry.customer.billingAddress}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Profile */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Customer & Business Profile
              </h2>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="text-helper">Customer Type</div>
                  <div>
                    {inquiry.business?.customerType === 'Retail/Other'
                      ? `Retail/Other (${inquiry.business?.customerTypeOther || ''})`
                      : inquiry.business?.customerType || '-'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Facility</div>
                  <div>
                    {inquiry.business?.facility === 'Other'
                      ? `Other (${inquiry.business?.facilityOther || ''})`
                      : inquiry.business?.facility || '-'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Industry / Business Type</div>
                  <div>{inquiry.business?.industryType || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Location / GIDC</div>
                  <div>{inquiry.business?.locationGidc || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Approx. Area</div>
                  <div>{inquiry.business?.areaSqft ? `${inquiry.business.areaSqft} Sq.Ft.` : '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Facility Status</div>
                  <div>{inquiry.business?.status || '-'}</div>
                </div>
              </div>
            </div>

            {/* Requirement */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Products & Requirements
              </h2>
              <div className="row g-3">
                <div className="col-12">
                  <div className="text-helper mb-1">Products Required</div>
                  <div className="d-flex flex-wrap gap-2">
                    {(inquiry.products || []).map((p, idx) => (
                      <span key={idx} className="badge bg-light text-dark border py-1 px-2">
                        {p === 'Other' && inquiry.productOther ? `Other (${inquiry.productOther})` : p}
                      </span>
                    ))}
                  </div>
                </div>
                {inquiry.requirement?.productSpecification && (
                  <div className="col-12">
                    <div className="text-helper">Specification / Size</div>
                    <div>{inquiry.requirement.productSpecification}</div>
                  </div>
                )}
                <div className="col-sm-6">
                  <div className="text-helper">Estimated Quantity</div>
                  <div>{inquiry.requirement?.estimatedQuantity || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Current Brand / Supplier</div>
                  <div>{inquiry.requirement?.currentBrand || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Procurement Reason</div>
                  <div>{inquiry.requirement?.reason || '-'}</div>
                </div>
              </div>
            </div>

            {/* Commercial */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Commercial & Sales Qualification
              </h2>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="text-helper">Approx. Requirement Value</div>
                  <div className="fw-semibold">
                    {inquiry.commercial?.requirementValue ? `₹${inquiry.commercial.requirementValue.toLocaleString('en-IN')}` : '-'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Expected Order Value</div>
                  <div className="fw-semibold text-primary">
                    {inquiry.commercial?.expectedOrderValue ? `₹${inquiry.commercial.expectedOrderValue.toLocaleString('en-IN')}` : '-'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Budget</div>
                  <div>{inquiry.commercial?.budget || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Payment Terms</div>
                  <div>{inquiry.commercial?.paymentTerms || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Decision Maker</div>
                  <div>
                    {inquiry.commercial?.decisionMakerName || '-'}
                    {inquiry.commercial?.decisionMakerDesignation ? ` (${inquiry.commercial.decisionMakerDesignation})` : ''}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Competitor Brands</div>
                  <div>{inquiry.commercial?.competitors || '-'}</div>
                </div>
              </div>
            </div>

            {/* Site Visit Photos */}
            <div className="card-pocika p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                  Site Visit Photos ({inquiry.photos?.length || 0})
                </h2>
                <div>
                  <input
                    ref={photoFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleAddPhotos}
                  />
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-ghost btn-sm"
                    disabled={uploadingPhotos}
                    onClick={() => photoFileInputRef.current?.click()}
                  >
                    {uploadingPhotos ? 'Uploading...' : '+ Add Photos'}
                  </button>
                </div>
              </div>

              {(!inquiry.photos || inquiry.photos.length === 0) ? (
                <div className="text-center py-4 text-muted small">
                  No photos uploaded for this inquiry yet.
                </div>
              ) : (
                <div className="row g-3">
                  {inquiry.photos.map((photo, idx) => (
                    <div key={idx} className="col-6 col-md-4">
                      <div
                        className="photo-card"
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer'
                        }}
                        onClick={() => setActivePhoto(photo)}
                      >
                        <img
                          src={photo.optimizedUrls?.thumbnail || photo.secureUrl || photo.previewUrl}
                          alt={photo.originalFileName || `Site Photo ${idx + 1}`}
                          style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Quick Summary */}
          <div className="col-lg-4">
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Follow-up & Opportunity
              </h2>

              <div className="mb-3">
                <span className="text-helper d-block mb-1">Current Opportunity</span>
                <span className={`badge-pocika ${getOppBadge(inquiry.visit?.opportunity)}`}>
                  {inquiry.visit?.opportunity || '-'}
                </span>
              </div>

              <div className="mb-3">
                <span className="text-helper d-block mb-1">Next Follow-up Date</span>
                <div className="fw-semibold">{formatDate(inquiry.followUp?.followUpDate)}</div>
              </div>

              <div className="mb-3">
                <span className="text-helper d-block mb-1">Next Action</span>
                <div>
                  {Array.isArray(inquiry.followUp?.nextAction)
                    ? inquiry.followUp.nextAction.join(', ')
                    : inquiry.followUp?.nextAction || '-'}
                </div>
              </div>

              {inquiry.followUp?.quotationDate && (
                <div className="mb-3">
                  <span className="text-helper d-block mb-1">Quotation Date</span>
                  <div>{formatDate(inquiry.followUp.quotationDate)}</div>
                </div>
              )}

              <div className="mb-3">
                <span className="text-helper d-block mb-1">Sales Person</span>
                <div className="fw-medium">{inquiry.salesPerson || '-'}</div>
              </div>

              {/* Manager Review block */}
              <div className="pt-3 border-top">
                <span className="text-helper d-block mb-1">Manager Review</span>
                <span className="badge bg-secondary">
                  {inquiry.managerReview?.status || 'Pending Review'}
                </span>
                {inquiry.managerReview?.remarks && (
                  <p className="small text-muted mt-2 mb-0">
                    "{inquiry.managerReview.remarks}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <h3 className="modal-title fs-5 fw-bold">Edit Inquiry</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="field-label">Requirement / Specifications</label>
                      <textarea
                        className="form-control-pocika"
                        rows="3"
                        value={editForm.productSpecification}
                        onChange={(e) => setEditForm({ ...editForm, productSpecification: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="field-label">Approx. Requirement Value (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control-pocika"
                        value={editForm.requirementValue}
                        onChange={(e) => setEditForm({ ...editForm, requirementValue: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="field-label">Expected Order Value (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control-pocika"
                        value={editForm.expectedOrderValue}
                        onChange={(e) => setEditForm({ ...editForm, expectedOrderValue: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="field-label">Opportunity Rating</label>
                      <select
                        className="form-control-pocika"
                        value={editForm.opportunity}
                        onChange={(e) => setEditForm({ ...editForm, opportunity: e.target.value })}
                      >
                        <option value="HOT">HOT</option>
                        <option value="WARM">WARM</option>
                        <option value="COLD">COLD</option>
                        <option value="FUTURE POTENTIAL">FUTURE POTENTIAL</option>
                        <option value="DEALER DEVELOPMENT">DEALER DEVELOPMENT</option>
                        <option value="NO REQUIREMENT">NO REQUIREMENT</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="field-label">Next Follow-up Date</label>
                      <input
                        type="date"
                        className="form-control-pocika"
                        value={editForm.followUpDate}
                        onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="field-label">Visit Remarks / Notes</label>
                      <textarea
                        className="form-control-pocika"
                        rows="2"
                        value={editForm.remarks}
                        onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={savingEdit}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setActivePhoto(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 rounded-4 overflow-hidden bg-transparent">
              <div className="modal-body text-center p-3">
                <img
                  src={activePhoto.secureUrl || activePhoto.previewUrl}
                  alt={activePhoto.originalFileName || 'Site Photo'}
                  className="img-fluid rounded-3 mb-2"
                  style={{ maxHeight: '75vh', objectFit: 'contain' }}
                />
                <div className="d-flex justify-content-between align-items-center text-white small px-2">
                  <span>{activePhoto.originalFileName || 'Site Photo'}</span>
                  <a
                    href={activePhoto.secureUrl || activePhoto.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pocika btn-pocika-ghost text-white btn-sm"
                  >
                    Open Full Size
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

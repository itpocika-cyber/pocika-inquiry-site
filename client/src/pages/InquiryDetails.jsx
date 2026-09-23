import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../api/client';
import { inquiryApi } from '../api/inquiryApi';
import uploadApi from '../api/uploadApi';
import { useAuthStore } from '../store/authStore';
import { markInquiryAsViewed } from '../utils/notificationTracker';

const rupeeBrackets = [
  'Under ₹50,000',
  '₹50,000–1,00,000',
  '₹1,00,000–2,50,000',
  '₹2,50,000–5,00,000',
  '₹5,00,000–10,00,000',
  '₹10,00,000+'
];

const standardProducts = [
  'ABC Fire Extinguisher',
  'CO2 Fire Extinguisher',
  'DCP/Other Extinguishers',
  'Fire Alarm & Detection',
  'Fire Hydrant',
  'Hose Reel/Hose',
  'Fire Pump/Accessories',
  'PPE/Safety Products',
  'Emergency/Safety Equipment',
  'AMC/Refilling/Maintenance',
  'Other'
];

export default function InquiryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = ['admin', 'super_admin', 'manager'].includes(user?.role);

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('customer');
  const [editForm, setEditForm] = useState({
    companyName: '',
    contactPerson: '',
    designation: '',
    mobile: '',
    email: '',
    gstNo: '',
    billingAddress: '',
    siteLocation: '',
    customerType: '',
    facility: '',
    status: '',
    products: [],
    productSpecification: '',
    estimatedQuantity: '',
    renewalDueDate: '',
    requirementValue: '',
    expectedOrderValue: '',
    budget: '',
    paymentTerms: '',
    opportunity: '',
    dealStatus: 'Pending',
    followUpDate: '',
    quotationDate: '',
    nextAction: [],
    nextVisitType: '',
    nextActionCommitment: '',
    remarks: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [isCustomEditReqValue, setIsCustomEditReqValue] = useState(false);
  const [isCustomEditExpValue, setIsCustomEditExpValue] = useState(false);

  // Lightbox State (index into inquiry.photos)
  const [activePhotoIdx, setActivePhotoIdx] = useState(null);

  // Uploading additional photos
  const photoFileInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Company Visit History State
  const [companyHistory, setCompanyHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Comments Thread State
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Manager Review State
  const [editingReview, setEditingReview] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('Reviewed');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const populateEditForm = (data) => {
    const reqVal = data.commercial?.requirementValue || '';
    const expVal = data.commercial?.expectedOrderValue || '';
    setEditForm({
      companyName: data.customer?.companyName || '',
      contactPerson: data.customer?.contactPerson || '',
      designation: data.customer?.designation || '',
      mobile: data.customer?.mobile || '',
      email: data.customer?.email || '',
      gstNo: data.customer?.gstNo || '',
      billingAddress: data.customer?.billingAddress || '',
      siteLocation: data.customer?.siteLocation || '',
      customerType: data.business?.customerType || '',
      facility: data.business?.facility || '',
      status: data.business?.status || '',
      products: Array.isArray(data.products) ? [...data.products] : [],
      productSpecification: data.requirement?.productSpecification || '',
      estimatedQuantity: data.requirement?.estimatedQuantity || '',
      renewalDueDate: data.requirement?.renewalDueDate || '',
      requirementValue: reqVal,
      expectedOrderValue: expVal,
      budget: data.commercial?.budget || '',
      paymentTerms: data.commercial?.paymentTerms || '',
      opportunity: data.visit?.opportunity || 'WARM',
      dealStatus: data.followUp?.dealStatus || 'Pending',
      followUpDate: data.followUp?.followUpDate || '',
      quotationDate: data.followUp?.quotationDate || '',
      nextAction: Array.isArray(data.followUp?.nextAction) ? [...data.followUp.nextAction] : [],
      nextVisitType: data.followUp?.nextVisitType || 'Follow-up',
      nextActionCommitment: data.followUp?.nextActionCommitment || '',
      remarks: data.remarks || ''
    });
    setIsCustomEditReqValue(Boolean(reqVal && !rupeeBrackets.includes(reqVal)));
    setIsCustomEditExpValue(Boolean(expVal && !rupeeBrackets.includes(expVal)));
    setActiveEditTab('customer');
  };

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inquiries/${id}`);
      if (res.data) {
        setInquiry(res.data);
        markInquiryAsViewed(res.data._id, res.data.inquiryNumber);
        populateEditForm(res.data);
        setReviewStatus(res.data.managerReview?.status || 'Reviewed');
        setReviewRemarks(res.data.managerReview?.remarks || '');
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

  // Load other visits to the same company
  useEffect(() => {
    if (!inquiry?.customer?.companyName) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const params = new URLSearchParams({
          companyName: inquiry.customer.companyName,
          excludeId: inquiry._id || inquiry.inquiryNumber
        });
        if (inquiry.customer.mobile) {
          params.append('mobile', inquiry.customer.mobile);
        }

        const res = await api.get(`/inquiries/company-history?${params.toString()}`);
        if (res.data?.inquiries) {
          setCompanyHistory(res.data.inquiries);
        }
      } catch (err) {
        console.warn('Failed to load company history:', err.message);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [inquiry?._id, inquiry?.customer?.companyName]);

  const handlePdf = async (isDownload = false) => {
    const targetId = inquiry?.inquiryNumber || id;
    if (!targetId) return;

    setPdfGenerating(true);
    try {
      const downloadParam = isDownload ? '?download=true' : '';
      const response = await api.get(`/inquiries/${targetId}/pdf${downloadParam}`, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      if (isDownload) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `POCIKA-Inquiry-${targetId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } else {
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Could not generate PDF: ${err.message || 'Please check server logs.'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = {
        customer: {
          ...(inquiry.customer || {}),
          companyName: editForm.companyName,
          contactPerson: editForm.contactPerson,
          designation: editForm.designation,
          mobile: editForm.mobile,
          email: editForm.email,
          gstNo: editForm.gstNo,
          billingAddress: editForm.billingAddress,
          siteLocation: editForm.siteLocation
        },
        business: {
          ...(inquiry.business || {}),
          customerType: editForm.customerType,
          facility: editForm.facility,
          status: editForm.status
        },
        products: editForm.products,
        requirement: {
          ...(inquiry.requirement || {}),
          productSpecification: editForm.productSpecification,
          estimatedQuantity: editForm.estimatedQuantity,
          renewalDueDate: editForm.renewalDueDate || null
        },
        commercial: {
          ...(inquiry.commercial || {}),
          requirementValue: editForm.requirementValue || null,
          expectedOrderValue: editForm.expectedOrderValue || null,
          budget: editForm.budget,
          paymentTerms: editForm.paymentTerms
        },
        visit: {
          ...(inquiry.visit || {}),
          opportunity: editForm.opportunity
        },
        followUp: {
          ...(inquiry.followUp || {}),
          dealStatus: editForm.dealStatus,
          followUpDate: editForm.followUpDate,
          quotationDate: editForm.quotationDate || null,
          nextAction: editForm.nextAction,
          nextVisitType: editForm.nextVisitType,
          nextActionCommitment: editForm.nextActionCommitment
        },
        remarks: editForm.remarks
      };

      const targetId = inquiry._id || inquiry.inquiryNumber;
      const res = await api.patch(`/inquiries/${targetId}`, payload);
      setInquiry(res.data);
      setShowEditModal(false);
    } catch (err) {
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    setSavingReview(true);
    try {
      const targetId = inquiry._id || inquiry.inquiryNumber;
      const res = await api.patch(`/inquiries/${targetId}`, {
        managerReview: {
          status: reviewStatus,
          remarks: reviewRemarks
        }
      });
      setInquiry(res.data);
      setEditingReview(false);
    } catch (err) {
      alert(`Failed to update manager review: ${err.message}`);
    } finally {
      setSavingReview(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const targetId = inquiry._id || inquiry.inquiryNumber;
      const res = await inquiryApi.addComment(targetId, newComment.trim());
      if (res.data?.comments) {
        setInquiry({ ...inquiry, comments: res.data.comments });
      } else {
        fetchDetails();
      }
      setNewComment('');
    } catch (err) {
      alert(`Failed to post comment: ${err.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddPhotos = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));

    setUploadingPhotos(true);
    try {
      const res = await uploadApi.uploadPhotos(inquiry._id || inquiry.inquiryNumber, formData);
      const updatedPhotos = res?.data?.photos || res?.photos;
      if (updatedPhotos) {
        setInquiry((prev) => ({ ...prev, photos: updatedPhotos }));
      }
    } catch (err) {
      alert(`Photo upload failed: ${err.response?.data?.error?.message || err.message}`);
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

  const formatCurrency = (val) => {
    if (!val) return '-';
    if (typeof val === 'number') return `₹${val.toLocaleString('en-IN')}`;
    if (typeof val === 'string' && val.startsWith('₹')) return val;
    if (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
      return `₹${Number(val).toLocaleString('en-IN')}`;
    }
    return val;
  };

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <div className="app-shell">
        <Header />
        <main className="container-app section-block text-center py-5">
          <LoadingSpinner message="Loading inquiry details..." />
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

  const currentDealStatus = inquiry.followUp?.dealStatus || 'Pending';

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
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <h1 className="text-page-title mb-0">
                Inquiry: {inquiry.inquiryNumber}
              </h1>
              <span
                className={`badge px-2 py-1 ${
                  currentDealStatus === 'Won'
                    ? 'bg-success text-white'
                    : currentDealStatus === 'Lost'
                    ? 'bg-danger text-white'
                    : 'bg-warning text-dark'
                }`}
                style={{ fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px' }}
              >
                {currentDealStatus === 'Won' ? '✓ Deal Won' : currentDealStatus === 'Lost' ? '✗ Deal Lost' : '⏳ Deal Pending'}
              </span>
            </div>
            <p className="text-muted-custom mb-0">
              Recorded on {formatDate(inquiry.date)} by {inquiry.salesPerson || inquiry.createdBy?.name || 'Sales Representative'}
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">

            {canEdit && (
              <button
                type="button"
                className="btn-pocika btn-pocika-secondary"
                onClick={() => {
                  populateEditForm(inquiry);
                  setShowEditModal(true);
                }}
              >
                Edit Inquiry
              </button>
            )}
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
                  <div className="text-helper">Floors / Basement</div>
                  <div>
                    {[
                      inquiry.business?.floors ? `${inquiry.business.floors} Floors` : null,
                      inquiry.business?.basement && inquiry.business.basement !== 'None' ? inquiry.business.basement : null
                    ].filter(Boolean).join(' + ') || '-'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Facility Status</div>
                  <div>{inquiry.business?.status || '-'}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Expected Requirement Date</div>
                  <div>{inquiry.business?.expectedDate || '-'}</div>
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
                {inquiry.requirement?.renewalDueDate && (
                  <div className="col-sm-6">
                    <div className="text-helper">AMC / Contract Expiry Date</div>
                    <div className="fw-semibold text-primary">
                      {formatDate(inquiry.requirement.renewalDueDate)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Commercial */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Commercial & Sales Qualification
              </h2>
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="text-helper">Approx. Order Value</div>
                  <div className="fw-semibold">
                    {formatCurrency(inquiry.commercial?.requirementValue)}
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="text-helper">Expected Order Value</div>
                  <div className="fw-semibold text-primary">
                    {formatCurrency(inquiry.commercial?.expectedOrderValue)}
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
                      <PhotoItem
                        photo={photo}
                        idx={idx}
                        onSelect={() => setActivePhotoIdx(idx)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shared Admin ↔ Salesperson Comments Thread */}
            <div className="card-pocika p-4 mb-4">
              <h2 className="text-field-label border-bottom pb-2 mb-3" style={{ fontSize: '1.1rem' }}>
                Discussion & Internal Notes ({inquiry.comments?.length || 0})
              </h2>

              <div className="comment-list mb-3" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {(!inquiry.comments || inquiry.comments.length === 0) ? (
                  <div className="text-muted small py-3 text-center">
                    No comments posted yet. Add a note or question below.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {inquiry.comments.map((c, i) => (
                      <div
                        key={c.commentId || i}
                        className="p-3 rounded-3 border bg-light"
                        style={{ fontSize: '0.9rem' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-dark">
                            {c.author?.name || 'User'}
                            <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>
                              {c.author?.role || 'team'}
                            </span>
                          </span>
                          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            {formatDate(c.createdAt)} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment}>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control-pocika"
                    placeholder="Add an internal note or reply to sales/admin..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submittingComment}
                  />
                  <button
                    type="submit"
                    className="btn-pocika btn-pocika-primary"
                    disabled={submittingComment || !newComment.trim()}
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </form>
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
                <span className="text-helper d-block mb-1">Deal Status</span>
                <span
                  className={`badge ${
                    currentDealStatus === 'Won'
                      ? 'bg-success'
                      : currentDealStatus === 'Lost'
                      ? 'bg-danger'
                      : 'bg-warning text-dark'
                  }`}
                >
                  {currentDealStatus}
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
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-helper d-block">Manager Review</span>
                  {isManagerOrAdmin && !editingReview && (
                    <button
                      type="button"
                      className="btn-pocika btn-pocika-ghost btn-sm py-0 px-1 text-primary"
                      onClick={() => setEditingReview(true)}
                    >
                      Update
                    </button>
                  )}
                </div>

                {!editingReview ? (
                  <>
                    <span
                      className={`badge ${
                        inquiry.managerReview?.status === 'Approved'
                          ? 'bg-success'
                          : inquiry.managerReview?.status === 'Rejected'
                          ? 'bg-danger'
                          : inquiry.managerReview?.status === 'Needs Follow-up'
                          ? 'bg-warning text-dark'
                          : inquiry.managerReview?.status === 'Reviewed'
                          ? 'bg-info text-dark'
                          : 'bg-secondary'
                      }`}
                    >
                      {inquiry.managerReview?.status || 'Pending Review'}
                    </span>
                    {inquiry.managerReview?.remarks && (
                      <p className="small text-muted mt-2 mb-0" style={{ fontStyle: 'italic' }}>
                        "{inquiry.managerReview.remarks}"
                      </p>
                    )}
                    {inquiry.managerReview?.reviewedAt && (
                      <div className="text-muted small mt-1" style={{ fontSize: '0.75rem' }}>
                        Reviewed {formatDate(inquiry.managerReview.reviewedAt)} by {inquiry.managerReview.reviewedBy || 'Manager'}
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleSaveReview} className="mt-2">
                    <div className="mb-2">
                      <select
                        className="form-control-pocika form-select-sm"
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Reviewed">Reviewed</option>
                        <option value="Needs Follow-up">Needs Follow-up</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="mb-2">
                      <textarea
                        className="form-control-pocika"
                        rows="2"
                        placeholder="Internal notes (admin-only, excluded from PDF)..."
                        value={reviewRemarks}
                        onChange={(e) => setReviewRemarks(e.target.value)}
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="submit"
                        className="btn-pocika btn-pocika-primary btn-sm"
                        disabled={savingReview}
                      >
                        {savingReview ? 'Saving...' : 'Save Review'}
                      </button>
                      <button
                        type="button"
                        className="btn-pocika btn-pocika-secondary btn-sm"
                        onClick={() => setEditingReview(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Other Visits to This Company Card */}
            <div className="card-pocika p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                  Other Visits to This Company
                </h2>
                {companyHistory.length > 0 && (
                  <span className="badge bg-light text-primary border small">
                    {companyHistory.length}
                  </span>
                )}
              </div>

              {loadingHistory ? (
                <div className="text-muted small py-2">Loading previous visits...</div>
              ) : companyHistory.length === 0 ? (
                <div className="text-muted small py-2">
                  No other recorded visits for this company.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {companyHistory.map((hInq) => (
                    <div key={hInq._id || hInq.inquiryNumber} className="border-bottom pb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <Link
                          to={`/inquiries/${hInq.inquiryNumber || hInq._id}`}
                          className="fw-semibold text-primary text-decoration-none small"
                        >
                          {hInq.inquiryNumber}
                        </Link>
                        <span
                          className={`badge-pocika ${getOppBadge(hInq.visit?.opportunity)}`}
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          {hInq.visit?.opportunity || '-'}
                        </span>
                      </div>
                      <div className="text-muted small">
                        {formatDate(hInq.date)} · {hInq.salesPerson || 'Sales'}
                      </div>
                      {hInq.visit?.personMet && (
                        <div className="text-helper small text-truncate mt-1">
                          Met: {hInq.visit.personMet}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Multi-Tab Full Edit Modal for Admin / Manager */}
      {showEditModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content shadow border-0" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom flex-column align-items-stretch pb-0">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h3 className="modal-title fs-5 fw-bold m-0">Edit Inquiry ({inquiry.inquiryNumber})</h3>
                    <span className="text-muted small">Admin / Manager Master Edit Mode</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowEditModal(false)}
                    aria-label="Close"
                  ></button>
                </div>

                <ul className="nav nav-tabs border-0 gap-1" role="tablist">
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link py-2 px-3 fw-semibold ${activeEditTab === 'customer' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveEditTab('customer')}
                    >
                      👤 Customer & Site
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link py-2 px-3 fw-semibold ${activeEditTab === 'products' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveEditTab('products')}
                    >
                      📦 Products & Scope
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link py-2 px-3 fw-semibold ${activeEditTab === 'commercial' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveEditTab('commercial')}
                    >
                      💰 Commercial & Deal
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      type="button"
                      className={`nav-link py-2 px-3 fw-semibold ${activeEditTab === 'followup' ? 'active text-primary' : 'text-muted'}`}
                      onClick={() => setActiveEditTab('followup')}
                    >
                      📅 Follow-up & Notes
                    </button>
                  </li>
                </ul>
              </div>

              <form onSubmit={handleSaveEdit}>
                <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {/* TAB 1: Customer & Site */}
                  {activeEditTab === 'customer' && (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="field-label mb-1">Company / Client Name *</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.companyName}
                          onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="field-label mb-1">Contact Person *</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.contactPerson}
                          onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">Designation</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.designation}
                          onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">Mobile No. *</label>
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          className="form-control-pocika"
                          value={editForm.mobile}
                          onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value.replace(/\D/g, '') })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">Email</label>
                        <input
                          type="email"
                          className="form-control-pocika"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">GST No.</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.gstNo}
                          onChange={(e) => setEditForm({ ...editForm, gstNo: e.target.value.toUpperCase() })}
                          placeholder="24AAAAA0000A1Z5"
                        />
                      </div>
                      <div className="col-md-8">
                        <label className="field-label mb-1">Site / Visit Location *</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.siteLocation}
                          onChange={(e) => setEditForm({ ...editForm, siteLocation: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="field-label mb-1">Company / Billing Address</label>
                        <textarea
                          rows="2"
                          className="form-control-pocika"
                          value={editForm.billingAddress}
                          onChange={(e) => setEditForm({ ...editForm, billingAddress: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Products & Scope */}
                  {activeEditTab === 'products' && (
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="field-label mb-1">Customer Type</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.customerType}
                          onChange={(e) => setEditForm({ ...editForm, customerType: e.target.value })}
                        >
                          <option value="">Select Customer Type...</option>
                          <option value="GIDC/Industrial">GIDC/Industrial</option>
                          <option value="Developer/Builder">Developer/Builder</option>
                          <option value="Corporate">Corporate</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Dealer/Distributor">Dealer/Distributor</option>
                          <option value="Consultant">Consultant</option>
                          <option value="Retail/Other">Retail/Other</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">Facility Type</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.facility}
                          onChange={(e) => setEditForm({ ...editForm, facility: e.target.value })}
                        >
                          <option value="">Select Facility...</option>
                          <option value="Factory">Factory</option>
                          <option value="Warehouse">Warehouse</option>
                          <option value="Commercial Site">Commercial Site</option>
                          <option value="Residential Project">Residential Project</option>
                          <option value="Office">Office</option>
                          <option value="Hospital">Hospital</option>
                          <option value="Hotel">Hotel</option>
                          <option value="School/Institution">School/Institution</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="field-label mb-1">Site Status</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        >
                          <option value="">Select Status...</option>
                          <option value="New">New</option>
                          <option value="Existing">Existing</option>
                          <option value="Under Construction">Under Construction</option>
                          <option value="Expansion/Modification">Expansion/Modification</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-2">Products / Quotation Needed (Add-on or remove products)</label>
                        <div className="d-flex flex-wrap gap-2">
                          {standardProducts.map((p) => {
                            const isChecked = editForm.products?.includes(p);
                            return (
                              <button
                                key={p}
                                type="button"
                                className={`btn btn-sm ${isChecked ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                                style={{ fontSize: '0.8rem', borderRadius: '18px', padding: '4px 12px' }}
                                onClick={() => {
                                  const updated = isChecked
                                    ? editForm.products.filter((item) => item !== p)
                                    : [...(editForm.products || []), p];
                                  setEditForm({ ...editForm, products: updated });
                                }}
                              >
                                {isChecked && <span className="me-1">✓</span>}
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-1">Requirement / Specifications</label>
                        <textarea
                          className="form-control-pocika"
                          rows="3"
                          value={editForm.productSpecification}
                          onChange={(e) => setEditForm({ ...editForm, productSpecification: e.target.value })}
                          placeholder="Technical models, quantities per location, or specific product codes..."
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Estimated Quantity (Units)</label>
                        <input
                          type="number"
                          className="form-control-pocika"
                          value={editForm.estimatedQuantity}
                          onChange={(e) => setEditForm({ ...editForm, estimatedQuantity: e.target.value })}
                          placeholder="e.g. 25"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="field-label mb-1">AMC / Refilling Due Date</label>
                        <input
                          type="date"
                          className="form-control-pocika"
                          value={editForm.renewalDueDate}
                          onChange={(e) => setEditForm({ ...editForm, renewalDueDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Commercial & Deal */}
                  {activeEditTab === 'commercial' && (
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="field-label mb-2">Deal Status</label>
                        <div className="d-flex gap-2">
                          {[
                            { val: 'Pending', label: '⏳ Pending', cls: 'btn-outline-warning text-dark' },
                            { val: 'Won', label: '✓ Won (Closed Order)', cls: 'btn-outline-success' },
                            { val: 'Lost', label: '✗ Lost (Deal Closed)', cls: 'btn-outline-danger' }
                          ].map((st) => (
                            <button
                              key={st.val}
                              type="button"
                              className={`btn py-2 px-3 fw-bold ${editForm.dealStatus === st.val ? (st.val === 'Won' ? 'btn-success text-white' : st.val === 'Lost' ? 'btn-danger text-white' : 'btn-warning text-dark') : st.cls}`}
                              onClick={() => setEditForm({ ...editForm, dealStatus: st.val })}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Opportunity Rating</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.opportunity}
                          onChange={(e) => setEditForm({ ...editForm, opportunity: e.target.value })}
                        >
                          <option value="HOT">🔴 HOT</option>
                          <option value="WARM">🟠 WARM</option>
                          <option value="COLD">⚪ COLD</option>
                          <option value="FUTURE POTENTIAL">🔵 FUTURE POTENTIAL</option>
                          <option value="DEALER DEVELOPMENT">🟣 DEALER DEVELOPMENT</option>
                          <option value="NO REQUIREMENT">⚫ NO REQUIREMENT</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Budget</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.budget}
                          onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                        >
                          <option value="">Select Budget status...</option>
                          <option value="Available">Available</option>
                          <option value="Not Available">Not Available</option>
                          <option value="To Be Discussed">To Be Discussed</option>
                        </select>
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Approx. Order Value (₹)</label>
                        {isCustomEditReqValue ? (
                          <div className="position-relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="form-control-pocika pe-5"
                              placeholder="Type amount in ₹ (e.g. 250000)"
                              value={editForm.requirementValue}
                              autoFocus
                              onChange={(e) => {
                                const val = e.target.value;
                                const oldReq = editForm.requirementValue;
                                const updated = { ...editForm, requirementValue: val };
                                if (!editForm.expectedOrderValue || editForm.expectedOrderValue === oldReq) {
                                  updated.expectedOrderValue = val;
                                }
                                setEditForm(updated);
                              }}
                            />
                            <button
                              type="button"
                              className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                              title="Switch to dropdown list"
                              onClick={() => {
                                setIsCustomEditReqValue(false);
                                setEditForm({ ...editForm, requirementValue: '' });
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <select
                            className="form-control-pocika form-select"
                            value={rupeeBrackets.includes(editForm.requirementValue) ? editForm.requirementValue : ''}
                            onChange={(e) => {
                              if (e.target.value === 'Other') {
                                setIsCustomEditReqValue(true);
                                setEditForm({ ...editForm, requirementValue: '' });
                              } else {
                                const val = e.target.value;
                                const oldReq = editForm.requirementValue;
                                const updated = { ...editForm, requirementValue: val };
                                if (!editForm.expectedOrderValue || editForm.expectedOrderValue === oldReq) {
                                  updated.expectedOrderValue = val;
                                }
                                setEditForm(updated);
                              }
                            }}
                          >
                            <option value="">Select Approx Value Range...</option>
                            {rupeeBrackets.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                            <option value="Other">Other (Enter custom amount)...</option>
                          </select>
                        )}
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Expected Order Value (₹)</label>
                        {isCustomEditExpValue ? (
                          <div className="position-relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="form-control-pocika pe-5"
                              placeholder="Type amount in ₹ (e.g. 200000)"
                              value={editForm.expectedOrderValue}
                              autoFocus
                              onChange={(e) => setEditForm({ ...editForm, expectedOrderValue: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                              title="Switch to dropdown list"
                              onClick={() => {
                                setIsCustomEditExpValue(false);
                                setEditForm({ ...editForm, expectedOrderValue: '' });
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <select
                            className="form-control-pocika form-select"
                            value={rupeeBrackets.includes(editForm.expectedOrderValue) ? editForm.expectedOrderValue : ''}
                            onChange={(e) => {
                              if (e.target.value === 'Other') {
                                setIsCustomEditExpValue(true);
                                setEditForm({ ...editForm, expectedOrderValue: '' });
                              } else {
                                setEditForm({ ...editForm, expectedOrderValue: e.target.value });
                              }
                            }}
                          >
                            <option value="">Select Expected Value Range...</option>
                            {rupeeBrackets.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                            <option value="Other">Other (Enter custom amount)...</option>
                          </select>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-1">Payment Terms Expected</label>
                        <input
                          type="text"
                          className="form-control-pocika"
                          value={editForm.paymentTerms}
                          onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                          placeholder="e.g. 30 Days Credit, 50% Adv + 50% Delivery"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Follow-up & Notes */}
                  {activeEditTab === 'followup' && (
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="field-label mb-1">Next Follow-up Date</label>
                        <input
                          type="date"
                          className="form-control-pocika"
                          value={editForm.followUpDate}
                          onChange={(e) => setEditForm({ ...editForm, followUpDate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="field-label mb-1">Send Quotation By</label>
                        <input
                          type="date"
                          className="form-control-pocika"
                          value={editForm.quotationDate}
                          onChange={(e) => setEditForm({ ...editForm, quotationDate: e.target.value })}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="field-label mb-1">Next Planned Interaction</label>
                        <select
                          className="form-control-pocika form-select"
                          value={editForm.nextVisitType}
                          onChange={(e) => setEditForm({ ...editForm, nextVisitType: e.target.value })}
                        >
                          <option value="Follow-up">Follow-up Call</option>
                          <option value="Site Visit">Site Visit</option>
                          <option value="Dealer Meeting">Dealer Meeting</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-2">Next Actions to take</label>
                        <div className="d-flex flex-wrap gap-2">
                          {['Quotation', 'Product Demo', 'Sample', 'Technical Discussion', 'Management Meeting'].map((act) => {
                            const isActChecked = editForm.nextAction?.includes(act);
                            return (
                              <button
                                key={act}
                                type="button"
                                className={`btn btn-sm ${isActChecked ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                                style={{ fontSize: '0.8rem', borderRadius: '18px', padding: '4px 12px' }}
                                onClick={() => {
                                  const updatedActs = isActChecked
                                    ? editForm.nextAction.filter((a) => a !== act)
                                    : [...(editForm.nextAction || []), act];
                                  setEditForm({ ...editForm, nextAction: updatedActs });
                                }}
                              >
                                {isActChecked && <span className="me-1">✓</span>}
                                {act}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-1">Next Action / Commitment</label>
                        <textarea
                          className="form-control-pocika"
                          rows="2"
                          value={editForm.nextActionCommitment}
                          onChange={(e) => setEditForm({ ...editForm, nextActionCommitment: e.target.value })}
                          placeholder="e.g. Will share revised quotation by Friday..."
                        />
                      </div>

                      <div className="col-12">
                        <label className="field-label mb-1">Visit Remarks / Notes</label>
                        <textarea
                          className="form-control-pocika"
                          rows="2"
                          value={editForm.remarks}
                          onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                          placeholder="Add any special observations or admin notes..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer border-top d-flex justify-content-between">
                  <div className="text-muted small">
                    Changes will be saved and recorded in the audit log.
                  </div>
                  <div className="d-flex gap-2">
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
                      {savingEdit ? 'Saving All Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal with Full-size Zoom & Navigation */}
      {activePhotoIdx !== null && inquiry.photos?.[activePhotoIdx] && (
        <PhotoModal
          photos={inquiry.photos}
          activeIndex={activePhotoIdx}
          onClose={() => setActivePhotoIdx(null)}
          onNavigate={(newIdx) => setActivePhotoIdx(newIdx)}
        />
      )}
    </div>
  );
}

function PhotoItem({ photo, idx, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = photo.optimizedUrls?.thumbnail || photo.secureUrl || photo.url || photo.previewUrl;
  const displayName = photo.caption || photo.originalFileName || photo.fileName || `Site Photo ${idx + 1}`;

  return (
    <div
      className="photo-card position-relative"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer'
      }}
      onClick={onSelect}
    >
      {!imgFailed && imgUrl ? (
        <img
          src={imgUrl}
          alt={displayName}
          style={{ width: '100%', height: '160px', objectFit: 'cover' }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="photo-fallback-card d-flex flex-column align-items-center justify-content-center p-3 text-center"
          style={{ height: '160px', background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-secondary">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span className="small text-truncate w-100 fw-semibold">{displayName}</span>
          <span className="small text-muted">{photo.sizeKB ? `${photo.sizeKB} KB` : 'Attached'}</span>
        </div>
      )}

      {photo.latitude && photo.longitude && (
        <div className="position-absolute bottom-0 start-0 m-2">
          <span
            className="badge bg-dark bg-opacity-75 text-white"
            style={{ fontSize: '0.68rem', padding: '3px 6px' }}
          >
            📍 Location recorded
          </span>
        </div>
      )}
    </div>
  );
}

function PhotoModal({ photos, activeIndex, onClose, onNavigate }) {
  const [failed, setFailed] = useState(false);
  const photo = photos[activeIndex];
  const fullUrl = photo?.optimizedUrls?.full || photo?.optimizedUrls?.preview || photo?.secureUrl || photo?.url || photo?.previewUrl;
  const name = photo?.caption || photo?.originalFileName || photo?.fileName || `Site Photo ${activeIndex + 1}`;

  // Keyboard navigation listener (Left, Right, Escape)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && activeIndex > 0) onNavigate(activeIndex - 1);
      else if (e.key === 'ArrowRight' && activeIndex < photos.length - 1) onNavigate(activeIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, photos.length]);

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1065 }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-xl position-relative"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px' }}
      >
        <div className="modal-content border-0 rounded-4 overflow-hidden bg-transparent">
          {/* Close button top right */}
          <button
            type="button"
            className="btn btn-dark text-white rounded-circle position-absolute top-0 end-0 m-3 z-3"
            style={{ width: '40px', height: '40px', lineHeight: '1' }}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>

          <div className="modal-body text-center p-2 position-relative">
            {/* Prev / Next buttons */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  className="btn btn-dark bg-opacity-75 text-white position-absolute top-50 start-0 translate-middle-y ms-2 rounded-circle z-2"
                  style={{ width: '44px', height: '44px' }}
                  disabled={activeIndex === 0}
                  onClick={() => onNavigate(activeIndex - 1)}
                  aria-label="Previous photo"
                >
                  &#10094;
                </button>
                <button
                  type="button"
                  className="btn btn-dark bg-opacity-75 text-white position-absolute top-50 end-0 translate-middle-y me-2 rounded-circle z-2"
                  style={{ width: '44px', height: '44px' }}
                  disabled={activeIndex === photos.length - 1}
                  onClick={() => onNavigate(activeIndex + 1)}
                  aria-label="Next photo"
                >
                  &#10095;
                </button>
              </>
            )}

            {!failed && fullUrl ? (
              <img
                src={fullUrl}
                alt={name}
                className="img-fluid rounded-3 mb-2"
                style={{ maxHeight: '78vh', objectFit: 'contain' }}
                onError={() => setFailed(true)}
              />
            ) : (
              <div className="p-5 bg-dark text-white rounded-3 mb-2 text-center">
                <p className="mb-1 fw-bold">{name}</p>
                <p className="text-white-50 small mb-0">Image preview unavailable for this legacy record. Size: {photo.sizeKB || 0} KB</p>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center text-white small px-3 py-2 bg-dark bg-opacity-50 rounded-bottom">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-semibold">{name}</span>
                <span className="text-white-50">
                  ({activeIndex + 1} of {photos.length})
                </span>
                {photo.latitude && photo.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${photo.latitude},${photo.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="badge bg-primary text-white text-decoration-none"
                    title="Open coordinates in Google Maps"
                  >
                    📍 Maps
                  </a>
                )}
              </div>
              {fullUrl && !failed && (
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline-light"
                >
                  Full Resolution &nearr;
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

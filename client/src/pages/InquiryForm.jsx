import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Stepper from '../components/Stepper';
import PhotoUploader from '../components/PhotoUploader';
import ReviewSummary from '../components/ReviewSummary';
import DiscardModal from '../components/DiscardModal';
import { useInquiryFormStore } from '../store/inquiryFormStore';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const standardDesignations = [
  'Plant Head / Factory Manager',
  'Safety Officer / EHS Manager',
  'Purchase Manager / Procurement',
  'Owner / Director / MD',
  'Maintenance / Facility Manager',
  'Project Manager / EPC Head',
  'Admin / HR Head',
  'Consultant / Architect'
];

const orderValueBrackets = [
  'Under ₹50,000',
  '₹50,000–1,00,000',
  '₹1,00,000–2,50,000',
  '₹2,50,000–5,00,000',
  '₹5,00,000–10,00,000',
  '₹10,00,000+'
];

const standardPaymentTerms = [
  '100% Advance',
  '50% Adv + 50% Delivery',
  '30 Days Credit',
  '15 Days Credit'
];

const standardCompetitors = [
  'Ceasefire',
  'Minimax',
  'Safex',
  'Kanex',
  'Local Dealer',
  'None / Direct Client'
];

export default function InquiryForm() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentStep,
    totalSteps,
    formData,
    validationErrors,
    isSubmitting,
    submissionError,
    draftStatus,
    hasRestoredDraft,
    setField,
    toggleArrayItem,
    addPhotoFiles,
    removePhoto,
    goToStep,
    nextStep,
    prevStep,
    initDraft,
    dismissRestoredAlert,
    clearDraft,
    submitInquiry,
    prefillCompanyDetails
  } = useInquiryFormStore();

  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [isCustomReqValue, setIsCustomReqValue] = useState(false);
  const [isCustomExpValue, setIsCustomExpValue] = useState(false);
  const [isCustomPaymentTerms, setIsCustomPaymentTerms] = useState(false);
  const [isCustomCompetitor, setIsCustomCompetitor] = useState(false);

  useEffect(() => {
    if (
      formData.customer?.designation &&
      !standardDesignations.includes(formData.customer.designation) &&
      formData.customer.designation !== 'Other'
    ) {
      setIsCustomDesignation(true);
    }
  }, [formData.customer?.designation]);

  useEffect(() => {
    if (
      formData.commercial?.requirementValue &&
      !orderValueBrackets.includes(formData.commercial.requirementValue) &&
      formData.commercial.requirementValue !== 'Other'
    ) {
      setIsCustomReqValue(true);
    }
  }, [formData.commercial?.requirementValue]);

  useEffect(() => {
    if (
      formData.commercial?.expectedOrderValue &&
      !orderValueBrackets.includes(formData.commercial.expectedOrderValue) &&
      formData.commercial.expectedOrderValue !== 'Other'
    ) {
      setIsCustomExpValue(true);
    }
  }, [formData.commercial?.expectedOrderValue]);

  useEffect(() => {
    if (
      formData.commercial?.paymentTerms &&
      !standardPaymentTerms.includes(formData.commercial.paymentTerms) &&
      formData.commercial.paymentTerms !== 'Other'
    ) {
      setIsCustomPaymentTerms(true);
    }
  }, [formData.commercial?.paymentTerms]);

  useEffect(() => {
    if (
      formData.commercial?.competitors &&
      !standardCompetitors.includes(formData.commercial.competitors) &&
      formData.commercial.competitors !== 'Other'
    ) {
      setIsCustomCompetitor(true);
    }
  }, [formData.commercial?.competitors]);

  // Offline status tracking
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Company History Tracking State
  const [historyMatches, setHistoryMatches] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDismissed, setHistoryDismissed] = useState(false);

  useEffect(() => {
    initDraft();
    if (user && !formData.salesPerson) {
      setField('salesPerson', user.displayName || user.email);
    }
  }, [user]);

  // Intelligent Step-by-Step Auto-Defaults across Steps 3, 4, 5, 6
  useEffect(() => {
    // Step 3 (Product / Requirement): Pre-fill Reason based on Site Status
    if (currentStep === 3) {
      if (!formData.requirement?.reason) {
        if (formData.business?.status === 'New' || formData.business?.status === 'Under Construction') {
          setField('requirement.reason', 'New Installation');
        } else if (formData.business?.status === 'Expansion/Modification') {
          setField('requirement.reason', 'Expansion');
        } else if (formData.business?.status === 'Existing') {
          setField('requirement.reason', 'Compliance/Audit');
        }
      }
    }

    // Step 4 (Commercial): Pre-fill Decision Maker from Step 1 Contact
    if (currentStep === 4) {
      if (!formData.commercial?.decisionMakerName && formData.customer?.contactPerson) {
        setField('commercial.decisionMakerName', formData.customer.contactPerson);
      }
      if (!formData.commercial?.decisionMakerDesignation && formData.customer?.designation) {
        setField('commercial.decisionMakerDesignation', formData.customer.designation);
      }
      if (!formData.commercial?.decisionRole) {
        const des = (formData.customer?.designation || '').toLowerCase();
        if (des.includes('owner') || des.includes('director') || des.includes('md') || des.includes('head')) {
          setField('commercial.decisionRole', 'Decision Maker');
        } else {
          setField('commercial.decisionRole', 'Influencer');
        }
      }
      if (!formData.commercial?.budget) {
        setField('commercial.budget', 'Available');
      }
    }

    // Step 5 (Visit & Opportunity): Pre-fill Person Met from Contact & Default Photos
    if (currentStep === 5) {
      if (!formData.visit?.personMet && formData.customer?.contactPerson) {
        setField('visit.personMet', formData.customer.contactPerson);
      }
      if (!formData.visit?.photos) {
        setField('visit.photos', 'Taken');
      }
    }

    // Step 6 (Follow-up): Smart Next Actions & Follow-up Dates
    if (currentStep === 6) {
      if (formData.hasProductRequirement !== false) {
        if (!formData.followUp?.nextAction || formData.followUp.nextAction.length === 0) {
          setField('followUp.nextAction', ['Quotation']);
        }
        if (!formData.followUp?.quotationDate) {
          const qDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
          setField('followUp.quotationDate', qDate);
        }
      }
      if (!formData.followUp?.followUpDate) {
        const fuDate = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];
        setField('followUp.followUpDate', fuDate);
      }
    }
  }, [currentStep]);

  // Debounced Company History Check (500ms)
  useEffect(() => {
    const compName = formData.customer?.companyName?.trim();
    const mobile = formData.customer?.mobile?.trim();

    if (!compName || compName.length < 3) {
      setHistoryMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ companyName: compName });
        if (mobile) params.append('mobile', mobile);
        const res = await api.get(`/inquiries/company-history?${params.toString()}`);
        if (res.data?.inquiries && Array.isArray(res.data.inquiries)) {
          setHistoryMatches(res.data.inquiries);
        } else {
          setHistoryMatches([]);
        }
      } catch (err) {
        console.warn('Company history lookup error:', err.message);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.customer?.companyName, formData.customer?.mobile]);

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      nextStep();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Step 8: Submit form
      try {
        await submitInquiry();
        navigate('/success');
      } catch (err) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    prevStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDiscardConfirm = () => {
    clearDraft();
    setShowDiscardModal(false);
  };

  const productOptions = [
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

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block">
        {/* Top title & draft indicator */}
        <div className="mb-4 d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1 className="text-page-title mb-2">New Inquiry / Site Visit</h1>
            <p className="text-muted-custom">
              Fill out the details below. Required fields are marked with *.
            </p>
          </div>
          <div className="d-flex align-items-center gap-3">
            {draftStatus && (
              <span className="small text-muted" style={{ fontStyle: 'italic' }}>
                {draftStatus}
              </span>
            )}
            <button
              type="button"
              className="btn-pocika btn-pocika-danger-ghost btn-sm"
              onClick={() => setShowDiscardModal(true)}
            >
              Discard Draft
            </button>
          </div>
        </div>

        {/* Restored draft notification */}
        {hasRestoredDraft && (
          <div className="alert-pocika alert-info mb-4 d-flex justify-content-between align-items-center">
            <div>
              <strong>Draft restored.</strong> We restored your work in progress.
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={dismissRestoredAlert}
            ></button>
          </div>
        )}

        {/* Submission error alert */}
        {submissionError && (
          <div className="alert-pocika alert-danger mb-4">
            <strong>Failed to submit inquiry:</strong> {submissionError}
          </div>
        )}

        {/* Offline Warning Banner */}
        {isOffline && (
          <div className="alert-pocika alert-warning mb-4 d-flex align-items-center gap-2">
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Working offline.</strong> You can complete and submit this visit without internet. It will be saved locally on your device and automatically synced once you're back online.
            </div>
          </div>
        )}

        <div className="form-shell">
          {/* Stepper */}
          <Stepper
            currentStep={currentStep}
            totalSteps={totalSteps}
            hasProductRequirement={formData.hasProductRequirement !== false}
            onStepClick={(step) => goToStep(step)}
          />

          <form onSubmit={(e) => e.preventDefault()} noValidate>
            {/* STEP 1: Contact */}
            {currentStep === 1 && (
              <section className="form-step-panel card-pocika p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-section-title m-0">Visit & Contact</h2>
                  {historyMatches.length > 0 && (
                    <button
                      type="button"
                      className="btn-pocika btn-pocika-ghost btn-sm text-primary"
                      onClick={() => setShowHistoryModal(true)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {historyMatches.length} Previous Visit{historyMatches.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                {/* Company History Alert Banner with Quick Re-visit */}
                {historyMatches.length > 0 && !historyDismissed && (
                  <div className="alert-pocika alert-info mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 py-2 px-3">
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>
                        We found <strong>{historyMatches.length}</strong> previous visit{historyMatches.length > 1 ? 's' : ''} to this company.
                      </span>
                      <button
                        type="button"
                        className="btn-pocika btn-pocika-ghost btn-sm text-primary py-0 px-2 fw-bold text-decoration-underline"
                        onClick={() => setShowHistoryModal(true)}
                      >
                        View History
                      </button>
                      <button
                        type="button"
                        className="btn-pocika btn-pocika-primary btn-sm py-1 px-2"
                        style={{ fontSize: '0.8rem', borderRadius: '6px' }}
                        onClick={() => {
                          prefillCompanyDetails(historyMatches[0]);
                          setHistoryDismissed(true);
                        }}
                      >
                        ⚡ Start new visit using this company's details &rarr;
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn-close ms-auto"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setHistoryDismissed(true)}
                      title="Dismiss"
                    />
                  </div>
                )}
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Inquiry/Visit No.</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value="Assigned on submit"
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Date</label>
                      <input
                        className="form-control-pocika"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setField('date', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">
                        Company/Client Name<span className="required-mark">*</span>
                      </label>
                      <input
                        className={`form-control-pocika ${validationErrors['customer.companyName'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.customer?.companyName || ''}
                        onChange={(e) => setField('customer.companyName', e.target.value)}
                        placeholder="e.g. Acme Industries Ltd."
                      />
                      {validationErrors['customer.companyName'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.companyName']}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">
                        Contact Person<span className="required-mark">*</span>
                      </label>
                      <input
                        className={`form-control-pocika ${validationErrors['customer.contactPerson'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.customer?.contactPerson || ''}
                        onChange={(e) => setField('customer.contactPerson', e.target.value)}
                        placeholder="e.g. Rajesh Patel"
                      />
                      {validationErrors['customer.contactPerson'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.contactPerson']}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Designation</label>
                      {isCustomDesignation ? (
                        <div className="position-relative">
                          <input
                            className={`form-control-pocika ${validationErrors['customer.designation'] ? 'is-invalid' : ''}`}
                            type="text"
                            style={{ paddingRight: '2.5rem' }}
                            placeholder="Type designation (e.g. Site Supervisor)"
                            value={formData.customer?.designation || ''}
                            autoFocus
                            onChange={(e) => setField('customer.designation', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                            title="Click to select another option from list"
                            onClick={() => {
                              setIsCustomDesignation(false);
                              setField('customer.designation', '');
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <select
                          className={`form-control-pocika form-select ${validationErrors['customer.designation'] ? 'is-invalid' : ''}`}
                          value={standardDesignations.includes(formData.customer?.designation) ? formData.customer.designation : ''}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsCustomDesignation(true);
                              setField('customer.designation', '');
                            } else {
                              setField('customer.designation', e.target.value);
                            }
                          }}
                        >
                          <option value="">Select Designation...</option>
                          {standardDesignations.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                          <option value="Other">Other (Type custom)...</option>
                        </select>
                      )}
                      {validationErrors['customer.designation'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.designation']}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">
                        Mobile No.<span className="required-mark">*</span>
                      </label>
                      <input
                        className={`form-control-pocika ${validationErrors['customer.mobile'] ? 'is-invalid' : ''}`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={formData.customer?.mobile || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setField('customer.mobile', val);
                        }}
                        placeholder="10-digit mobile number"
                      />
                      {validationErrors['customer.mobile'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.mobile']}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Email</label>
                      <input
                        className={`form-control-pocika ${validationErrors['customer.email'] ? 'is-invalid' : ''}`}
                        type="email"
                        value={formData.customer?.email || ''}
                        onChange={(e) => setField('customer.email', e.target.value)}
                        placeholder="contact@company.com"
                      />
                      {validationErrors['customer.email'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.email']}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">GST No.</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.customer?.gstNo || ''}
                        onChange={(e) => setField('customer.gstNo', e.target.value)}
                        placeholder="24AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="field-group">
                      <label className="field-label">Company/Billing Address</label>
                      <textarea
                        className="form-control-pocika"
                        rows="2"
                        value={formData.customer?.billingAddress || ''}
                        onChange={(e) => setField('customer.billingAddress', e.target.value)}
                        placeholder="Full registered billing address"
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="field-group">
                      <label className="field-label">
                        Site/Visit Location<span className="required-mark">*</span>
                      </label>
                      <input
                        className={`form-control-pocika ${validationErrors['customer.siteLocation'] ? 'is-invalid' : ''}`}
                        type="text"
                        value={formData.customer?.siteLocation || ''}
                        onChange={(e) => setField('customer.siteLocation', e.target.value)}
                        placeholder="Exact site address visited"
                      />
                      {validationErrors['customer.siteLocation'] && (
                        <span className="field-error is-visible">
                          {validationErrors['customer.siteLocation']}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 2: Customer / Business */}
            {currentStep === 2 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Customer / Business Profile</h2>

                {/* Customer Type */}
                <div className="field-group mb-4">
                  <label className="field-label mb-2">
                    Customer Type<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {[
                      'GIDC/Industrial',
                      'Developer/Builder',
                      'Corporate',
                      'Commercial',
                      'Dealer/Distributor',
                      'EPC/Contractor',
                      'Consultant',
                      'Retail/Other'
                    ].map((type) => (
                      <label
                        key={type}
                        className={`chip-option ${formData.business?.customerType === type ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="customerType"
                          checked={formData.business?.customerType === type}
                          onChange={() => {
                            setField('business.customerType', type);
                            if (type === 'GIDC/Industrial') {
                              setField('business.facility', 'Factory');
                            } else if (type === 'Developer/Builder') {
                              setField('business.facility', 'Commercial Site');
                              setField('business.status', 'Under Construction');
                            } else if (type === 'EPC/Contractor') {
                              setField('business.facility', 'Commercial Site');
                              setField('business.status', 'Under Construction');
                            } else if (type === 'Corporate') {
                              setField('business.facility', 'Office');
                            } else if (type === 'Commercial') {
                              setField('business.facility', 'Commercial Site');
                            } else if (type === 'Dealer/Distributor') {
                              setField('business.facility', 'Warehouse');
                              setField('business.status', 'Existing');
                            } else if (type === 'Consultant') {
                              setField('business.facility', 'Office');
                            }
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  {validationErrors['business.customerType'] && (
                    <span className="field-error is-visible">
                      {validationErrors['business.customerType']}
                    </span>
                  )}
                </div>

                {/* Conditional Other Customer Type */}
                {formData.business?.customerType === 'Retail/Other' && (
                  <div className="field-group mb-3">
                    <label className="field-label">
                      Please specify Customer Type<span className="required-mark">*</span>
                    </label>
                    <input
                      className="form-control-pocika"
                      type="text"
                      value={formData.business?.customerTypeOther || ''}
                      onChange={(e) => setField('business.customerTypeOther', e.target.value)}
                      placeholder="Specify customer classification"
                    />
                    {validationErrors['business.customerTypeOther'] && (
                      <span className="field-error is-visible">
                        {validationErrors['business.customerTypeOther']}
                      </span>
                    )}
                  </div>
                )}

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Industry/Business Type</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.business?.industryType || ''}
                        onChange={(e) => setField('business.industryType', e.target.value)}
                        placeholder="e.g. Chemical, Textile, Real Estate"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">City or GIDC</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.business?.locationGidc || ''}
                        onChange={(e) => setField('business.locationGidc', e.target.value)}
                        placeholder="e.g. Vatva GIDC, Sanand"
                      />
                    </div>
                  </div>
                </div>

                {/* Facility */}
                <div className="field-group mb-3">
                  <label className="field-label mb-2">
                    Facility<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {['Factory', 'Warehouse', 'Office', 'Commercial Site', 'Other'].map((f) => (
                      <label
                        key={f}
                        className={`chip-option ${formData.business?.facility === f ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="facility"
                          checked={formData.business?.facility === f}
                          onChange={() => setField('business.facility', f)}
                        />
                        {f}
                      </label>
                    ))}
                  </div>
                  {validationErrors['business.facility'] && (
                    <span className="field-error is-visible">
                      {validationErrors['business.facility']}
                    </span>
                  )}
                </div>

                {/* Conditional Other Facility */}
                {formData.business?.facility === 'Other' && (
                  <div className="field-group mb-3">
                    <label className="field-label">
                      Type the facility name<span className="required-mark">*</span>
                    </label>
                    <input
                      className="form-control-pocika"
                      type="text"
                      value={formData.business?.facilityOther || ''}
                      onChange={(e) => setField('business.facilityOther', e.target.value)}
                    />
                    {validationErrors['business.facilityOther'] && (
                      <span className="field-error is-visible">
                        {validationErrors['business.facilityOther']}
                      </span>
                    )}
                  </div>
                )}

                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="field-group">
                      <label className="field-label">Size (Sq.Ft.)</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        name="business.areaSqft"
                        value={formData.business?.areaSqft || ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setField('business.areaSqft', val);
                        }}
                        placeholder="e.g. 25000"
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="field-group">
                      <label className="field-label">Floors (Above Ground)</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        name="business.floors"
                        value={formData.business?.floors || ''}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setField('business.floors', val);
                        }}
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="field-group">
                      <label className="field-label">Basement / Underground</label>
                      <select
                        className="form-control-pocika form-select"
                        value={formData.business?.basement || 'None'}
                        onChange={(e) => setField('business.basement', e.target.value)}
                      >
                        <option value="None">None (No Basement)</option>
                        <option value="1 Basement (B1)">1 Basement (B1)</option>
                        <option value="2 Basements (B1, B2)">2 Basements (B1, B2)</option>
                        <option value="3+ Basements">3+ Basements</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Facility Status */}
                <div className="field-group mb-3">
                  <label className="field-label mb-2">
                    Current Site Status<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {['New', 'Under Construction', 'Existing', 'Expansion/Modification'].map((st) => (
                      <label
                        key={st}
                        className={`chip-option ${formData.business?.status === st ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="facilityStatus"
                          checked={formData.business?.status === st}
                          onChange={() => setField('business.status', st)}
                        />
                        {st}
                      </label>
                    ))}
                  </div>
                  {validationErrors['business.status'] && (
                    <span className="field-error is-visible">
                      {validationErrors['business.status']}
                    </span>
                  )}
                </div>

                {/* When do they need it */}
                <div className="field-group mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="field-label mb-0">When do they need it? (Expected Timeline)</label>
                    {formData.business?.expectedDate && (
                      <button
                        type="button"
                        className="btn-pocika btn-pocika-ghost btn-sm text-muted py-0 px-2"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => setField('business.expectedDate', '')}
                      >
                        Clear Date
                      </button>
                    )}
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {[
                      { label: 'Urgent (Within 7 Days)', days: 7 },
                      { label: 'Within 1 Month', days: 30 },
                      { label: 'Within 3 Months', days: 90 }
                    ].map((shortcut) => {
                      const targetDate = new Date(Date.now() + shortcut.days * 86400000).toISOString().split('T')[0];
                      const isSelected = formData.business?.expectedDate === targetDate;
                      return (
                        <button
                          key={shortcut.label}
                          type="button"
                          className={`btn-pocika btn-sm py-1 px-3 ${isSelected ? 'btn-pocika-primary' : 'btn-pocika-secondary'}`}
                          style={{ fontSize: '0.82rem', height: '38px', borderRadius: '8px' }}
                          onClick={() => setField('business.expectedDate', targetDate)}
                        >
                          {shortcut.label}
                        </button>
                      );
                    })}
                    <div style={{ width: '190px' }}>
                      <input
                        className="form-control-pocika"
                        type="date"
                        name="business.expectedDate"
                        style={{ height: '38px', padding: '6px 10px' }}
                        value={formData.business?.expectedDate || ''}
                        onChange={(e) => setField('business.expectedDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Gating Question: Product Requirement */}
                <div className="field-group p-3 rounded-3 border" style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
                  <label className="field-label mb-1 fw-bold" style={{ color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    Products / Quotation Needed?<span className="required-mark">*</span>
                  </label>
                  <p className="text-muted small mb-3">
                    Select <strong>Yes</strong> if products/quote required, or <strong>No</strong> for intro visit (skips Steps 3 & 4).
                  </p>
                  <div className="chip-group" role="radiogroup">
                    <label className={`chip-option ${formData.hasProductRequirement !== false ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="hasProductRequirement"
                        checked={formData.hasProductRequirement !== false}
                        onChange={() => setField('hasProductRequirement', true)}
                      />
                      Yes — Products / Quote Required
                    </label>
                    <label className={`chip-option ${formData.hasProductRequirement === false ? 'is-selected' : ''}`}>
                      <input
                        type="radio"
                        name="hasProductRequirement"
                        checked={formData.hasProductRequirement === false}
                        onChange={() => setField('hasProductRequirement', false)}
                      />
                      No — Intro Only (Skip to Step 5)
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 3: Product / Requirement */}
            {currentStep === 3 && (
              <section className="form-step-panel card-pocika p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 p-2 px-3 rounded-2 border" style={{ backgroundColor: 'var(--color-primary-soft)', borderColor: 'var(--color-border)' }}>
                  <span className="small text-primary fw-medium">
                    Specific product requirement: <strong>Yes</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-pocika btn-pocika-ghost btn-sm text-secondary py-1"
                    onClick={() => {
                      setField('hasProductRequirement', false);
                      goToStep(5);
                    }}
                  >
                    Skip to Opportunity &rarr;
                  </button>
                </div>
                <h2 className="text-section-title mb-4">Product / Requirement</h2>

                <div className="field-group mb-4">
                  <label className="field-label mb-3">
                    Products<span className="required-mark">*</span>
                  </label>
                  <div className="row g-2">
                    {productOptions.map((prod) => {
                      const isSelected = formData.products?.includes(prod);
                      return (
                        <div key={prod} className="col-6 col-md-4">
                          <label className={`product-card ${isSelected ? 'is-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                toggleArrayItem('products', prod);
                                if (prod === 'AMC/Refilling/Maintenance') {
                                  const willBeSelected = !isSelected;
                                  if (willBeSelected && !formData.requirement?.reason) {
                                    setField('requirement.reason', 'Annual Requirement');
                                  }
                                }
                              }}
                            />
                            <span className="product-card-label">{prod}</span>
                            {isSelected && (
                              <span
                                className="badge bg-primary text-white ms-auto"
                                style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}
                              >
                                ✓
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {validationErrors['products'] && (
                    <span className="field-error is-visible mt-2">
                      {validationErrors['products']}
                    </span>
                  )}
                </div>

                {/* Conditional Other Product */}
                {formData.products?.includes('Other') && (
                  <div className="field-group mb-3">
                    <label className="field-label">
                      Please specify Other Products<span className="required-mark">*</span>
                    </label>
                    <input
                      className="form-control-pocika"
                      type="text"
                      value={formData.productOther || ''}
                      onChange={(e) => setField('productOther', e.target.value)}
                      placeholder="e.g. Foam System, Water Mist"
                    />
                    {validationErrors['productOther'] && (
                      <span className="field-error is-visible">
                        {validationErrors['productOther']}
                      </span>
                    )}
                  </div>
                )}

                <div className="field-group mb-3">
                  <label className="field-label">Required Product / Specification / Size</label>
                  <textarea
                    className="form-control-pocika"
                    rows="3"
                    value={formData.requirement?.productSpecification || ''}
                    onChange={(e) => setField('requirement.productSpecification', e.target.value)}
                    placeholder="Specific technical details, capacity, size requirements..."
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Estimated Quantity</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        inputMode="numeric"
                        value={formData.requirement?.estimatedQuantity || ''}
                        onChange={(e) => setField('requirement.estimatedQuantity', e.target.value)}
                        placeholder="e.g. 50 units"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Current Brand / Supplier</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.requirement?.currentBrand || ''}
                        onChange={(e) => setField('requirement.currentBrand', e.target.value)}
                        placeholder="e.g. Ceasefire, Minimax"
                      />
                    </div>
                  </div>
                </div>

                <div className="field-group mb-3">
                  <label className="field-label">Current Purchase / Requirement</label>
                  <textarea
                    className="form-control-pocika"
                    rows="2"
                    value={formData.requirement?.currentPurchase || ''}
                    onChange={(e) => setField('requirement.currentPurchase', e.target.value)}
                    placeholder="Past purchase cycle or immediate procurement context"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label mb-2">Reason</label>
                  <div className="chip-group">
                    {[
                      'New Installation',
                      'Replacement',
                      'Annual Requirement',
                      'Expansion',
                      'Compliance/Audit',
                      'Price Comparison'
                    ].map((r) => (
                      <label
                        key={r}
                        className={`chip-option ${formData.requirement?.reason === r ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="reason"
                          checked={formData.requirement?.reason === r}
                          onChange={() => setField('requirement.reason', r)}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>

                {/* AMC / Contract Expiry Date Tracker */}
                <div
                  className={`field-group mt-4 p-3 rounded-3 border ${
                    formData.products?.includes('AMC/Refilling/Maintenance')
                      ? 'border-primary'
                      : ''
                  }`}
                  style={{
                    transition: 'all 0.2s ease',
                    backgroundColor: formData.products?.includes('AMC/Refilling/Maintenance')
                      ? 'rgba(37, 99, 235, 0.05)'
                      : 'var(--color-bg)'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <label className="field-label mb-0 fw-semibold">
                        AMC / Contract Expiry Date (Optional)
                      </label>
                      {formData.products?.includes('AMC/Refilling/Maintenance') && (
                        <span
                          className="badge bg-primary text-white"
                          style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px' }}
                        >
                          📅 Auto-Alert Tracker
                        </span>
                      )}
                    </div>
                    {formData.requirement?.renewalDueDate && (
                      <button
                        type="button"
                        className="btn-pocika btn-pocika-ghost btn-sm text-muted py-0 px-2"
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => setField('requirement.renewalDueDate', '')}
                      >
                        Clear Date
                      </button>
                    )}
                  </div>

                  <p className="text-muted small mb-2">
                    When is their current fire safety contract or refilling due?{' '}
                    <span className="text-primary fw-medium">
                      Dashboard will automatically alert your team 30 days before this date.
                    </span>
                  </p>

                  <div className="d-flex flex-wrap align-items-center gap-2">
                    {[
                      { label: 'Next Month (30d)', days: 30 },
                      { label: 'In 3 Months', days: 90 },
                      { label: 'In 6 Months', days: 180 },
                      { label: 'In 1 Year', days: 365 }
                    ].map((shortcut) => {
                      const targetDate = new Date(Date.now() + shortcut.days * 86400000)
                        .toISOString()
                        .split('T')[0];
                      const isSelected = formData.requirement?.renewalDueDate === targetDate;
                      return (
                        <button
                          key={shortcut.label}
                          type="button"
                          className={`btn-pocika btn-sm py-1 px-3 ${
                            isSelected ? 'btn-pocika-primary' : 'btn-pocika-secondary'
                          }`}
                          style={{ fontSize: '0.8rem', height: '36px', borderRadius: '8px' }}
                          onClick={() => setField('requirement.renewalDueDate', targetDate)}
                        >
                          {shortcut.label}
                        </button>
                      );
                    })}

                    <div style={{ width: '180px' }}>
                      <input
                        className="form-control-pocika"
                        type="date"
                        style={{ height: '36px', padding: '4px 10px' }}
                        value={formData.requirement?.renewalDueDate || ''}
                        onChange={(e) => setField('requirement.renewalDueDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: Commercial */}
            {currentStep === 4 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Commercial / Sales Qualification</h2>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Approx. Order Value (₹)</label>
                      {isCustomReqValue ? (
                        <div className="position-relative">
                          <input
                            className="form-control-pocika pe-5"
                            type="text"
                            inputMode="numeric"
                            placeholder="Type amount in ₹ (e.g. 250000)"
                            value={formData.commercial?.requirementValue || ''}
                            autoFocus
                            onChange={(e) => {
                              const val = e.target.value;
                              const oldReq = formData.commercial?.requirementValue;
                              setField('commercial.requirementValue', val);
                              if (!formData.commercial?.expectedOrderValue || formData.commercial?.expectedOrderValue === oldReq) {
                                setField('commercial.expectedOrderValue', val);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                            title="Switch to dropdown list"
                            onClick={() => {
                              setIsCustomReqValue(false);
                              setField('commercial.requirementValue', '');
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
                          value={orderValueBrackets.includes(formData.commercial?.requirementValue) ? formData.commercial.requirementValue : ''}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsCustomReqValue(true);
                              setField('commercial.requirementValue', '');
                            } else {
                              const val = e.target.value;
                              const oldReq = formData.commercial?.requirementValue;
                              setField('commercial.requirementValue', val);
                              if (!formData.commercial?.expectedOrderValue || formData.commercial?.expectedOrderValue === oldReq) {
                                setField('commercial.expectedOrderValue', val);
                              }
                            }
                          }}
                        >
                          <option value="">Select Approx Value Range...</option>
                          {orderValueBrackets.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Other">Other (Enter custom amount)...</option>
                        </select>
                      )}
                      <span className="text-muted small mt-1 d-block">
                        Approximate ranges are acceptable if exact numbers are not known.
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Expected Order Value (₹)</label>
                      {isCustomExpValue ? (
                        <div className="position-relative">
                          <input
                            className="form-control-pocika pe-5"
                            type="text"
                            inputMode="numeric"
                            placeholder="Type amount in ₹ (e.g. 200000)"
                            value={formData.commercial?.expectedOrderValue || ''}
                            autoFocus
                            onChange={(e) => setField('commercial.expectedOrderValue', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                            title="Switch to dropdown list"
                            onClick={() => {
                              setIsCustomExpValue(false);
                              setField('commercial.expectedOrderValue', '');
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
                          value={orderValueBrackets.includes(formData.commercial?.expectedOrderValue) ? formData.commercial.expectedOrderValue : ''}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsCustomExpValue(true);
                              setField('commercial.expectedOrderValue', '');
                            } else {
                              setField('commercial.expectedOrderValue', e.target.value);
                            }
                          }}
                        >
                          <option value="">Select Expected Value Range...</option>
                          {orderValueBrackets.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Other">Other (Enter custom amount)...</option>
                        </select>
                      )}
                      <span className="text-muted small mt-1 d-block">
                        Approximate ranges are acceptable if exact numbers are not known.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="field-group mb-3">
                  <label className="field-label mb-2">Budget</label>
                  <div className="chip-group">
                    {['Available', 'Not Available', 'To Be Discussed'].map((b) => (
                      <label
                        key={b}
                        className={`chip-option ${formData.commercial?.budget === b ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="budget"
                          checked={formData.commercial?.budget === b}
                          onChange={() => setField('commercial.budget', b)}
                        />
                        {b}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Payment Terms Expected</label>
                      {isCustomPaymentTerms ? (
                        <div className="position-relative">
                          <input
                            className="form-control-pocika pe-5"
                            type="text"
                            placeholder="e.g. 45 Days Credit, LC at sight"
                            value={formData.commercial?.paymentTerms || ''}
                            autoFocus
                            onChange={(e) => setField('commercial.paymentTerms', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                            title="Switch to dropdown list"
                            onClick={() => {
                              setIsCustomPaymentTerms(false);
                              setField('commercial.paymentTerms', '');
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
                          value={standardPaymentTerms.includes(formData.commercial?.paymentTerms) ? formData.commercial.paymentTerms : ''}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsCustomPaymentTerms(true);
                              setField('commercial.paymentTerms', '');
                            } else {
                              setField('commercial.paymentTerms', e.target.value);
                            }
                          }}
                        >
                          <option value="">Select Payment Terms...</option>
                          {standardPaymentTerms.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                          <option value="Other">Other (Type custom terms)...</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Competitor / Brands</label>
                      {isCustomCompetitor ? (
                        <div className="position-relative">
                          <input
                            className="form-control-pocika pe-5"
                            type="text"
                            placeholder="e.g. Ceasefire, Safex, Local Dealer"
                            value={formData.commercial?.competitors || ''}
                            autoFocus
                            onChange={(e) => setField('commercial.competitors', e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn position-absolute end-0 top-50 translate-middle-y me-1 p-1 text-muted border-0 bg-transparent"
                            title="Switch to dropdown list"
                            onClick={() => {
                              setIsCustomCompetitor(false);
                              setField('commercial.competitors', '');
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
                          value={standardCompetitors.includes(formData.commercial?.competitors) ? formData.commercial.competitors : ''}
                          onChange={(e) => {
                            if (e.target.value === 'Other') {
                              setIsCustomCompetitor(true);
                              setField('commercial.competitors', '');
                            } else {
                              setField('commercial.competitors', e.target.value);
                            }
                          }}
                        >
                          <option value="">Select Competitor / Brand...</option>
                          {standardCompetitors.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                          <option value="Other">Multiple / Other (Type custom)...</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Decision Maker Name</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.commercial?.decisionMakerName || ''}
                        onChange={(e) => setField('commercial.decisionMakerName', e.target.value)}
                        placeholder="Name of authorized purchaser"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Decision Maker Designation</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.commercial?.decisionMakerDesignation || ''}
                        onChange={(e) => setField('commercial.decisionMakerDesignation', e.target.value)}
                        placeholder="e.g. Managing Director"
                      />
                    </div>
                  </div>
                </div>

                <div className="field-group mb-3">
                  <label className="field-label mb-2">Decision Maker / Influencer</label>
                  <div className="chip-group">
                    {['Decision Maker', 'Influencer'].map((role) => (
                      <label
                        key={role}
                        className={`chip-option ${formData.commercial?.decisionRole === role ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="decisionRole"
                          checked={formData.commercial?.decisionRole === role}
                          onChange={() => setField('commercial.decisionRole', role)}
                        />
                        {role}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Purchase Decision By</label>
                  <div style={{ maxWidth: '280px' }}>
                    <input
                      className="form-control-pocika"
                      type="date"
                      value={formData.commercial?.purchaseDecisionBy || ''}
                      onChange={(e) => setField('commercial.purchaseDecisionBy', e.target.value)}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* STEP 5: Visit & Opportunity */}
            {currentStep === 5 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Visit & Opportunity</h2>

                <div className="field-group mb-3">
                  <label className="field-label mb-2">
                    Visit Type<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {['Cold Visit', 'Lead Visit', 'Reference', 'Follow-up', 'Existing Customer'].map((vt) => (
                      <label
                        key={vt}
                        className={`chip-option ${formData.visit?.visitType === vt ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="visitType"
                          checked={formData.visit?.visitType === vt}
                          onChange={() => {
                            setField('visit.visitType', vt);
                            if (vt === 'Cold Visit') {
                              setField('visit.opportunity', 'WARM');
                            } else if (vt === 'Lead Visit' || vt === 'Reference') {
                              setField('visit.opportunity', 'HOT');
                            } else if (vt === 'Existing Customer') {
                              setField('visit.opportunity', 'WARM');
                            }
                          }}
                        />
                        {vt}
                      </label>
                    ))}
                  </div>
                  {validationErrors['visit.visitType'] && (
                    <span className="field-error is-visible">
                      {validationErrors['visit.visitType']}
                    </span>
                  )}
                </div>

                <div className="field-group mb-3">
                  <label className="field-label">Person Met</label>
                  <input
                    className="form-control-pocika"
                    type="text"
                    value={formData.visit?.personMet || ''}
                    onChange={(e) => setField('visit.personMet', e.target.value)}
                    placeholder="Name and role of person interviewed"
                  />
                </div>

                <div className="field-group mb-3">
                  <label className="field-label">Requirement Discussed</label>
                  <textarea
                    className="form-control-pocika"
                    rows="3"
                    value={formData.visit?.requirementDiscussed || ''}
                    onChange={(e) => setField('visit.requirementDiscussed', e.target.value)}
                    placeholder="Summary of scope discussed during the visit"
                  />
                </div>

                <div className="field-group mb-4">
                  <label className="field-label mb-2">
                    Photos<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {['Taken', 'Not Required'].map((pOpt) => (
                      <label
                        key={pOpt}
                        className={`chip-option ${formData.visit?.photos === pOpt ? 'is-selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="photos"
                          checked={formData.visit?.photos === pOpt}
                          onChange={() => setField('visit.photos', pOpt)}
                        />
                        {pOpt}
                      </label>
                    ))}
                  </div>
                  {validationErrors['visit.photos'] && (
                    <span className="field-error is-visible">
                      {validationErrors['visit.photos']}
                    </span>
                  )}
                </div>

                <div className="field-group">
                  <label className="field-label mb-2">
                    Opportunity<span className="required-mark">*</span>
                  </label>
                  <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Opportunity Level">
                    {[
                      { val: 'HOT', color: '#dc2626', bg: '#fef2f2', activeBg: '#dc2626', activeText: '#ffffff', border: '#fca5a5' },
                      { val: 'WARM', color: '#d97706', bg: '#fffbeb', activeBg: '#d97706', activeText: '#ffffff', border: '#fcd34d' },
                      { val: 'COLD', color: '#475569', bg: '#f8fafc', activeBg: '#475569', activeText: '#ffffff', border: '#cbd5e1' },
                      { val: 'FUTURE POTENTIAL', color: '#0284c7', bg: '#f0f9ff', activeBg: '#0284c7', activeText: '#ffffff', border: '#7dd3fc' },
                      { val: 'DEALER DEVELOPMENT', color: '#7c3aed', bg: '#f5f3ff', activeBg: '#7c3aed', activeText: '#ffffff', border: '#c4b5fd' },
                      { val: 'NO REQUIREMENT', color: '#64748b', bg: '#f1f5f9', activeBg: '#64748b', activeText: '#ffffff', border: '#cbd5e1' }
                    ].map(({ val, color, bg, activeBg, activeText, border }) => {
                      const isSelected = formData.visit?.opportunity === val;
                      return (
                        <label
                          key={val}
                          style={{
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: isSelected ? '700' : '600',
                            color: isSelected ? activeText : color,
                            backgroundColor: isSelected ? activeBg : bg,
                            border: `1.5px solid ${isSelected ? activeBg : border}`,
                            boxShadow: isSelected ? `0 2px 8px ${color}40` : 'none',
                            transition: 'all 0.15s ease',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="radio"
                            name="opportunity"
                            className="visually-hidden"
                            checked={isSelected}
                            onChange={() => setField('visit.opportunity', val)}
                          />
                          {isSelected ? (
                            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>✓</span>
                          ) : (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: color,
                                display: 'inline-block'
                              }}
                            />
                          )}
                          {val}
                        </label>
                      );
                    })}
                  </div>
                  {validationErrors['visit.opportunity'] && (
                    <span className="field-error is-visible mt-2">
                      {validationErrors['visit.opportunity']}
                    </span>
                  )}
                </div>
              </section>
            )}

            {/* STEP 6: Follow-up */}
            {currentStep === 6 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-1">Next Steps & Follow-up</h2>
                <p className="text-muted-custom small mb-4">
                  Set clear next steps and commitments so this lead stays warm and on track.
                </p>

                <div className="field-group mb-3">
                  <label className="field-label mb-1">What needs to happen next?</label>
                  <div className="text-helper mb-2">Pick all actions you told the customer you would take</div>
                  <div className="chip-group">
                    {[
                      'Quotation',
                      'Product Demo',
                      'Sample',
                      'Technical Discussion',
                      'Management Meeting'
                    ].map((action) => {
                      const isSelected = formData.followUp?.nextAction?.includes(action);
                      return (
                        <label
                          key={action}
                          className={`chip-option ${isSelected ? 'is-selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArrayItem('followUp.nextAction', action)}
                          />
                          {action}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional Quotation Required Date */}
                {formData.followUp?.nextAction?.includes('Quotation') && (
                  <div className="field-group mb-3">
                    <label className="field-label mb-1">
                      Send Quotation By<span className="required-mark">*</span>
                    </label>
                    <div className="text-helper mb-2">When does the customer need this quote by?</div>
                    <div style={{ maxWidth: '280px' }}>
                      <input
                        className={`form-control-pocika ${validationErrors['followUp.quotationDate'] ? 'is-invalid' : ''}`}
                        type="date"
                        value={formData.followUp?.quotationDate || ''}
                        onChange={(e) => setField('followUp.quotationDate', e.target.value)}
                      />
                    </div>
                    {validationErrors['followUp.quotationDate'] && (
                      <span className="field-error is-visible">
                        {validationErrors['followUp.quotationDate']}
                      </span>
                    )}
                  </div>
                )}

                <div className="field-group mb-3">
                  <label className="field-label mb-1">How will you connect next?</label>
                  <div className="text-helper mb-2">Select the planned interaction type for your next touchpoint</div>
                  <div className="chip-group" role="radiogroup">
                    {['Site Visit', 'Follow-up', 'Dealer Meeting', 'Other'].map((vt) => {
                      const isSelected = formData.followUp?.nextVisitType === vt;
                      return (
                        <label
                          key={vt}
                          className={`chip-option ${isSelected ? 'is-selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="nextVisitType"
                            checked={isSelected}
                            onChange={() => setField('followUp.nextVisitType', vt)}
                          />
                          {vt}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label mb-1">
                        Next Follow-up Date<span className="required-mark">*</span>
                      </label>
                      <div className="text-helper mb-2">When are you reaching back out to the customer?</div>
                      <input
                        className={`form-control-pocika ${validationErrors['followUp.followUpDate'] ? 'is-invalid' : ''}`}
                        type="date"
                        value={formData.followUp?.followUpDate || ''}
                        onChange={(e) => setField('followUp.followUpDate', e.target.value)}
                      />
                      {validationErrors['followUp.followUpDate'] && (
                        <span className="field-error is-visible">
                          {validationErrors['followUp.followUpDate']}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label mb-1">Next Action / Commitment</label>
                  <div className="text-helper mb-2">What did you tell the customer you'd do next? Note any specific promises made.</div>
                  <textarea
                    className="form-control-pocika"
                    rows="2"
                    value={formData.followUp?.nextActionCommitment || ''}
                    onChange={(e) => setField('followUp.nextActionCommitment', e.target.value)}
                    placeholder="e.g. Will share revised quotation by Friday, arrange live demo at their plant next week..."
                  />
                </div>
              </section>
            )}

            {/* STEP 7: Remarks & Photos */}
            {currentStep === 7 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-1">Remarks & Photos</h2>
                <p className="text-muted-custom small mb-4">
                  Add observations, client preferences, and attach site photos.
                </p>

                <div className="field-group mb-4">
                  <label className="field-label mb-1">Visit Remarks / Special Requirements</label>
                  <div className="text-helper mb-2">Any special observations, client preferences, or key points from your site visit</div>
                  <textarea
                    className="form-control-pocika"
                    rows="3"
                    value={formData.remarks || ''}
                    onChange={(e) => setField('remarks', e.target.value)}
                    placeholder="e.g. Client requested customized mounting brackets; decision expected right after board review..."
                  />
                </div>

                <div className="field-group">
                  <h3 className="text-field-label mb-3" style={{ fontSize: '1.1rem' }}>
                    Site Photos
                  </h3>

                  {formData.visit?.photos === 'Not Required' ? (
                    <div className="alert-pocika alert-info py-2 px-3 small">
                      Photos marked as "Not Required" in Step 5.
                    </div>
                  ) : (
                    <PhotoUploader
                      photos={formData.photos || []}
                      onAddFiles={addPhotoFiles}
                      onRemovePhoto={removePhoto}
                      maxPhotos={5}
                      error={validationErrors['photos']}
                    />
                  )}
                </div>
              </section>
            )}

            {/* STEP 8: Review & Confirm */}
            {currentStep === 8 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Review & Confirm</h2>
                <ReviewSummary
                  formData={formData}
                  onEditStep={(step) => {
                    goToStep(step);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </section>
            )}
          </form>
        </div>
      </main>

      {/* Desktop Bottom Action Bar */}
      <div className="container-app d-none d-lg-flex gap-3 justify-content-end pb-5 form-actions mt-4">
        <button
          type="button"
          className="btn-pocika btn-pocika-secondary"
          disabled={currentStep === 1 || isSubmitting}
          onClick={handleBack}
        >
          Back
        </button>
        <button
          type="button"
          className="btn-pocika btn-pocika-primary"
          disabled={isSubmitting}
          onClick={handleNext}
        >
          {isSubmitting
            ? 'Submitting inquiry...'
            : currentStep === totalSteps
              ? 'Confirm & Submit'
              : 'Save & continue'}
        </button>
      </div>

      {/* Mobile Sticky Bottom Navigation */}
      <div className="stepper-mobile d-lg-none mt-4 px-3 bg-white border-top py-2 position-sticky bottom-0 z-3">
        <div className="d-flex gap-2 form-actions">
          <button
            type="button"
            className="btn-pocika btn-pocika-secondary flex-grow-1"
            disabled={currentStep === 1 || isSubmitting}
            onClick={handleBack}
          >
            Back
          </button>
          <button
            type="button"
            className="btn-pocika btn-pocika-primary flex-grow-1"
            disabled={isSubmitting}
            onClick={handleNext}
          >
            {isSubmitting
              ? 'Submitting...'
              : currentStep === totalSteps
                ? 'Confirm & Submit'
                : 'Next'}
          </button>
        </div>
      </div>

      <Footer />

      {/* Discard Confirmation Modal */}
      <DiscardModal
        isOpen={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={handleDiscardConfirm}
      />

      {/* Company History Modal */}
      {showHistoryModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="modal-header border-bottom">
                <div>
                  <h3 className="modal-title fs-5 fw-bold mb-1">Previous Visits to Company</h3>
                  <p className="text-muted small mb-0">
                    Found {historyMatches.length} existing record{historyMatches.length > 1 ? 's' : ''} for "{formData.customer?.companyName}"
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowHistoryModal(false)}
                />
              </div>
              <div className="modal-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Inquiry No.</th>
                        <th>Date</th>
                        <th>Salesperson</th>
                        <th>Opportunity</th>
                        <th>Person Met / Scope</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyMatches.map((inq) => (
                        <tr key={inq._id || inq.inquiryNumber}>
                          <td className="fw-semibold">{inq.inquiryNumber}</td>
                          <td className="small">{inq.date || '-'}</td>
                          <td className="small">{inq.salesPerson || '-'}</td>
                          <td>
                            <span className="badge bg-light text-dark border small">
                              {inq.visit?.opportunity || '-'}
                            </span>
                          </td>
                          <td className="small text-truncate" style={{ maxWidth: '200px' }}>
                            {inq.visit?.personMet ? `${inq.visit.personMet}: ` : ''}
                            {inq.visit?.requirementDiscussed || inq.remarks || '-'}
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              <button
                                type="button"
                                className="btn-pocika btn-pocika-primary btn-sm py-1 px-2"
                                style={{ fontSize: '0.75rem' }}
                                title="Pre-fill company details for a new visit"
                                onClick={() => {
                                  prefillCompanyDetails(inq);
                                  setShowHistoryModal(false);
                                  setHistoryDismissed(true);
                                }}
                              >
                                Re-visit &rarr;
                              </button>
                              <a
                                href={`/inquiries/${inq.inquiryNumber || inq._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-pocika btn-pocika-ghost btn-sm py-1 px-2"
                                style={{ fontSize: '0.75rem' }}
                              >
                                View &nearr;
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn-pocika btn-pocika-secondary btn-sm"
                  onClick={() => setShowHistoryModal(false)}
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

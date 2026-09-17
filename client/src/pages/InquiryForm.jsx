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
    submitInquiry
  } = useInquiryFormStore();

  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    initDraft();
    if (user && !formData.salesPerson) {
      setField('salesPerson', user.displayName || user.email);
    }
  }, [user]);

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

        <div className="form-shell">
          {/* Stepper */}
          <Stepper
            currentStep={currentStep}
            totalSteps={totalSteps}
            onStepClick={(step) => goToStep(step)}
          />

          <form onSubmit={(e) => e.preventDefault()} noValidate>
            {/* STEP 1: Contact */}
            {currentStep === 1 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Visit & Contact</h2>
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
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.customer?.designation || ''}
                        onChange={(e) => setField('customer.designation', e.target.value)}
                        placeholder="e.g. Plant Manager"
                      />
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
                        value={formData.customer?.mobile || ''}
                        onChange={(e) => setField('customer.mobile', e.target.value)}
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
                      <label key={type} className="chip-option">
                        <input
                          type="radio"
                          name="customerType"
                          checked={formData.business?.customerType === type}
                          onChange={() => setField('business.customerType', type)}
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
                      <label className="field-label">Location/GIDC</label>
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
                      <label key={f} className="chip-option">
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
                      Please specify Facility<span className="required-mark">*</span>
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
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Approx. Area (Sq.Ft.)</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        value={formData.business?.areaSqft || ''}
                        onChange={(e) => setField('business.areaSqft', e.target.value)}
                        placeholder="e.g. 25000"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Floors</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        value={formData.business?.floors || ''}
                        onChange={(e) => setField('business.floors', e.target.value)}
                        placeholder="e.g. 3"
                      />
                    </div>
                  </div>
                </div>

                {/* Facility Status */}
                <div className="field-group mb-3">
                  <label className="field-label mb-2">
                    Project/Facility Status<span className="required-mark">*</span>
                  </label>
                  <div className="chip-group" role="radiogroup">
                    {['New', 'Under Construction', 'Existing', 'Expansion/Modification'].map((st) => (
                      <label key={st} className="chip-option">
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

                <div className="field-group">
                  <label className="field-label">Expected Requirement Date</label>
                  <input
                    className="form-control-pocika"
                    type="date"
                    value={formData.business?.expectedDate || ''}
                    onChange={(e) => setField('business.expectedDate', e.target.value)}
                  />
                </div>
              </section>
            )}

            {/* STEP 3: Product / Requirement */}
            {currentStep === 3 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Product / Requirement</h2>

                <div className="field-group mb-4">
                  <label className="field-label mb-3">
                    Products<span className="required-mark">*</span>
                  </label>
                  <div className="row g-2">
                    {productOptions.map((prod) => (
                      <div key={prod} className="col-6 col-md-4">
                        <label className="product-card">
                          <input
                            type="checkbox"
                            checked={formData.products?.includes(prod)}
                            onChange={() => toggleArrayItem('products', prod)}
                          />
                          <span className="product-card-label">{prod}</span>
                        </label>
                      </div>
                    ))}
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
                      <label key={r} className="chip-option">
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
              </section>
            )}

            {/* STEP 4: Commercial */}
            {currentStep === 4 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Commercial / Sales Qualification</h2>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Approx. Requirement Value (₹)</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        step="0.01"
                        value={formData.commercial?.requirementValue || ''}
                        onChange={(e) => setField('commercial.requirementValue', e.target.value)}
                        placeholder="e.g. 250000"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Expected Order Value (₹)</label>
                      <input
                        className="form-control-pocika"
                        type="number"
                        step="0.01"
                        value={formData.commercial?.expectedOrderValue || ''}
                        onChange={(e) => setField('commercial.expectedOrderValue', e.target.value)}
                        placeholder="e.g. 200000"
                      />
                    </div>
                  </div>
                </div>

                <div className="field-group mb-3">
                  <label className="field-label mb-2">Budget</label>
                  <div className="chip-group">
                    {['Available', 'Not Available', 'To Be Discussed'].map((b) => (
                      <label key={b} className="chip-option">
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
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.commercial?.paymentTerms || ''}
                        onChange={(e) => setField('commercial.paymentTerms', e.target.value)}
                        placeholder="e.g. 30 days credit, 50% advance"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">Competitor / Brands</label>
                      <input
                        className="form-control-pocika"
                        type="text"
                        value={formData.commercial?.competitors || ''}
                        onChange={(e) => setField('commercial.competitors', e.target.value)}
                        placeholder="Competitors quoting on site"
                      />
                    </div>
                  </div>
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
                      <label key={role} className="chip-option">
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
                  <input
                    className="form-control-pocika"
                    type="date"
                    value={formData.commercial?.purchaseDecisionBy || ''}
                    onChange={(e) => setField('commercial.purchaseDecisionBy', e.target.value)}
                  />
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
                      <label key={vt} className="chip-option">
                        <input
                          type="radio"
                          name="visitType"
                          checked={formData.visit?.visitType === vt}
                          onChange={() => setField('visit.visitType', vt)}
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
                      <label key={pOpt} className="chip-option">
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
                  <div className="d-flex flex-wrap gap-2">
                    {[
                      { val: 'HOT', cls: 'badge-hot' },
                      { val: 'WARM', cls: 'badge-warm' },
                      { val: 'COLD', cls: 'badge-cold' },
                      { val: 'FUTURE POTENTIAL', cls: 'badge-future-potential' },
                      { val: 'DEALER DEVELOPMENT', cls: 'badge-dealer-development' },
                      { val: 'NO REQUIREMENT', cls: 'badge-no-requirement' }
                    ].map(({ val, cls }) => (
                      <label
                        key={val}
                        className={`badge-pocika ${cls}`}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          border: formData.visit?.opportunity === val ? '2px solid currentColor' : 'none'
                        }}
                      >
                        <input
                          type="radio"
                          name="opportunity"
                          checked={formData.visit?.opportunity === val}
                          onChange={() => setField('visit.opportunity', val)}
                          style={{ margin: 0 }}
                        />
                        {val}
                      </label>
                    ))}
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
                <h2 className="text-section-title mb-4">Next Action / Follow-up</h2>

                <div className="field-group mb-3">
                  <label className="field-label mb-2">Next action</label>
                  <div className="chip-group">
                    {[
                      'Quotation',
                      'Product Demo',
                      'Sample',
                      'Technical Discussion',
                      'Management Meeting'
                    ].map((action) => (
                      <label key={action} className="chip-option">
                        <input
                          type="checkbox"
                          checked={formData.followUp?.nextAction?.includes(action)}
                          onChange={() => toggleArrayItem('followUp.nextAction', action)}
                        />
                        {action}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Conditional Quotation Required Date */}
                {formData.followUp?.nextAction?.includes('Quotation') && (
                  <div className="field-group mb-3">
                    <label className="field-label">
                      Quotation Required By<span className="required-mark">*</span>
                    </label>
                    <input
                      className={`form-control-pocika ${validationErrors['followUp.quotationDate'] ? 'is-invalid' : ''}`}
                      type="date"
                      value={formData.followUp?.quotationDate || ''}
                      onChange={(e) => setField('followUp.quotationDate', e.target.value)}
                    />
                    {validationErrors['followUp.quotationDate'] && (
                      <span className="field-error is-visible">
                        {validationErrors['followUp.quotationDate']}
                      </span>
                    )}
                  </div>
                )}

                <div className="field-group mb-3">
                  <label className="field-label mb-2">Next visit / action type</label>
                  <div className="chip-group" role="radiogroup">
                    {['Site Visit', 'Follow-up', 'Dealer Meeting', 'Other'].map((vt) => (
                      <label key={vt} className="chip-option">
                        <input
                          type="radio"
                          name="nextVisitType"
                          checked={formData.followUp?.nextVisitType === vt}
                          onChange={() => setField('followUp.nextVisitType', vt)}
                        />
                        {vt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="field-group">
                      <label className="field-label">
                        Next Follow-up Date<span className="required-mark">*</span>
                      </label>
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
                  <label className="field-label">Next Action / Commitment</label>
                  <textarea
                    className="form-control-pocika"
                    rows="2"
                    value={formData.followUp?.nextActionCommitment || ''}
                    onChange={(e) => setField('followUp.nextActionCommitment', e.target.value)}
                    placeholder="Specific commitments made to the client"
                  />
                </div>
              </section>
            )}

            {/* STEP 7: Remarks & Photos */}
            {currentStep === 7 && (
              <section className="form-step-panel card-pocika p-4">
                <h2 className="text-section-title mb-4">Remarks & Photos</h2>

                <div className="field-group mb-4">
                  <label className="field-label">Visit Remarks / Special Requirements</label>
                  <textarea
                    className="form-control-pocika"
                    rows="3"
                    value={formData.remarks || ''}
                    onChange={(e) => setField('remarks', e.target.value)}
                    placeholder="Any special notes or observations from the site visit..."
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
    </div>
  );
}

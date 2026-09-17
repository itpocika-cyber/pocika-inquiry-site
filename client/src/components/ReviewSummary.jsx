import React from 'react';

function renderArray(arr, otherVal = '') {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
  let str = arr.join(', ');
  if (arr.includes('Other') && otherVal) {
    str = str.replace('Other', `Other (${otherVal})`);
  }
  return str;
}

export default function ReviewSummary({ formData, onEditStep }) {
  const sections = [
    {
      title: 'Visit & Contact',
      step: 1,
      fields: [
        { label: 'Date', value: formData.date },
        { label: 'Sales Person', value: formData.salesPerson },
        { label: 'Company/Client Name', value: formData.customer?.companyName },
        { label: 'Contact Person', value: formData.customer?.contactPerson },
        { label: 'Designation', value: formData.customer?.designation },
        { label: 'Mobile No.', value: formData.customer?.mobile },
        { label: 'Email', value: formData.customer?.email },
        { label: 'Company/Billing Address', value: formData.customer?.billingAddress },
        { label: 'Site/Visit Location', value: formData.customer?.siteLocation },
        { label: 'GST No.', value: formData.customer?.gstNo }
      ]
    },
    {
      title: 'Customer / Business',
      step: 2,
      fields: [
        {
          label: 'Customer Type',
          value:
            formData.business?.customerType === 'Retail/Other'
              ? `Retail/Other (${formData.business?.customerTypeOther || ''})`
              : formData.business?.customerType
        },
        { label: 'Industry/Business Type', value: formData.business?.industryType },
        { label: 'Location/GIDC', value: formData.business?.locationGidc },
        {
          label: 'Facility',
          value:
            formData.business?.facility === 'Other'
              ? `Other (${formData.business?.facilityOther || ''})`
              : formData.business?.facility
        },
        { label: 'Approx. Area (Sq.Ft.)', value: formData.business?.areaSqft },
        { label: 'Floors', value: formData.business?.floors },
        { label: 'Project/Facility Status', value: formData.business?.status },
        { label: 'Expected Requirement Date', value: formData.business?.expectedDate }
      ]
    },
    {
      title: 'Product / Requirement',
      step: 3,
      fields: [
        { label: 'Products', value: renderArray(formData.products, formData.productOther) },
        { label: 'Required Product/Specification/Size', value: formData.requirement?.productSpecification },
        { label: 'Estimated Quantity', value: formData.requirement?.estimatedQuantity },
        { label: 'Current Brand/Supplier', value: formData.requirement?.currentBrand },
        { label: 'Current Purchase/Requirement', value: formData.requirement?.currentPurchase },
        { label: 'Reason', value: formData.requirement?.reason }
      ]
    },
    {
      title: 'Commercial / Sales Qualification',
      step: 4,
      fields: [
        { label: 'Approx. Requirement Value', value: formData.commercial?.requirementValue ? `₹${formData.commercial.requirementValue}` : '' },
        { label: 'Expected Order Value', value: formData.commercial?.expectedOrderValue ? `₹${formData.commercial.expectedOrderValue}` : '' },
        { label: 'Budget', value: formData.commercial?.budget },
        { label: 'Payment Terms Expected', value: formData.commercial?.paymentTerms },
        { label: 'Competitor/Brands', value: formData.commercial?.competitors },
        { label: 'Decision Maker Name', value: formData.commercial?.decisionMakerName },
        { label: 'Decision Maker Designation', value: formData.commercial?.decisionMakerDesignation },
        { label: 'Decision Maker/Influencer', value: formData.commercial?.decisionRole },
        { label: 'Purchase Decision By', value: formData.commercial?.purchaseDecisionBy }
      ]
    },
    {
      title: 'Visit & Opportunity',
      step: 5,
      fields: [
        { label: 'Visit Type', value: formData.visit?.visitType },
        { label: 'Person Met', value: formData.visit?.personMet },
        { label: 'Requirement Discussed', value: formData.visit?.requirementDiscussed },
        { label: 'Photos', value: formData.visit?.photos },
        { label: 'Opportunity', value: formData.visit?.opportunity, isBadge: true }
      ]
    },
    {
      title: 'Next Action / Follow-up',
      step: 6,
      fields: [
        { label: 'Next action', value: renderArray(formData.followUp?.nextAction) },
        { label: 'Quotation Required By', value: formData.followUp?.quotationDate },
        { label: 'Next visit/action type', value: formData.followUp?.nextVisitType },
        { label: 'Next Follow-up Date', value: formData.followUp?.followUpDate },
        { label: 'Next Action/Commitment', value: formData.followUp?.nextActionCommitment }
      ]
    },
    {
      title: 'Remarks & Photos',
      step: 7,
      fields: [
        { label: 'Visit Remarks / Special Requirements', value: formData.remarks }
      ],
      photos: formData.photos
    }
  ];

  const getBadgeClass = (opp) => {
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

  return (
    <div className="review-container">
      {sections.map((sec, idx) => {
        if (formData.hasProductRequirement === false && (sec.step === 3 || sec.step === 4)) {
          return null;
        }

        const validFields = sec.fields.filter(
          (f) => f.value !== undefined && f.value !== null && String(f.value).trim().length > 0
        );
        const hasPhotos = sec.photos && sec.photos.length > 0;

        // "Only show fields with data" rule
        if (validFields.length === 0 && !hasPhotos) return null;

        return (
          <div key={idx} className="review-section mb-4 pb-3 border-bottom">
            <div className="review-section-header d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-field-label m-0" style={{ fontSize: '1.125rem' }}>
                {sec.title}
              </h3>
              <button
                type="button"
                className="btn-pocika btn-pocika-ghost btn-sm"
                onClick={() => onEditStep(sec.step)}
              >
                Edit
              </button>
            </div>

            <div className="review-grid row g-3">
              {validFields.map((field, fIdx) => (
                <div key={fIdx} className="col-md-6 review-field">
                  <div className="review-label text-helper mb-1">{field.label}</div>
                  {field.isBadge ? (
                    <span className={`badge-pocika ${getBadgeClass(field.value)}`}>
                      {field.value}
                    </span>
                  ) : (
                    <div className="review-value" style={{ color: 'var(--color-text)' }}>
                      {field.value}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {hasPhotos && (
              <div className="mt-3">
                <div className="review-label text-helper mb-2">Attached Site Photos</div>
                <div className="photo-grid">
                  {sec.photos.map((photo, pIdx) => (
                    <div key={pIdx} className="photo-thumb">
                      <img
                        src={photo.previewUrl || photo.secureUrl}
                        alt={photo.fileName || `Photo ${pIdx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

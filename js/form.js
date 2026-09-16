import { qs, qsa } from './utils.js';
import { initSteps } from './steps.js';
import { initValidation } from './validation.js';
import { initConditionalFields } from './conditional-fields.js';
import { initDraft, saveDraftDebounced } from './draft.js';
import { initPhotoUpload } from './photo-upload.js';
import { initReview } from './review.js';

// The centralized state for this inquiry form
export const inquiryData = {
  inquiryNumber: "", 
  date: "", 
  salesPerson: "",
  customer: { 
    companyName: "", contactPerson: "", designation: "", 
    mobile: "", email: "", billingAddress: "", siteLocation: "", gstNo: "" 
  },
  business: { 
    customerType: "", customerTypeOther: "", industryType: "", 
    locationGidc: "", facility: "", facilityOther: "", areaSqft: "", 
    floors: "", status: "", expectedDate: "" 
  },
  products: [], 
  productOther: "",
  requirement: { 
    productSpecification: "", estimatedQuantity: "", currentBrand: "", 
    currentPurchase: "", reason: "" 
  },
  commercial: { 
    requirementValue: "", expectedOrderValue: "", budget: "", 
    paymentTerms: "", decisionMakerName: "", decisionMakerDesignation: "", 
    decisionRole: "", purchaseDecisionBy: "", competitors: "" 
  },
  visit: {
    visitType: "", personMet: "", requirementDiscussed: "", photos: "", opportunity: ""
  }, 
  followUp: {
    nextAction: [], nextVisitType: "", quotationDate: "", followUpDate: "", nextActionCommitment: ""
  }, 
  remarks: "", 
  photos: []
};

// Update data object based on dot notation paths (e.g. "customer.companyName")
function updateDataFromField(input) {
  const name = input.name;
  if (!name) return;

  const value = input.type === 'checkbox' ? input.checked : input.value;
  
  if (name === 'products') {
    const productCheckboxes = qsa('input[name="products"]:checked');
    inquiryData.products = Array.from(productCheckboxes).map(cb => cb.value);
    return;
  }
  
  if (name === 'followUp.nextAction') {
    const actionCheckboxes = qsa('input[name="followUp.nextAction"]:checked');
    inquiryData.followUp.nextAction = Array.from(actionCheckboxes).map(cb => cb.value);
    return;
  }

  const parts = name.split('.');
  if (parts.length === 1) {
    inquiryData[name] = value;
  } else if (parts.length === 2) {
    inquiryData[parts[0]][parts[1]] = value;
  }
}

function initDataBinding() {
  const form = qs('#inquiry-form');
  if (!form) return;

  // Set today's date by default in field-date
  const dateField = qs('#field-date');
  if (dateField && !dateField.value) {
    const today = new Date().toISOString().split('T')[0];
    dateField.value = today;
    inquiryData.date = today;
  }

  // Listen to all inputs to update state
  const handleInput = (e) => {
    updateDataFromField(e.target);
    saveDraftDebounced();
  };

  form.addEventListener('input', handleInput);
  form.addEventListener('change', handleInput);
}

document.addEventListener('DOMContentLoaded', () => {
  initDataBinding(); // Init binding first so data is ready
  initDraft(); // Draft needs to run to restore data before steps initialize
  initSteps();
  initValidation();
  initConditionalFields();
  initPhotoUpload();
  initReview();
});

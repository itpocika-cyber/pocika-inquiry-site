import { create } from 'zustand';
import api from '../api/client';

const DRAFT_KEY = 'pocika_inquiry_draft';

export const getInitialInquiryData = () => ({
  inquiryNumber: '',
  date: new Date().toISOString().split('T')[0],
  salesPerson: '',
  customer: {
    companyName: '',
    contactPerson: '',
    designation: '',
    mobile: '',
    email: '',
    billingAddress: '',
    siteLocation: '',
    gstNo: ''
  },
  business: {
    customerType: '',
    customerTypeOther: '',
    industryType: '',
    locationGidc: '',
    facility: '',
    facilityOther: '',
    areaSqft: '',
    floors: '',
    status: '',
    expectedDate: ''
  },
  products: [],
  productOther: '',
  requirement: {
    productSpecification: '',
    estimatedQuantity: '',
    currentBrand: '',
    currentPurchase: '',
    reason: ''
  },
  commercial: {
    requirementValue: '',
    expectedOrderValue: '',
    budget: '',
    paymentTerms: '',
    decisionMakerName: '',
    decisionMakerDesignation: '',
    decisionRole: '',
    purchaseDecisionBy: '',
    competitors: ''
  },
  visit: {
    visitType: '',
    personMet: '',
    requirementDiscussed: '',
    photos: '',
    opportunity: ''
  },
  followUp: {
    nextAction: [],
    nextVisitType: '',
    quotationDate: '',
    followUpDate: '',
    nextActionCommitment: ''
  },
  remarks: '',
  photos: [],
  hasProductRequirement: true
});

export const useInquiryFormStore = create((set, get) => ({
  currentStep: 1,
  totalSteps: 8,
  formData: getInitialInquiryData(),
  selectedPhotoFiles: [], // Array of File objects
  validationErrors: {},
  isSubmitting: false,
  submissionError: null,
  draftStatus: '', // 'Saving...', 'Saved at ...', ''
  hasRestoredDraft: false,

  setField: (path, value) => {
    const { formData } = get();
    const parts = path.split('.');
    const updated = { ...formData };

    if (parts.length === 1) {
      updated[parts[0]] = value;
    } else if (parts.length === 2) {
      updated[parts[0]] = { ...updated[parts[0]], [parts[1]]: value };
    }

    // Auto-clear conditional fields to avoid stale data submission:
    if (path === 'business.customerType' && value !== 'Retail/Other') {
      updated.business = { ...updated.business, customerTypeOther: '' };
    }
    if (path === 'business.facility' && value !== 'Other') {
      updated.business = { ...updated.business, facilityOther: '' };
    }
    if (path === 'visit.photos' && value === 'Not Required') {
      get().clearPhotos();
    }

    // Clear validation error on the modified field
    const errors = { ...get().validationErrors };
    delete errors[path];

    set({ formData: updated, validationErrors: errors });
    get().saveDraftDebounced();
  },

  toggleArrayItem: (path, item) => {
    const { formData } = get();
    const parts = path.split('.');
    let currentArr = [];

    if (parts.length === 1) {
      currentArr = Array.isArray(formData[parts[0]]) ? formData[parts[0]] : [];
    } else if (parts.length === 2) {
      currentArr = Array.isArray(formData[parts[0]]?.[parts[1]]) ? formData[parts[0]][parts[1]] : [];
    }

    const nextArr = currentArr.includes(item)
      ? currentArr.filter(x => x !== item)
      : [...currentArr, item];

    const updated = { ...formData };
    if (parts.length === 1) {
      updated[parts[0]] = nextArr;
    } else if (parts.length === 2) {
      updated[parts[0]] = { ...updated[parts[0]], [parts[1]]: nextArr };
    }

    // Auto-clear conditional fields when trigger is unselected
    if (path === 'products' && !nextArr.includes('Other')) {
      updated.productOther = '';
    }
    if (path === 'followUp.nextAction' && !nextArr.includes('Quotation')) {
      updated.followUp = { ...updated.followUp, quotationDate: '' };
    }

    const errors = { ...get().validationErrors };
    delete errors[path];

    set({ formData: updated, validationErrors: errors });
    get().saveDraftDebounced();
  },

  addPhotoFiles: (files) => {
    const { selectedPhotoFiles, formData } = get();
    const maxPhotos = 5;
    const maxBytes = 5 * 1024 * 1024; // 5 MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    const newFiles = [...selectedPhotoFiles];
    const newPhotos = [...formData.photos];
    let error = null;

    for (const file of files) {
      if (newFiles.length >= maxPhotos) {
        error = `Maximum ${maxPhotos} photos allowed.`;
        break;
      }
      if (!allowedTypes.includes(file.type)) {
        error = `${file.name}: Only JPEG, PNG, and WebP images are allowed.`;
        break;
      }
      if (file.size > maxBytes) {
        error = `${file.name}: Size exceeds 5MB limit.`;
        break;
      }

      newFiles.push(file);
      newPhotos.push({
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        sizeKB: Math.round(file.size / 1024)
      });
    }

    set({
      selectedPhotoFiles: newFiles,
      formData: { ...formData, photos: newPhotos }
    });

    if (error) {
      set({ validationErrors: { ...get().validationErrors, photos: error } });
    } else {
      const errs = { ...get().validationErrors };
      delete errs.photos;
      set({ validationErrors: errs });
    }

    get().saveDraftDebounced();
  },

  removePhoto: (index) => {
    const { selectedPhotoFiles, formData } = get();
    const photo = formData.photos[index];
    if (photo?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    const newFiles = [...selectedPhotoFiles];
    const newPhotos = [...formData.photos];
    newFiles.splice(index, 1);
    newPhotos.splice(index, 1);

    set({
      selectedPhotoFiles: newFiles,
      formData: { ...formData, photos: newPhotos }
    });
    get().saveDraftDebounced();
  },

  clearPhotos: () => {
    const { formData } = get();
    formData.photos.forEach(p => {
      if (p.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(p.previewUrl);
      }
    });
    set({
      selectedPhotoFiles: [],
      formData: { ...formData, photos: [] }
    });
    get().saveDraftDebounced();
  },

  validateStep: (stepNumber) => {
    const { formData } = get();
    const errors = {};

    if (stepNumber === 1) {
      if (!formData.customer.companyName?.trim()) errors['customer.companyName'] = 'Company Name is required.';
      if (!formData.customer.contactPerson?.trim()) errors['customer.contactPerson'] = 'Contact Person is required.';
      if (!formData.customer.mobile?.trim()) {
        errors['customer.mobile'] = 'Mobile No. is required.';
      } else {
        const cleanMobile = formData.customer.mobile.replace(/[\s-]/g, '');
        if (!/^\d{10}$/.test(cleanMobile)) {
          errors['customer.mobile'] = 'Enter a valid 10-digit mobile number.';
        }
      }
      if (formData.customer.email?.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.customer.email.trim())) {
          errors['customer.email'] = 'Enter a valid email address.';
        }
      }
      if (!formData.customer.siteLocation?.trim()) errors['customer.siteLocation'] = 'Site / Visit Location is required.';
    }

    if (stepNumber === 2) {
      if (!formData.business.customerType) errors['business.customerType'] = 'Customer Type is required.';
      if (formData.business.customerType === 'Retail/Other' && !formData.business.customerTypeOther?.trim()) {
        errors['business.customerTypeOther'] = 'Please specify Customer Type.';
      }
      if (!formData.business.facility) errors['business.facility'] = 'Facility is required.';
      if (formData.business.facility === 'Other' && !formData.business.facilityOther?.trim()) {
        errors['business.facilityOther'] = 'Please specify Facility.';
      }
      if (!formData.business.status) errors['business.status'] = 'Project/Facility Status is required.';
    }

    if (stepNumber === 3) {
      if (formData.hasProductRequirement !== false) {
        if (!formData.products || formData.products.length === 0) {
          errors['products'] = 'Please select at least one product.';
        }
        if (formData.products?.includes('Other') && !formData.productOther?.trim()) {
          errors['productOther'] = 'Please specify Products.';
        }
      }
    }

    if (stepNumber === 5) {
      if (!formData.visit.visitType) errors['visit.visitType'] = 'Visit Type is required.';
      if (!formData.visit.photos) errors['visit.photos'] = 'Photos requirement is required.';
      if (!formData.visit.opportunity) errors['visit.opportunity'] = 'Opportunity rating is required.';
    }

    if (stepNumber === 6) {
      if (formData.followUp.nextAction?.includes('Quotation') && !formData.followUp.quotationDate) {
        errors['followUp.quotationDate'] = 'Quotation Required By date is required.';
      }
      if (!formData.followUp.followUpDate) {
        errors['followUp.followUpDate'] = formData.visit?.opportunity === 'FUTURE POTENTIAL'
          ? 'Next Follow-up Date is required for Future Potential visits.'
          : 'Next Follow-up Date is required.';
      }
    }

    if (stepNumber === 7) {
      if (formData.visit.photos === 'Taken' && formData.photos.length === 0) {
        errors['photos'] = 'Please upload at least 1 photo, up to 5.';
      }
    }

    set({ validationErrors: errors });
    return Object.keys(errors).length === 0;
  },

  goToStep: (step) => {
    const { formData } = get();
    if (formData.hasProductRequirement === false && (step === 3 || step === 4)) {
      return;
    }
    if (step >= 1 && step <= 8) {
      set({ currentStep: step });
      get().saveDraftDebounced();
    }
  },

  nextStep: () => {
    const { currentStep, totalSteps, formData, validateStep } = get();
    if (!validateStep(currentStep)) return false;

    let targetStep = currentStep + 1;
    if (currentStep === 2 && formData.hasProductRequirement === false) {
      targetStep = 5;
    } else if ((currentStep === 3 || currentStep === 4) && formData.hasProductRequirement === false) {
      targetStep = 5;
    }

    if (targetStep <= totalSteps) {
      set({ currentStep: targetStep });
      get().saveDraftDebounced();
      return true;
    }
    return true;
  },

  prevStep: () => {
    const { currentStep, formData } = get();
    let targetStep = currentStep - 1;
    if (currentStep === 5 && formData.hasProductRequirement === false) {
      targetStep = 2;
    }
    if (targetStep >= 1) {
      set({ currentStep: targetStep });
      get().saveDraftDebounced();
    }
  },

  saveDraftDebounced: (() => {
    let timer = null;
    return () => {
      set({ draftStatus: 'Saving...' });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const { currentStep, formData } = get();
          const cleanPhotos = (formData.photos || []).map(p => ({
            fileName: p.fileName,
            sizeKB: p.sizeKB
          }));

          const draft = {
            step: currentStep,
            data: { ...formData, photos: cleanPhotos }
          };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
          set({ draftStatus: `Saved at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` });
        } catch (e) {
          console.warn('Failed to save draft:', e);
        }
      }, 300);
    };
  })(),

  initDraft: () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.data) {
          set({
            formData: { ...getInitialInquiryData(), ...parsed.data },
            currentStep: parsed.step || 1,
            hasRestoredDraft: true,
            draftStatus: 'Draft restored from previous session'
          });
        }
      }
    } catch (e) {
      console.warn('Draft restore error:', e);
    }
  },

  dismissRestoredAlert: () => {
    set({ hasRestoredDraft: false });
  },

  clearDraft: () => {
    localStorage.removeItem(DRAFT_KEY);
    get().clearPhotos();
    set({
      formData: getInitialInquiryData(),
      currentStep: 1,
      hasRestoredDraft: false,
      draftStatus: '',
      validationErrors: {}
    });
  },

  submitInquiry: async () => {
    const { formData, selectedPhotoFiles } = get();
    set({ isSubmitting: true, submissionError: null });

    try {
      // 1. Create Inquiry (omit UI-only flow keys like hasProductRequirement)
      const { hasProductRequirement, ...cleanData } = formData;
      const payload = {
        ...cleanData,
        photos: [] // initial empty photos array, uploaded next
      };

      const res = await api.post('/inquiries', payload);
      const createdInquiry = res.data;

      // 2. Upload Photos if any
      if (selectedPhotoFiles.length > 0) {
        const formDataUpload = new FormData();
        selectedPhotoFiles.forEach(file => {
          formDataUpload.append('photos', file);
        });

        try {
          await api.post(`/inquiries/${createdInquiry._id || createdInquiry.inquiryNumber}/photos`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (photoErr) {
          console.warn('Photo upload warning:', photoErr.message);
        }
      }

      // Store submitted inquiry for success screen
      sessionStorage.setItem('pocika_submitted_inquiry', JSON.stringify(createdInquiry));

      // Clear draft
      get().clearDraft();
      set({ isSubmitting: false });
      return createdInquiry;
    } catch (err) {
      set({ isSubmitting: false, submissionError: err.message });
      throw err;
    }
  }
}));

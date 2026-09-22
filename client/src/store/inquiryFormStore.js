import { create } from 'zustand';
import api from '../api/client';
import uploadApi from '../api/uploadApi';

const DRAFT_KEY = 'pocika_inquiry_draft';
const OFFLINE_QUEUE_KEY = 'pocika_offline_inquiry_queue';

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const syncOfflineQueue = async () => {
  const queue = getOfflineQueue();
  if (!queue.length) return 0;
  let synced = 0;
  const remaining = [];
  for (const item of queue) {
    try {
      await api.post('/inquiries', item.payload);
      synced++;
    } catch (e) {
      console.warn('Offline sync retry failed for item:', e);
      remaining.push(item);
    }
  }
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
  return synced;
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue().then((syncedCount) => {
      if (syncedCount > 0) {
        console.log(`Successfully synced ${syncedCount} offline inquiries.`);
      }
    });
  });
}

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
    reason: '',
    renewalDueDate: ''
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
    visitType: 'Cold Visit',
    personMet: '',
    requirementDiscussed: '',
    photos: 'Attached',
    opportunity: 'HOT'
  },
  followUp: {
    nextAction: [],
    nextVisitType: 'Follow-up',
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
  isUploadingPhotos: false,
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

  addPhotoFiles: async (files, coords = null) => {
    const { formData } = get();
    const maxPhotos = 5;
    const maxBytes = 10 * 1024 * 1024; // 10 MB per Phase 9 spec
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    const existingPhotos = [...(formData.photos || [])];
    let error = null;

    const validFiles = [];
    for (const file of files) {
      if (existingPhotos.length + validFiles.length >= maxPhotos) {
        error = `Maximum ${maxPhotos} photos allowed.`;
        break;
      }
      const isAllowed = allowedTypes.includes(file.type?.toLowerCase()) ||
        /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!isAllowed) {
        error = `${file.name}: Only JPEG, PNG, and WebP images are allowed.`;
        break;
      }
      if (file.size > maxBytes) {
        error = `${file.name}: Size exceeds 10MB limit.`;
        break;
      }
      validFiles.push(file);
    }

    if (error) {
      set({ validationErrors: { ...get().validationErrors, photos: error } });
    }

    if (validFiles.length === 0) return;

    // Temporary optimistic items for immediate feedback
    const tempPhotos = validFiles.map((file) => ({
      photoId: 'temp-' + Math.random().toString(36).substring(2),
      fileName: file.name,
      originalFileName: file.name,
      caption: file.name,
      previewUrl: URL.createObjectURL(file),
      sizeKB: Math.round(file.size / 1024),
      latitude: coords?.latitude || null,
      longitude: coords?.longitude || null,
      isUploading: true
    }));

    set({
      isUploadingPhotos: true,
      formData: {
        ...formData,
        photos: [...existingPhotos, ...tempPhotos]
      }
    });

    try {
      const formDataUpload = new FormData();
      validFiles.forEach((file) => formDataUpload.append('photos', file));

      const res = await uploadApi.uploadDirect(formDataUpload);
      const uploadedPhotos = res.data?.photos || (res.data?.secureUrl ? [res.data] : []);

      // Filter out temp placeholders
      const remainingPhotos = (get().formData.photos || []).filter((p) => !p.photoId?.startsWith('temp-'));
      const permanentPhotos = uploadedPhotos.map((up) => ({
        photoId: up.photoId || crypto.randomUUID(),
        publicId: up.publicId || '',
        secureUrl: up.secureUrl || up.url,
        url: up.secureUrl || up.url,
        caption: up.caption || up.fileName || up.originalFileName || '',
        fileName: up.fileName || up.originalFileName || '',
        originalFileName: up.originalFileName || up.fileName || '',
        previewUrl: up.secureUrl || up.url,
        sizeKB: up.sizeKB || 0,
        latitude: coords?.latitude || up.latitude || null,
        longitude: coords?.longitude || up.longitude || null,
        uploadedAt: up.uploadedAt || new Date()
      }));

      // Revoke any temporary blob URLs
      tempPhotos.forEach((tp) => {
        if (tp.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(tp.previewUrl);
      });

      const updatedList = [...remainingPhotos, ...permanentPhotos];
      set({
        isUploadingPhotos: false,
        formData: {
          ...get().formData,
          photos: updatedList
        }
      });
      get().saveDraftDebounced();
    } catch (uploadErr) {
      console.error('Photo upload failed:', uploadErr);
      const remainingPhotos = (get().formData.photos || []).filter((p) => !p.photoId?.startsWith('temp-'));
      tempPhotos.forEach((tp) => {
        if (tp.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(tp.previewUrl);
      });
      set({
        isUploadingPhotos: false,
        formData: {
          ...get().formData,
          photos: remainingPhotos
        },
        validationErrors: {
          ...get().validationErrors,
          photos: `Photo upload failed: ${uploadErr.message || 'Please check connection'}`
        }
      });
    }
  },

  removePhoto: (index) => {
    const { formData } = get();
    const photo = formData.photos[index];
    if (photo?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);

    set({
      formData: { ...formData, photos: newPhotos }
    });
    get().saveDraftDebounced();
  },

  clearPhotos: () => {
    const { formData } = get();
    (formData.photos || []).forEach(p => {
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
            photoId: p.photoId,
            publicId: p.publicId,
            secureUrl: p.secureUrl,
            url: p.url,
            fileName: p.fileName,
            originalFileName: p.originalFileName,
            previewUrl: p.secureUrl || p.url,
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

  prefillCompanyDetails: (prev) => {
    const { formData } = get();
    const updated = {
      ...formData,
      customer: {
        companyName: prev.customer?.companyName || formData.customer.companyName,
        contactPerson: prev.customer?.contactPerson || '',
        designation: prev.customer?.designation || '',
        mobile: prev.customer?.mobile || '',
        email: prev.customer?.email || '',
        billingAddress: prev.customer?.billingAddress || '',
        siteLocation: prev.customer?.siteLocation || '',
        gstNo: prev.customer?.gstNo || ''
      },
      business: {
        customerType: prev.business?.customerType || '',
        customerTypeOther: prev.business?.customerTypeOther || '',
        industryType: prev.business?.industryType || '',
        locationGidc: prev.business?.locationGidc || '',
        facility: prev.business?.facility || '',
        facilityOther: prev.business?.facilityOther || '',
        areaSqft: prev.business?.areaSqft || '',
        floors: prev.business?.floors || '',
        status: prev.business?.status || '',
        expectedDate: ''
      },
      hasProductRequirement: true
    };
    set({ formData: updated, currentStep: 3, validationErrors: {} });
    get().saveDraftDebounced();
  },

  submitInquiry: async () => {
    const { formData } = get();
    set({ isSubmitting: true, submissionError: null });

    try {
      // 1. Prepare clean payload including durable photo records
      const { hasProductRequirement, ...cleanData } = formData;
      const cleanPhotos = (formData.photos || []).map(p => ({
        photoId: p.photoId || crypto.randomUUID(),
        publicId: p.publicId || '',
        secureUrl: p.secureUrl || p.url || p.previewUrl,
        url: p.secureUrl || p.url || p.previewUrl,
        caption: p.caption || p.fileName || p.originalFileName || '',
        fileName: p.fileName || p.originalFileName || '',
        originalFileName: p.originalFileName || p.fileName || '',
        previewUrl: p.secureUrl || p.url || p.previewUrl,
        sizeKB: p.sizeKB || 0,
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        uploadedAt: p.uploadedAt || new Date()
      }));

      const payload = {
        ...cleanData,
        photos: cleanPhotos
      };

      // Check if browser is currently offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queue = getOfflineQueue();
        const queuedItem = {
          id: 'offline-' + Date.now(),
          payload,
          savedAt: new Date().toISOString()
        };
        queue.push(queuedItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        const mockResult = {
          ...payload,
          inquiryNumber: 'SAVED-OFFLINE',
          isOfflineQueued: true
        };
        sessionStorage.setItem('pocika_submitted_inquiry', JSON.stringify(mockResult));
        get().clearDraft();
        set({ isSubmitting: false });
        return mockResult;
      }

      const res = await api.post('/inquiries', payload);
      const createdInquiry = res.data;

      // Ensure createdInquiry in sessionStorage reflects all saved photos
      if (!createdInquiry.photos || createdInquiry.photos.length === 0) {
        createdInquiry.photos = cleanPhotos;
      }
      sessionStorage.setItem('pocika_submitted_inquiry', JSON.stringify(createdInquiry));

      // Clear draft
      get().clearDraft();
      set({ isSubmitting: false });
      return createdInquiry;
    } catch (err) {
      if (err.code === 'NETWORK_ERROR' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        const queue = getOfflineQueue();
        const queuedItem = {
          id: 'offline-' + Date.now(),
          payload,
          savedAt: new Date().toISOString()
        };
        queue.push(queuedItem);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        const mockResult = {
          ...payload,
          inquiryNumber: 'SAVED-OFFLINE',
          isOfflineQueued: true
        };
        sessionStorage.setItem('pocika_submitted_inquiry', JSON.stringify(mockResult));
        get().clearDraft();
        set({ isSubmitting: false });
        return mockResult;
      }
      set({ isSubmitting: false, submissionError: err.message });
      throw err;
    }
  }
}));

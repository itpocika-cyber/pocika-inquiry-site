import { useCallback } from 'react';

/**
 * Validates inquiry form fields per step and returns a map of { fieldKey: errorMessage }.
 */
export function useValidation() {
  const validateStep = useCallback((stepNumber, data) => {
    const errors = {};

    switch (stepNumber) {
      case 1: {
        if (!data.customer.companyName?.trim()) {
          errors['customer.companyName'] = 'Company / Client Name is required.';
        }
        if (!data.customer.contactPerson?.trim()) {
          errors['customer.contactPerson'] = 'Contact Person name is required.';
        }
        const mobile = data.customer.mobile?.replace(/[\s-]/g, '') || '';
        if (!mobile) {
          errors['customer.mobile'] = 'Mobile number is required.';
        } else if (!/^\d{10}$/.test(mobile)) {
          errors['customer.mobile'] = 'Please enter a valid 10-digit mobile number.';
        }
        if (data.customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customer.email)) {
          errors['customer.email'] = 'Please enter a valid email address (e.g. name@domain.com).';
        }
        if (!data.customer.siteLocation?.trim()) {
          errors['customer.siteLocation'] = 'Site / Visit Location is required.';
        }
        break;
      }

      case 2: {
        if (!data.business.customerType) {
          errors['business.customerType'] = 'Please select a Customer Type.';
        } else if (data.business.customerType === 'Retail/Other' && !data.business.customerTypeOther?.trim()) {
          errors['business.customerTypeOther'] = 'Please specify the customer type.';
        }
        if (!data.business.facility) {
          errors['business.facility'] = 'Please select a Facility type.';
        } else if (data.business.facility === 'Other' && !data.business.facilityOther?.trim()) {
          errors['business.facilityOther'] = 'Please specify the facility type.';
        }
        if (!data.business.status) {
          errors['business.status'] = 'Please select Project / Facility Status.';
        }
        break;
      }

      case 3: {
        if (!data.products || data.products.length === 0) {
          errors['products'] = 'Please select at least one product requirement.';
        } else if (data.products.includes('Other') && !data.productOther?.trim()) {
          errors['productOther'] = 'Please specify the other product required.';
        }
        break;
      }

      case 4: {
        // Step 4 commercial fields are all optional per PDF specifications
        break;
      }

      case 5: {
        if (!data.visit.visitType) {
          errors['visit.visitType'] = 'Please select a Visit Type.';
        }
        if (!data.visit.photos) {
          errors['visit.photos'] = 'Please indicate whether photos are Taken or Not Required.';
        }
        if (!data.visit.opportunity) {
          errors['visit.opportunity'] = 'Please select an Opportunity level (e.g., HOT, WARM, COLD).';
        }
        break;
      }

      case 6: {
        if (!data.followUp.followUpDate) {
          errors['followUp.followUpDate'] = 'Next Follow-up Date is required.';
        }
        if (data.followUp.nextAction?.includes('Quotation') && !data.followUp.quotationDate) {
          errors['followUp.quotationDate'] = 'Quotation Required By date is required when Quotation is selected.';
        }
        break;
      }

      case 7: {
        if (data.visit.photos === 'Taken' && (!data.photos || data.photos.length === 0)) {
          errors['photos'] = 'Photos were marked as Taken in Step 5. Please upload at least 1 site photo or change status to Not Required.';
        }
        break;
      }

      default:
        break;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  return { validateStep };
}

export default useValidation;

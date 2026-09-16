import { qs, qsa } from './utils.js';
import { inquiryData } from './form.js';

export function initValidation() {
  const form = qs('#inquiry-form');
  if (!form) return;

  // Validate on blur
  form.addEventListener('blur', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      validateField(e.target);
    }
  }, true);
  
  // Validate on change for chips/checkboxes
  form.addEventListener('change', (e) => {
    if (e.target.type === 'radio' || e.target.type === 'checkbox') {
      // For radio/checkbox groups, we often need to validate the whole group
      if (e.target.name) {
        validateField(e.target);
      }
    }
  });
}

export function validateStep(stepIndex) {
  let isValid = true;
  const panel = qs(`.form-step-panel[data-step="${stepIndex}"]`);
  if (!panel) return true;

  // Find all required fields or fields with patterns in this step
  const inputs = panel.querySelectorAll('input, select, textarea');
  const validatedNames = new Set();
  
  inputs.forEach(input => {
    // skip hidden fields
    if (input.closest('.d-none')) return;

    if (input.name && !validatedNames.has(input.name)) {
      if (!validateField(input)) {
        isValid = false;
      }
      validatedNames.add(input.name);
    }
  });

  // Special check for products multi-select in step 3
  if (stepIndex === 3) {
    const productsGroup = qs('#products-group');
    if (productsGroup && !productsGroup.classList.contains('d-none')) {
      const productCheckboxes = productsGroup.querySelectorAll('input[name="products"]');
      const isChecked = Array.from(productCheckboxes).some(cb => cb.checked);
      const groupDiv = productsGroup;
      
      let errorSpan = groupDiv.querySelector('.field-error');
      if (!isChecked) {
        isValid = false;
        groupDiv.classList.add('has-error');
        if (!errorSpan) {
          errorSpan = document.createElement('span');
          errorSpan.className = 'field-error is-visible';
          errorSpan.textContent = 'Please select at least one product.';
          groupDiv.appendChild(errorSpan);
        } else {
          errorSpan.classList.add('is-visible');
          errorSpan.textContent = 'Please select at least one product.';
        }
      } else {
        groupDiv.classList.remove('has-error');
        if (errorSpan) errorSpan.classList.remove('is-visible');
      }
    }
  }
  // Special check for photos in step 7
  if (stepIndex === 7) {
    if (inquiryData.visit && inquiryData.visit.photos === 'Taken' && inquiryData.photos.length === 0) {
      isValid = false;
      const errorEl = qs('#photo-error');
      if (errorEl) {
        errorEl.textContent = 'Please upload at least 1 photo, up to 5.';
        errorEl.classList.add('is-visible');
      }
    }
  }

  return isValid;
}

function validateField(input) {
  // If input is part of a hidden group, skip validation
  if (input.closest('.d-none')) return true;

  const group = input.closest('.field-group') || input.parentElement;
  let errorSpan = group.querySelector('.field-error');
  
  let isValid = true;
  let errorMessage = '';

  // Radio group validation
  if (input.type === 'radio') {
    if (input.required) {
      const radios = document.querySelectorAll(`input[name="${input.name}"]`);
      const isChecked = Array.from(radios).some(r => r.checked);
      if (!isChecked) {
        isValid = false;
        errorMessage = 'This field is required.';
      }
    }
  } 
  // Standard input validation
  else {
    let value = input.value.trim();
    
    // required check
    if (input.required && !value) {
      isValid = false;
      errorMessage = 'This field is required.';
    }
    // tel check (10 digits)
    else if (value && input.type === 'tel') {
      const cleanVal = value.replace(/[\s-]/g, '');
      if (!/^\d{10}$/.test(cleanVal)) {
        isValid = false;
        errorMessage = 'Enter a valid 10-digit mobile number.';
      }
    }
    // email check
    else if (value && input.type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Enter a valid email address.';
      }
    }
  }

  if (!isValid) {
    group.classList.add('has-error');
    if (input.type !== 'radio' && input.type !== 'checkbox') {
      input.classList.add('is-invalid');
    }
    
    if (!errorSpan) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'field-error is-visible';
      group.appendChild(errorSpan);
    } else {
      errorSpan.classList.add('is-visible');
    }
    errorSpan.textContent = errorMessage;
  } else {
    group.classList.remove('has-error');
    if (input.type !== 'radio' && input.type !== 'checkbox') {
      input.classList.remove('is-invalid');
    }
    if (errorSpan) {
      errorSpan.classList.remove('is-visible');
    }
  }

  return isValid;
}

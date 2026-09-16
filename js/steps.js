import { qs, qsa, generateDemoInquiryNumber } from './utils.js';
import { validateStep } from './validation.js';
import { clearDraft, saveCurrentStep } from './draft.js';
import { inquiryData } from './form.js';
import { generateReview } from './review.js';

let currentStep = 1;
export const totalSteps = 8;
const stepLabels = [
  "Contact", "Customer", "Requirement", "Commercial", 
  "Opportunity", "Follow-up", "Remarks", "Review"
];

export function initSteps() {
  const btnNext = qs('#btn-next');
  const btnBack = qs('#btn-back');
  const btnNextDesktop = qs('#btn-next-desktop');
  const btnBackDesktop = qs('#btn-back-desktop');

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    
    if (currentStep < totalSteps) {
      currentStep++;
      if (currentStep === totalSteps) {
        generateReview();
      }
      updateStepUI();
      saveCurrentStep(currentStep);
    } else {
      submitForm();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      currentStep--;
      updateStepUI();
      saveCurrentStep(currentStep);
    }
  };

  btnNext?.addEventListener('click', goNext);
  btnNextDesktop?.addEventListener('click', goNext);
  btnBack?.addEventListener('click', goBack);
  btnBackDesktop?.addEventListener('click', goBack);

  updateStepUI();
}

export function goToStep(step) {
  if (step >= 1 && step <= totalSteps) {
    currentStep = step;
    updateStepUI();
    saveCurrentStep(currentStep);
  }
}

export function getCurrentStep() {
  return currentStep;
}

async function submitForm() {
  const btnNext = qs('#btn-next');
  const btnNextDesktop = qs('#btn-next-desktop');
  
  const originalMobileText = btnNext ? btnNext.textContent : '';
  const originalDesktopText = btnNextDesktop ? btnNextDesktop.textContent : '';
  
  // Set Loading State
  if (btnNext) {
    btnNext.textContent = 'Submitting...';
    btnNext.disabled = true;
  }
  if (btnNextDesktop) {
    btnNextDesktop.textContent = 'Submitting...';
    btnNextDesktop.disabled = true;
  }

  try {
    const { api } = await import('./api.js');
    
    // Send to backend
    const response = await api.createInquiry(inquiryData);
    
    // Update local data with server response (inquiryNumber, submissionMeta)
    Object.assign(inquiryData, response.data);
    
    // Clear draft ONLY on success
    clearDraft();

    // Store for success page
    sessionStorage.setItem('pocika_submitted_inquiry', JSON.stringify(inquiryData));

    // Redirect
    window.location.href = 'success.html';
  } catch (error) {
    console.error('Submission Failed:', error);
    alert(`Failed to submit inquiry:\n${error.message || 'Unknown error occurred. Please try again.'}`);
    
    // Restore button state
    if (btnNext) {
      btnNext.textContent = originalMobileText;
      btnNext.disabled = false;
    }
    if (btnNextDesktop) {
      btnNextDesktop.textContent = originalDesktopText;
      btnNextDesktop.disabled = false;
    }
  }
}

function updateStepUI() {
  // Show/Hide step panels
  qsa('.form-step-panel').forEach(panel => {
    const step = parseInt(panel.getAttribute('data-step'), 10);
    if (step === currentStep) {
      panel.classList.remove('d-none');
    } else {
      panel.classList.add('d-none');
    }
  });

  // Update Desktop Stepper
  qsa('.stepper-item').forEach(item => {
    const step = parseInt(item.getAttribute('data-step-indicator'), 10);
    item.classList.remove('is-active', 'is-complete');
    if (step < currentStep) {
      item.classList.add('is-complete');
      item.querySelector('.stepper-circle').textContent = '✓';
    } else if (step === currentStep) {
      item.classList.add('is-active');
      item.querySelector('.stepper-circle').textContent = step;
    } else {
      item.querySelector('.stepper-circle').textContent = step;
    }
  });

  // Update Mobile Stepper
  const mobileLabel = qs('#mobile-step-label');
  const mobileFill = qs('#mobile-step-fill');
  if (mobileLabel) {
    mobileLabel.textContent = `Step ${currentStep} of ${totalSteps} — ${stepLabels[currentStep - 1]}`;
  }
  if (mobileFill) {
    mobileFill.style.width = `${(currentStep / totalSteps) * 100}%`;
  }

  // Update Buttons
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const btnNext = qs('#btn-next');
  const btnBack = qs('#btn-back');
  const btnNextDesktop = qs('#btn-next-desktop');
  const btnBackDesktop = qs('#btn-back-desktop');

  if (btnBack) btnBack.disabled = isFirstStep;
  if (btnBackDesktop) btnBackDesktop.disabled = isFirstStep;

  if (btnNext) btnNext.textContent = isLastStep ? 'Confirm & Submit' : 'Next';
  if (btnNextDesktop) btnNextDesktop.textContent = isLastStep ? 'Confirm & Submit' : 'Save & continue';
  
  window.scrollTo(0, 0);
}

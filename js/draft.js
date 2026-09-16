import { qs, debounce } from './utils.js';
import { inquiryData } from './form.js';
import { goToStep } from './steps.js';

const DRAFT_KEY = 'pocika_inquiry_draft';
let currentDraftStep = 1;

// Call this from steps.js whenever step changes
export function saveCurrentStep(step) {
  currentDraftStep = step;
  saveDraftDebounced();
}

function saveDraft() {
  const statusEl = qs('#draft-status-indicator');
  if (statusEl) {
    statusEl.textContent = 'Saving...';
    statusEl.classList.remove('is-saved');
  }

  const cleanData = { ...inquiryData };
  if (Array.isArray(cleanData.photos)) {
    // Only store minimal metadata, no blob URLs or base64 in localStorage
    cleanData.photos = cleanData.photos.map(p => ({
      fileName: p.fileName,
      sizeKB: p.sizeKB
    }));
  }

  const draftData = {
    step: currentDraftStep,
    data: cleanData
  };

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    
    if (statusEl) {
      statusEl.textContent = `Saved at ${new Date().toLocaleTimeString()}`;
      statusEl.classList.add('is-saved');
    }
  } catch (err) {
    console.error("Failed to save draft:", err);
  }
}

export const saveDraftDebounced = debounce(saveDraft, 800);

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function restoreDataToForm() {
  // We need to sync `inquiryData` with DOM elements
  // Let's do a simple reverse-mapping for demo purposes
  const form = qs('#inquiry-form');
  if (!form) return;

  const inputs = form.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const name = input.name;
    if (!name) return;
    
    let val;
    if (name === 'products') {
      val = inquiryData.products;
    } else if (name === 'followUp.nextAction') {
      val = inquiryData.followUp.nextAction;
    } else {
      const parts = name.split('.');
      if (parts.length === 1) val = inquiryData[name];
      else if (parts.length === 2) val = inquiryData[parts[0]][parts[1]];
    }

    if (val !== undefined && val !== null && val !== '') {
      if (input.type === 'checkbox') {
        if (Array.isArray(val)) {
          input.checked = val.includes(input.value);
        } else {
          input.checked = (val === true || val === 'true');
        }
      } else if (input.type === 'radio') {
        input.checked = (input.value === val);
      } else {
        input.value = val;
      }
    }
  });

  // Manually trigger change events so conditional logic fires
  inputs.forEach(input => {
    if (input.checked || input.value) {
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
  });
}

export function initDraft() {
  let saved = null;
  try {
    saved = localStorage.getItem(DRAFT_KEY);
  } catch (err) {
    console.warn("localStorage not accessible", err);
  }
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge saved data into inquiryData
      Object.assign(inquiryData, parsed.data);
      currentDraftStep = parsed.step || 1;

      // Restore form values
      restoreDataToForm();

      // Jump to step
      if (currentDraftStep > 1) {
        goToStep(currentDraftStep);
      }

      // Show alert
      const alertContainer = qs('#draft-alert-container');
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert-pocika alert-info alert-dismissible mb-0">
            <div class="d-flex w-100 justify-content-between align-items-center">
              <div>
                <div class="alert-title">Draft restored</div>
                You were on Step ${currentDraftStep}. <a href="#" id="btn-start-new" data-bs-toggle="modal" data-bs-target="#discardModal">Start new inquiry</a>
              </div>
              <button type="button" class="btn-close" style="position:static;" onclick="this.closest('.alert-pocika').remove()"></button>
            </div>
          </div>
        `;
      }

    } catch (e) {
      console.error("Draft restore failed", e);
    }
  }

  // Handle discard
  const btnDiscard = qs('#btn-confirm-discard');
  if (btnDiscard) {
    btnDiscard.addEventListener('click', () => {
      clearDraft();
      window.location.reload();
    });
  }
}

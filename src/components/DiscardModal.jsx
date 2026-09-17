import React from 'react';

export default function DiscardModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
          <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <h3 className="text-section-title mb-0" style={{ fontSize: '1.125rem' }}>
              Discard this inquiry?
            </h3>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted-custom mb-0">
              Everything entered so far will be lost. This cannot be undone.
            </p>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="btn-pocika btn-pocika-secondary" onClick={onClose}>
              Keep editing
            </button>
            <button type="button" className="btn-pocika btn-pocika-danger-ghost" onClick={onConfirm}>
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

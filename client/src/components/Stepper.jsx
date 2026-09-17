import React from 'react';

const stepLabels = [
  'Contact',
  'Customer',
  'Requirement',
  'Commercial',
  'Opportunity',
  'Follow-up',
  'Remarks',
  'Review'
];

export default function Stepper({ currentStep, totalSteps, onStepClick }) {
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <>
      {/* Desktop Stepper */}
      <div className="d-none d-lg-block mb-5">
        <div className="stepper" id="desktop-stepper">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep;
            const isComplete = stepNum < currentStep;

            return (
              <div
                key={stepNum}
                className={`stepper-item ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
                data-step-indicator={stepNum}
                onClick={() => onStepClick && onStepClick(stepNum)}
                style={{ cursor: isComplete ? 'pointer' : 'default' }}
              >
                <span className="stepper-circle">
                  {isComplete ? '✓' : stepNum}
                </span>
                <span className="stepper-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper Header (inline) */}
      <div className="d-lg-none mb-4">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="text-field-label">
            Step {currentStep} of {totalSteps} — {stepLabels[currentStep - 1]}
          </span>
          <span className="text-muted small">{Math.round(progressPercent)}%</span>
        </div>
        <div className="stepper-mobile-track">
          <div
            className="stepper-mobile-fill"
            style={{ width: `${progressPercent}%`, transition: 'width 0.3s ease' }}
          />
        </div>
      </div>
    </>
  );
}

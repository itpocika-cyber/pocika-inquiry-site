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

export default function Stepper({ currentStep, totalSteps, onStepClick, hasProductRequirement = true }) {
  const activeSteps = hasProductRequirement ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 5, 6, 7, 8];
  const effectiveTotal = activeSteps.length;
  const effectiveCurrentIndex = activeSteps.indexOf(currentStep);
  const effectiveStepNum = effectiveCurrentIndex >= 0 ? effectiveCurrentIndex + 1 : 1;
  const progressPercent = (effectiveStepNum / effectiveTotal) * 100;

  return (
    <>
      {/* Desktop Stepper */}
      <div className="d-none d-lg-block mb-5">
        <div className="stepper" id="desktop-stepper">
          {stepLabels.map((label, idx) => {
            const stepNum = idx + 1;
            const isSkipped = !hasProductRequirement && (stepNum === 3 || stepNum === 4);
            const isActive = stepNum === currentStep;
            const isComplete = !isSkipped && (
              hasProductRequirement
                ? stepNum < currentStep
                : (stepNum < currentStep && stepNum !== 3 && stepNum !== 4)
            );

            return (
              <div
                key={stepNum}
                className={`stepper-item ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''} ${isSkipped ? 'is-skipped opacity-50' : ''}`}
                data-step-indicator={stepNum}
                onClick={() => !isSkipped && isComplete && onStepClick && onStepClick(stepNum)}
                style={{
                  cursor: isSkipped ? 'not-allowed' : (isComplete ? 'pointer' : 'default'),
                  userSelect: 'none'
                }}
              >
                <span
                  className="stepper-circle"
                  style={isSkipped ? { backgroundColor: '#e9ecef', color: '#6c757d', borderColor: '#dee2e6' } : undefined}
                >
                  {isSkipped ? '—' : isComplete ? '✓' : stepNum}
                </span>
                <span className="stepper-label">
                  {label} {isSkipped && <span className="small text-muted d-block" style={{ fontSize: '0.7rem' }}>(Skipped)</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper Header (inline) */}
      <div className="d-lg-none mb-4">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <span className="text-field-label">
            Step {effectiveStepNum} of {effectiveTotal} — {stepLabels[currentStep - 1]}
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

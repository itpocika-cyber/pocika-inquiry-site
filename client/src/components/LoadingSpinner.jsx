import React from 'react';

export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const spinnerClass = size === 'sm' ? 'spinner-border-sm' : size === 'lg' ? 'spinner-border-lg' : '';

  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 my-3 text-muted">
      <div className={`spinner-border text-primary ${spinnerClass}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <p className="mt-3 mb-0 small text-secondary">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;

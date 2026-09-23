import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  actionLabel,
  onAction
}) {
  return (
    <div className="card text-center p-5 my-4 border-0 shadow-sm" style={{ background: 'var(--color-white)', borderRadius: '12px' }}>
      <div className="d-flex justify-content-center mb-3">
        <div className="p-3 rounded-circle bg-light text-primary">
          <Icon size={36} />
        </div>
      </div>
      <h5 className="fw-bold mb-2 text-dark">{title}</h5>
      <p className="text-muted mx-auto mb-4" style={{ maxWidth: '400px', fontSize: '14px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <div>
          <button type="button" className="btn btn-primary px-4 py-2" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;

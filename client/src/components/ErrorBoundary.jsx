import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <div className="card shadow-sm p-5 border-0 mx-auto" style={{ maxWidth: '540px', borderRadius: '16px' }}>
            <div className="mb-3 text-danger">
              <AlertTriangle size={48} />
            </div>
            <h3 className="fw-bold mb-2">Something went wrong</h3>
            <p className="text-muted mb-4">
              An unexpected interface error occurred. You can safely reload the page or return to the dashboard.
            </p>
            <div className="d-flex gap-3 justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary d-flex align-items-center gap-2"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                className="btn btn-primary d-flex align-items-center gap-2"
                onClick={this.handleReset}
              >
                <RotateCcw size={16} /> Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

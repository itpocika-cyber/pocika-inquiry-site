import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../api/client';

export default function Success() {
  const [submittedInquiry, setSubmittedInquiry] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pocika_submitted_inquiry');
      if (stored) {
        setSubmittedInquiry(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to parse submitted inquiry:', e);
    }
  }, []);

  const handlePdf = async (isDownload = false) => {
    if (!submittedInquiry?.inquiryNumber && !submittedInquiry?._id) return;
    const targetId = submittedInquiry.inquiryNumber || submittedInquiry._id;

    setPdfGenerating(true);
    try {
      const downloadParam = isDownload ? '?download=true' : '';
      const response = await api.get(`/inquiries/${targetId}/pdf${downloadParam}`, {
        responseType: 'blob'
      });

      const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);

      if (isDownload) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `POCIKA-Inquiry-${submittedInquiry.inquiryNumber || 'Document'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
      } else {
        window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Could not generate PDF: ${err.message || 'Please check server logs.'}`);
    } finally {
      setPdfGenerating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB');
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="container-app section-block d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
        <div className="card-pocika text-center py-5 px-4 w-100" style={{ maxWidth: '600px' }}>
          <div className="mb-3" style={{ fontSize: '3.5rem', color: 'var(--color-success)', lineHeight: 1 }}>
            ✓
          </div>
          <h1 className="text-page-title mb-2">Inquiry submitted successfully</h1>
          <p className="text-muted-custom mb-4">
            Your inquiry has been submitted and securely recorded in the system.
          </p>

          <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="text-helper">Inquiry Number</div>
            <div className="text-field-label fs-4 fw-bold mb-1" style={{ color: 'var(--color-navy)' }}>
              {submittedInquiry?.inquiryNumber || 'Recorded'}
            </div>
            <div className="text-helper small">
              Confirmed on {formatDate(submittedInquiry?.submissionMeta?.confirmedAt || submittedInquiry?.createdAt)}
            </div>
          </div>

          <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 mb-4">
            {submittedInquiry && (
              <Link
                to={`/inquiries/${submittedInquiry.inquiryNumber || submittedInquiry._id}`}
                className="btn-pocika btn-pocika-secondary"
              >
                View Inquiry Details
              </Link>
            )}
            <button
              type="button"
              className="btn-pocika btn-pocika-secondary"
              disabled={pdfGenerating || !submittedInquiry}
              onClick={() => handlePdf(false)}
            >
              {pdfGenerating ? 'Generating...' : 'Preview PDF'}
            </button>
            <button
              type="button"
              className="btn-pocika btn-pocika-secondary"
              disabled={pdfGenerating || !submittedInquiry}
              onClick={() => handlePdf(true)}
            >
              Download PDF
            </button>
          </div>

          <div>
            <Link to="/inquiry" className="btn-pocika btn-pocika-primary w-100 w-sm-auto">
              Create Another Inquiry
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

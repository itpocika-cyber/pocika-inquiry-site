const fs = require('fs');
let c = fs.readFileSync('client/src/pages/InquiryDetails.jsx', 'utf8');

const modalState = `  const [showNextVisitModal, setShowNextVisitModal] = useState(false);
  const [nextVisitData, setNextVisitData] = useState({
    date: new Date().toISOString().split('T')[0],
    visitType: 'Site Visit',
    opportunity: 'WARM',
    remarks: '',
    nextAction: [],
    followUpDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
  });
  const [submittingNextVisit, setSubmittingNextVisit] = useState(false);

  const handleNextVisitSubmit = async (e) => {
    e.preventDefault();
    setSubmittingNextVisit(true);
    try {
      await inquiryApi.logNextVisit(inquiry._id || inquiry.inquiryNumber, {
        date: nextVisitData.date,
        visit: { visitType: nextVisitData.visitType, opportunity: nextVisitData.opportunity },
        followUp: { nextAction: nextVisitData.nextAction, followUpDate: nextVisitData.followUpDate },
        remarks: nextVisitData.remarks
      });
      setShowNextVisitModal(false);
      window.location.reload();
    } catch (err) {
      alert("Failed to log next visit: " + err.message);
    } finally {
      setSubmittingNextVisit(false);
    }
  };
`;

c = c.replace(/const \[pdfGenerating, setPdfGenerating\] = useState\(false\);/, modalState + '\n  const [pdfGenerating, setPdfGenerating] = useState(false);');

const nextVisitBtn = `{user?.role === 'sales_person' && (
              <button
                type="button"
                className="btn-pocika btn-pocika-primary"
                onClick={() => setShowNextVisitModal(true)}
              >
                + Log Next Visit
              </button>
            )}`;

c = c.replace(/\{user\?\.role === 'sales_person' && \([\s\S]*?\+ Log Next Visit[\s\S]*?<\/button>\s*\)\}/, nextVisitBtn);

const modalUI = `
      {/* Log Next Visit Modal */}
      {showNextVisitModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Log Next Visit</h5>
                <button type="button" className="btn-close" onClick={() => setShowNextVisitModal(false)}></button>
              </div>
              <form onSubmit={handleNextVisitSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-pocika fw-semibold">Visit Date</label>
                    <input type="date" className="form-control-pocika" value={nextVisitData.date} onChange={e => setNextVisitData({...nextVisitData, date: e.target.value})} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-pocika fw-semibold">Opportunity</label>
                    <select className="form-control-pocika" value={nextVisitData.opportunity} onChange={e => setNextVisitData({...nextVisitData, opportunity: e.target.value})}>
                      <option value="HOT">HOT</option>
                      <option value="WARM">WARM</option>
                      <option value="COLD">COLD</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-pocika fw-semibold">Remarks / Minutes of Meeting</label>
                    <textarea className="form-control-pocika" rows="3" value={nextVisitData.remarks} onChange={e => setNextVisitData({...nextVisitData, remarks: e.target.value})} required></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-pocika fw-semibold">Next Follow-up Date</label>
                    <input type="date" className="form-control-pocika" value={nextVisitData.followUpDate} onChange={e => setNextVisitData({...nextVisitData, followUpDate: e.target.value})} required />
                  </div>
                </div>
                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn-pocika btn-pocika-secondary" onClick={() => setShowNextVisitModal(false)}>Cancel</button>
                  <button type="submit" className="btn-pocika btn-pocika-primary" disabled={submittingNextVisit}>{submittingNextVisit ? 'Saving...' : 'Save Visit'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
`;

c = c.replace(/<\/div>\s*<\/div>\s*\)\s*\}\s*<\/div>\s*\);\s*\}$/m, `</div>\n    ${modalUI}\n  </div>\n  );\n}`);

fs.writeFileSync('client/src/pages/InquiryDetails.jsx', c, 'utf8');

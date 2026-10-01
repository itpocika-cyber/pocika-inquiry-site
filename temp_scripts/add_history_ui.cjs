const fs = require('fs');
let c = fs.readFileSync('client/src/pages/InquiryDetails.jsx', 'utf8');

const historyBlock = `
              {inquiry.visitHistory && inquiry.visitHistory.length > 0 && (
                <div className="card-pocika bg-white border mb-4">
                  <div className="border-bottom p-3">
                    <h2 className="text-field-label m-0" style={{ fontSize: '1.1rem' }}>
                      Previous Visit History
                    </h2>
                  </div>
                  <div className="p-3 d-flex flex-column gap-3">
                    {inquiry.visitHistory.map((h, i) => (
                      <div key={i} className="border p-3 rounded bg-light">
                        <div className="d-flex justify-content-between mb-2">
                          <strong>Date: {h.date}</strong>
                          <span className="badge bg-secondary">{h.visit?.opportunity || 'N/A'}</span>
                        </div>
                        <div className="small text-muted mb-2">Logged by: {h.salesPerson || 'Sales'}</div>
                        <div className="small mb-1"><strong>Met:</strong> {h.visit?.personMet || '-'}</div>
                        <div className="small mb-1"><strong>Remarks:</strong> {h.remarks || '-'}</div>
                        <div className="small"><strong>Next Follow-up:</strong> {h.followUp?.followUpDate || '-'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
`;

c = c.replace(/\{\/\* Comments Thread \*\/\}/, historyBlock + '\n              {/* Comments Thread */}');

fs.writeFileSync('client/src/pages/InquiryDetails.jsx', c, 'utf8');

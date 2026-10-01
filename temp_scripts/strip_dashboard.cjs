const fs = require('fs');
let c = fs.readFileSync('client/src/pages/AdminDashboard.jsx', 'utf8');

const regexFilterBar = /\{\/\* Filter Bar \*\/\}\s*<div className="admin-filter-bar mb-3">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Main Inquiries Table Card \*\/\}/m;

// Replace filter bar with just the table comment
c = c.replace(regexFilterBar, '{/* Main Inquiries Table Card */}');

// Change the header from "All Inquiries" to "Recent Inquiries" and add view all link
const regexTableHeader = /<h2 className="admin-card__title">\s*<span className="admin-card__title-text">All Inquiries<\/span>\s*<span className="badge bg-primary text-white rounded-pill px-2 py-1 ms-2" style=\{\{ fontSize: '0.8rem' \}\}>\s*\{filteredInquiries\.length\}\s*<\/span>\s*<\/h2>/m;

c = c.replace(regexTableHeader, `<div className="d-flex justify-content-between align-items-center w-100">
                  <h2 className="admin-card__title mb-0">
                    <span className="admin-card__title-text">Recent Inquiries</span>
                  </h2>
                  <Link to="/inquiries" className="btn btn-sm btn-outline-primary fw-semibold" style={{ fontSize: '0.8rem' }}>
                    View All Inquiries &rarr;
                  </Link>
                </div>`);

// Change Pagination UI and slicing
// Right now, it does:
// const currentRecords = filteredInquiries.slice(indexOfFirstRecord, indexOfLastRecord);
// We want to hardcode currentRecords to just top 15 and hide pagination.

c = c.replace(/const currentRecords = filteredInquiries\.slice\(indexOfFirstRecord, indexOfLastRecord\);/m, 'const currentRecords = filteredInquiries.slice(0, 15);');

// Remove Pagination block
const regexPagination = /\{\/\* Pagination Controls \*\/\}\s*\{totalPages > 1 && \([\s\S]*?\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Right Column: Insights & Alerts \*\/\}/m;

c = c.replace(regexPagination, '</div>\n              </div>\n            </div>\n            {/* Right Column: Insights & Alerts */}');

fs.writeFileSync('client/src/pages/AdminDashboard.jsx', c, 'utf8');

const fs = require('fs');
let c = fs.readFileSync('client/src/pages/AdminDashboard.jsx', 'utf8');

c = c.replace(/import \{ Link, useNavigate \} from 'react-router-dom';/, "import { Link, useNavigate } from 'react-router-dom';\nimport AdminLayout from '../components/AdminLayout';");

const regexTop = /<div className="admin-layout">[\s\S]*?<main className="admin-layout__main">[\s\S]*?<div className="p-3 p-md-4">/;
c = c.replace(regexTop, `<AdminLayout title="Admin Dashboard">\n        <div>`);

const regexBottom = /<\/div>\s*<\/main>\s*\{.*?showAnnouncementModal[\s\S]*?<\/div>\s*\)\s*\}\s*<\/div>\s*\);\s*\}$/m;
c = c.replace(regexBottom, '</div>\n    </AdminLayout>\n  );\n}');

const regexFilterBar = /\{\/\* Filter Bar \*\/\}\s*<div className="admin-filter-bar mb-3">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Main Inquiries Table Card \*\/\}/m;
c = c.replace(regexFilterBar, '{/* Main Inquiries Table Card */}');

const regexTableHeader = /<h2 className="admin-card__title">\s*<span className="admin-card__title-text">All Inquiries<\/span>\s*<span className="badge bg-primary text-white rounded-pill px-2 py-1 ms-2" style=\{\{ fontSize: '0.8rem' \}\}>\s*\{filteredInquiries\.length\}\s*<\/span>\s*<\/h2>/m;
c = c.replace(regexTableHeader, `<div className="d-flex justify-content-between align-items-center w-100">\n                  <h2 className="admin-card__title mb-0">\n                    <span className="admin-card__title-text">Recent Inquiries</span>\n                  </h2>\n                  <Link to="/inquiries" className="btn btn-sm btn-outline-primary fw-semibold" style={{ fontSize: '0.8rem' }}>\n                    View All Inquiries &rarr;\n                  </Link>\n                </div>`);

c = c.replace(/const currentRecords = filteredInquiries\.slice\(indexOfFirstRecord, indexOfLastRecord\);/m, 'const currentRecords = filteredInquiries.slice(0, 15);');

const regexPagination = /\{\/\* Pagination Controls \*\/\}\s*\{totalPages > 1 && \([\s\S]*?\}\s*<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* Right Column: Insights & Alerts \*\/\}/m;
c = c.replace(regexPagination, '</div>\n              </div>\n            </div>\n            {/* Right Column: Insights & Alerts */}');

fs.writeFileSync('client/src/pages/AdminDashboard.jsx', c, 'utf8');

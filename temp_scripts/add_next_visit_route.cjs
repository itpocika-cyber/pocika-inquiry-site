const fs = require('fs');
let c = fs.readFileSync('server/routes/inquiry.routes.js', 'utf8');

c = c.replace(/import \{([\s\S]*?)deleteInquiry/m, 'import { $1deleteInquiry, logNextVisit');
c = c.replace(/router\.delete\('\/:id',\s*protect,\s*authorize\('admin',\s*'super_admin'\),\s*deleteInquiry\);/, "router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteInquiry);\n\nrouter.post('/:id/next-visit', protect, logNextVisit);");

fs.writeFileSync('server/routes/inquiry.routes.js', c, 'utf8');

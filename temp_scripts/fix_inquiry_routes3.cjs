const fs = require('fs');
let c = fs.readFileSync('server/routes/inquiry.routes.js', 'utf8');

c = c.replace(/router\.post\('\/:id\/comments', authenticateUser, addInquiryComment\);/, "router.post('/:id/comments', authenticateUser, addInquiryComment);\nrouter.post('/:id/next-visit', authenticateUser, logNextVisit);\nrouter.delete('/:id', authenticateUser, deleteInquiry);");

fs.writeFileSync('server/routes/inquiry.routes.js', c, 'utf8');

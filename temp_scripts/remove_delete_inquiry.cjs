const fs = require('fs');
let c = fs.readFileSync('server/routes/inquiry.routes.js', 'utf8');

c = c.replace(/deleteInquiry,\s*/, "");
c = c.replace(/router\.delete\('\/:id',\s*authenticateUser,\s*deleteInquiry\);\r?\n?/, "");

fs.writeFileSync('server/routes/inquiry.routes.js', c, 'utf8');

const fs = require('fs');
let c = fs.readFileSync('server/routes/inquiry.routes.js', 'utf8');

c = c.replace(/deletePhoto/, "deleteInquiryPhoto");

fs.writeFileSync('server/routes/inquiry.routes.js', c, 'utf8');

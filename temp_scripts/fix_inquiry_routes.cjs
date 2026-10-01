const fs = require('fs');
let c = fs.readFileSync('server/routes/inquiry.routes.js', 'utf8');

c = c.replace(/deleteInquiry, logNextVisitPhoto/, "deletePhoto");

// Ensure deleteInquiry and logNextVisit are imported from inquiry.controller.js
c = c.replace(/addInquiryComment\r?\n\} from '\.\.\/controllers\/inquiry\.controller\.js';/, "addInquiryComment,\n  deleteInquiry,\n  logNextVisit\n} from '../controllers/inquiry.controller.js';");

fs.writeFileSync('server/routes/inquiry.routes.js', c, 'utf8');

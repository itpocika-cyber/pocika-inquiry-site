const fs = require('fs');
let c = fs.readFileSync('client/src/pages/InquiryDetails.jsx', 'utf8');

c = c.replace(/onClick=\{.*?navigate\(\`\/inquiry\?cloneId=\$\{inquiry\._id \|\| inquiry\.inquiryNumber\}\`\)\}/, "onClick={() => navigate(`/inquiry?nextVisitId=${inquiry._id || inquiry.inquiryNumber}`)}");

fs.writeFileSync('client/src/pages/InquiryDetails.jsx', c, 'utf8');

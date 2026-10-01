const fs = require('fs');
let c = fs.readFileSync('client/src/pages/SalesMemberDetail.jsx', 'utf8');

// Replace the end with the correct closing tags
c = c.replace(/<\/AdminLayout>\s*\)\s*;\s*\}/m, '</main>\n      </div>\n    </AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/SalesMemberDetail.jsx', c, 'utf8');

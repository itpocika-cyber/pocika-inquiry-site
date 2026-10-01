const fs = require('fs');
let c = fs.readFileSync('client/src/pages/SalesMemberDetail.jsx', 'utf8');

c = c.replace(/<\/div>\s*<\/AdminLayout>\s*\)\s*;\s*\}/m, '</div>\n    </AdminLayout>\n  );\n}'); // This didn't work last time because of /div instead of /main.

// Actually I will just replace `</div>\n      </AdminLayout>` with `</AdminLayout>` if there is a main. Wait, let me just find the end.
c = c.replace(/<\/div>\s*<\/AdminLayout>/, '</AdminLayout>');
c = c.replace(/<\/div>\s*<\/AdminLayout>/, '</AdminLayout>'); // Just in case it's duplicated

fs.writeFileSync('client/src/pages/SalesMemberDetail.jsx', c, 'utf8');

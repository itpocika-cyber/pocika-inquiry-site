const fs = require('fs');
let c = fs.readFileSync('client/src/pages/SalesMemberDetail.jsx', 'utf8');

// The replacement was:
// c = c.replace(/<\/main>\s*<Footer \/>\s*<\/div>/, '</div>\n    </AdminLayout>');
// But wait, it replaced `</main> </div>` with `</div> </AdminLayout>` and left `</main>` unmatched maybe?
// Let's just fix the end of the file.

c = c.replace(/<\/div>\s*<\/AdminLayout>\s*\)\s*;\s*\}/m, '</AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/SalesMemberDetail.jsx', c, 'utf8');

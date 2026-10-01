const fs = require('fs');
let c = fs.readFileSync('client/src/pages/ManageTeam.jsx', 'utf8');

c = c.replace(/<\/main>\s*<Footer \/>/, '');
c = c.replace(/<\/div>\s*\);\s*\}$/m, '</AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/ManageTeam.jsx', c, 'utf8');

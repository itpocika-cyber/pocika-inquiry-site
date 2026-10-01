const fs = require('fs');
let c = fs.readFileSync('client/src/pages/ManageTeam.jsx', 'utf8');

c = c.replace(/<\/AdminLayout>\s*\);\s*\}$/m, '</div>\n    </AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/ManageTeam.jsx', c, 'utf8');

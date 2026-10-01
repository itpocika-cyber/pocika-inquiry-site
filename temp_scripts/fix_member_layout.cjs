const fs = require('fs');
let c = fs.readFileSync('client/src/pages/SalesMemberDetail.jsx', 'utf8');

c = c.replace(/import Header from '\.\.\/components\/Header';\r?\nimport Footer from '\.\.\/components\/Footer';/, "import AdminLayout from '../components/AdminLayout';");

c = c.replace(/<div className="app-shell">\s*<Header \/>/, '<AdminLayout title="Back to Sales Team">\n      <div>');

c = c.replace(/<\/main>\s*<\/div>\s*<\/AdminLayout>\s*\)\s*;\s*\}/m, '</div>\n    </AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/SalesMemberDetail.jsx', c, 'utf8');

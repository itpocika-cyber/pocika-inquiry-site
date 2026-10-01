const fs = require('fs');

function applyAdminLayout(path, title) {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(/import Header from '..\/components\/Header';\r?\n/, "import AdminLayout from '../components/AdminLayout';\n");
  c = c.replace(/import Footer from '..\/components\/Footer';\r?\n/, "");
  c = c.replace(/<div className="app-shell">\s*<Header \/>\s*<main className="container-app section-block">/, `<AdminLayout title="${title}">\n      <div>`);
  c = c.replace(/<\/main>\s*<Footer \/>\s*<\/div>/, '</div>\n    </AdminLayout>');
  c = c.replace(/<\/main>\s*<\/div>/, '</div>\n    </AdminLayout>');
  fs.writeFileSync(path, c, 'utf8');
}

applyAdminLayout('client/src/pages/SalesMemberDetail.jsx', 'Back to Sales Team');


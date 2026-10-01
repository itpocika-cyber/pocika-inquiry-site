const fs = require('fs');
let c = fs.readFileSync('client/src/pages/ManageCatalog.jsx', 'utf8');

c = c.replace(/import \{ Link, useNavigate \} from 'react-router-dom';/, "import { Link, useNavigate } from 'react-router-dom';\nimport AdminLayout from '../components/AdminLayout';");

const regexTop = /<div className="admin-layout">[\s\S]*?<main className="admin-layout__main">[\s\S]*?<div className="p-3 p-md-4">/;
c = c.replace(regexTop, `<AdminLayout title="Product Catalog">\n        <div>`);

const regexBottom = /<\/div>\s*<\/main>\s*<\/div>\s*\)\s*\}$/m;
c = c.replace(regexBottom, '</div>\n    </AdminLayout>\n  );\n}');

fs.writeFileSync('client/src/pages/ManageCatalog.jsx', c, 'utf8');

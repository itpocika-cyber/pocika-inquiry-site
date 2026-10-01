const fs = require('fs');
let c = fs.readFileSync('client/src/pages/AdminDashboard.jsx', 'utf8');

c = c.replace(/import AdminLayout from '\.\.\/components\/AdminLayout';\r?\nimport AdminLayout from '\.\.\/components\/AdminLayout';/, "import AdminLayout from '../components/AdminLayout';");

fs.writeFileSync('client/src/pages/AdminDashboard.jsx', c, 'utf8');

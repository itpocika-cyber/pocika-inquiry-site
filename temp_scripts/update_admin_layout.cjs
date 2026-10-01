const fs = require('fs');
let c = fs.readFileSync('client/src/components/AdminLayout.jsx', 'utf8');

c = c.replace("import { LayoutDashboard, Users, Book, Bell, LogOut } from 'lucide-react';", "import { LayoutDashboard, Users, Book, Bell, LogOut, List } from 'lucide-react';");

const sidebarLink = `          <Link to="/admin-dashboard" className={\`admin-nav-item \${location.pathname === '/admin-dashboard' ? 'active' : ''}\`}>
            <LayoutDashboard className="admin-nav-icon" />
            Dashboard
          </Link>
          <Link to="/inquiries" className={\`admin-nav-item \${location.pathname === '/inquiries' ? 'active' : ''}\`}>
            <List className="admin-nav-icon" />
            All Inquiries
          </Link>`;

c = c.replace(/<Link to="\/admin-dashboard"[\s\S]*?Dashboard\s*<\/Link>/, sidebarLink);

const newFooter = `<div className="d-flex align-items-center mb-3">
              <div
                className="rounded-circle bg-light d-flex justify-content-center align-items-center me-2 fw-bold text-primary"
                style={{ width: '36px', height: '36px' }}
              >
                {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div className="text-truncate" style={{ maxWidth: '130px' }}>
                <div className="fw-bold small text-truncate">{user?.displayName || 'Administrator'}</div>
                <div className="text-muted small text-truncate" style={{ fontSize: '0.7rem' }}>{user?.email}</div>
              </div>
            </div>
            <button
              type="button"
              className="btn w-100 btn-sm d-flex align-items-center justify-content-center gap-2"
              style={{ border: '1px solid #dc3545', color: '#dc3545', backgroundColor: 'transparent' }}
              onClick={handleLogout}
            >
              <LogOut size={15} />
              Logout
            </button>`;

c = c.replace(/<div className="d-flex align-items-center mb-3">[\s\S]*?Logout\s*<\/button>/, newFooter);

fs.writeFileSync('client/src/components/AdminLayout.jsx', c, 'utf8');

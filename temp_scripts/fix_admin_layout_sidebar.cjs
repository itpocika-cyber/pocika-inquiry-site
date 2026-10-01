const fs = require('fs');
let c = fs.readFileSync('client/src/components/AdminLayout.jsx', 'utf8');

const correctSidebar = `        {/* Sidebar */}
        <nav className={\`admin-layout__sidebar \${sidebarOpen ? 'is-open' : ''}\`}>
          <div className="admin-layout__sidebar-header">
            <Link to="/admin-dashboard" className="admin-brand">
              <img src="/assets/logo/pocika-logo.png" alt="POCIKA" className="admin-brand__logo" />
              <div>
                <div className="admin-brand__title">POCIKA</div>
                <div className="admin-brand__subtitle">Administration Portal</div>
              </div>
            </Link>
            <button
              type="button"
              className="btn-close d-lg-none"
              onClick={() => setSidebarOpen(false)}
            ></button>
          </div>

          <div className="admin-nav py-3">
            <Link to="/admin-dashboard" className={\`admin-nav-item \${location.pathname === '/admin-dashboard' ? 'active' : ''}\`}>
              <LayoutDashboard className="admin-nav-icon" />
              Dashboard
            </Link>
            <Link to="/inquiries" className={\`admin-nav-item \${location.pathname === '/inquiries' ? 'active' : ''}\`}>
              <List className="admin-nav-icon" />
              All Inquiries
            </Link>
            <Link to="/admin/team" className={\`admin-nav-item \${location.pathname.startsWith('/admin/team') ? 'active' : ''}\`}>
              <Users className="admin-nav-icon" />
              Manage Sales Team
            </Link>
            <Link to="/admin/catalog" className={\`admin-nav-item \${location.pathname.startsWith('/admin/catalog') ? 'active' : ''}\`}>
              <Book className="admin-nav-icon" />
              Product Catalog
            </Link>
            <button
              type="button"
              className="admin-nav-item w-100 text-start border-0 bg-transparent mt-2"
              onClick={() => setShowAnnouncementModal(true)}
            >
              <Bell className="admin-nav-icon" />
              Post Announcement
            </button>
          </div>

          {/* Sidebar Footer with current user & logout */}
          <div className="p-3 border-top mt-auto">`;

const regex = /\{\/\* Sidebar \*\/\}\s*<nav className=\{\`admin-layout__sidebar.*?\`\}>\s*<div className="admin-layout__sidebar-header">[\s\S]*?\{\/\* Sidebar Footer with current user & logout \*\/\}\s*<div className="p-3 border-top mt-auto">/m;

c = c.replace(regex, correctSidebar);

fs.writeFileSync('client/src/components/AdminLayout.jsx', c, 'utf8');

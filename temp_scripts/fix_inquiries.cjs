const fs = require('fs');
let c = fs.readFileSync('client/src/pages/InquiriesList.jsx', 'utf8');

c = c.replace(/import Header from '..\/components\/Header';\r?\nimport Footer from '..\/components\/Footer';/, "import Header from '../components/Header';\nimport Footer from '../components/Footer';\nimport AdminLayout from '../components/AdminLayout';");

const mainContentMatch = c.match(/return \(\s*<div className="app-shell">\s*<Header \/>\s*<main className="container-app section-block">([\s\S]*?)<\/main>\s*<Footer \/>\s*<\/div>\s*\);/);

if (mainContentMatch) {
  const contentBody = mainContentMatch[1];
  
  const newReturn = `
  const content = (
    <div className={!isAdmin ? "container-app section-block" : ""}>
${contentBody}
    </div>
  );

  if (isAdmin) {
    return <AdminLayout title="All Inquiries">{content}</AdminLayout>;
  }

  return (
    <div className="app-shell">
      <Header />
      {content}
      <Footer />
    </div>
  );
`;
  
  c = c.replace(/return \(\s*<div className="app-shell">\s*<Header \/>\s*<main className="container-app section-block">[\s\S]*?<\/main>\s*<Footer \/>\s*<\/div>\s*\);/, newReturn);
  fs.writeFileSync('client/src/pages/InquiriesList.jsx', c, 'utf8');
} else {
  console.log("Could not match the layout block");
}

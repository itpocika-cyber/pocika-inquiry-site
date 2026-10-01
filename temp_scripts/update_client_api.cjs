const fs = require('fs');
let c = fs.readFileSync('client/src/api/client.js', 'utf8');

c = c.replace(/export const inquiryApi = \{[\s\S]*?create:[\s\S]*?update:[\s\S]*?delete:[\s\S]*?getComments:[\s\S]*?addComment:[\s\S]*?exportExcel:[\s\S]*?\};/, match => {
  return match.replace(/exportExcel:/, `logNextVisit: async (id, data) => {\n    const res = await api.post(\`/inquiries/\${id}/next-visit\`, data);\n    return res.data;\n  },\n  exportExcel:`);
});

fs.writeFileSync('client/src/api/client.js', c, 'utf8');

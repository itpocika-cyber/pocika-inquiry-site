const fs = require('fs');
let c = fs.readFileSync('server/controllers/inquiry.controller.js', 'utf8');

c = c.replace(/const inquiry = await Inquiry\.findById\(req\.params\.id\);/, `let inquiry = null;
    if (req.params.id.startsWith('PSI-') || req.params.id.startsWith('INQ-')) {
      inquiry = await Inquiry.findOne({ inquiryNumber: req.params.id });
    } else {
      inquiry = await Inquiry.findById(req.params.id);
    }`);

fs.writeFileSync('server/controllers/inquiry.controller.js', c, 'utf8');

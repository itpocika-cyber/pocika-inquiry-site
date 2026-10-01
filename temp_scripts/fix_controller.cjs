const fs = require('fs');
let c = fs.readFileSync('server/controllers/inquiry.controller.js', 'utf8');

const nextVisitFn = `
export const logNextVisit = async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ message: 'Inquiry not found' });

    inquiry.visitHistory.push({
      date: inquiry.date,
      salesPerson: inquiry.salesPerson,
      visit: inquiry.visit,
      followUp: inquiry.followUp,
      remarks: inquiry.remarks,
      loggedAt: new Date()
    });

    const newData = req.body;
    inquiry.date = newData.date || inquiry.date;
    inquiry.salesPerson = newData.salesPerson || inquiry.salesPerson;
    if (newData.visit) inquiry.visit = { ...inquiry.visit, ...newData.visit };
    if (newData.followUp) inquiry.followUp = { ...inquiry.followUp, ...newData.followUp };
    if (newData.remarks !== undefined) inquiry.remarks = newData.remarks;

    await inquiry.save();
    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
`;

c = c + '\n' + nextVisitFn;

fs.writeFileSync('server/controllers/inquiry.controller.js', c, 'utf8');

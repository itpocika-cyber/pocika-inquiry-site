const mongoose = require('mongoose');

const fs = require('fs');
let c = fs.readFileSync('server/models/Inquiry.js', 'utf8');

const historySchema = `
  visitHistory: [{
    date: String,
    salesPerson: String,
    visit: {
      visitType: String,
      personMet: String,
      requirementDiscussed: String,
      photos: String,
      opportunity: String
    },
    followUp: {
      nextAction: [String],
      nextVisitType: String,
      quotationDate: String,
      followUpDate: String,
      nextActionCommitment: String,
      dealStatus: String
    },
    remarks: String,
    loggedAt: { type: Date, default: Date.now }
  }],
`;

// Insert visitHistory after photos
c = c.replace(/photos: \[\{[\s\S]*?\}\],/, match => match + '\n' + historySchema);

fs.writeFileSync('server/models/Inquiry.js', c, 'utf8');

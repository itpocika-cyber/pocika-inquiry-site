const mongoose = require('mongoose');
const { Inquiry } = require('./server/models/Inquiry');
mongoose.connect('mongodb+srv://admin:pocika@cluster0.gaso258.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const inq = await Inquiry.findOne();
  console.log(inq ? inq._id : 'No inquiries found');
  process.exit();
}).catch(console.error);

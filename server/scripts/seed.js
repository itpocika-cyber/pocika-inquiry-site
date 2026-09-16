import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';

// Reusing some of the logic from mock-data.js to seed MongoDB
const seedData = async () => {
  try {
    await connectDB();
    
    // Clear existing
    console.log('Clearing existing data...');
    await Inquiry.deleteMany({});
    await Counter.deleteMany({});

    console.log('Seeding data...');
    
    const statuses = ['submitted', 'submitted', 'submitted'];
    const opps = ['HOT', 'WARM', 'COLD', 'FUTURE POTENTIAL', 'DEALER DEVELOPMENT', 'NO REQUIREMENT'];
    const salespersons = ['Rahul Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh'];
    
    for (let i = 0; i < 20; i++) {
      const inqNum = await generateInquiryNumber();
      const opp = opps[Math.floor(Math.random() * opps.length)];
      
      const inquiry = {
        inquiryNumber: inqNum,
        date: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString().split('T')[0],
        salesPerson: salespersons[Math.floor(Math.random() * salespersons.length)],
        status: 'submitted',
        customer: {
          companyName: `Demo Company ${i+1}`,
          contactPerson: `Contact ${i+1}`,
          mobile: '9876543210',
          email: `contact${i+1}@example.com`,
          siteLocation: 'Ahmedabad'
        },
        business: {
          customerType: 'End User',
          facility: 'Manufacturing',
          status: 'Operational'
        },
        products: ['Fire Extinguisher', 'Hydrant System'].slice(0, Math.floor(Math.random() * 2) + 1),
        visit: {
          visitType: 'First Visit',
          opportunity: opp,
          photos: 'Not Required'
        },
        followUp: {
          nextAction: ['Call', 'Email'],
          followUpDate: new Date(Date.now() + Math.floor(Math.random() * 5) * 86400000).toISOString().split('T')[0]
        },
        submissionMeta: {
          confirmedBy: 'System Seeder',
          confirmedAt: new Date()
        }
      };
      
      await Inquiry.create(inquiry);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();

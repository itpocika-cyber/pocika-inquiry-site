import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';
import { generateInquiryNumber } from '../services/inquiryNumber.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedSingleSampleInquiry() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // Clear legacy mock inquiries and reset counter so numbering starts from 000001
    console.log('Cleaning existing dummy inquiries and resetting sequence counters...');
    await Inquiry.deleteMany({});
    await Counter.deleteMany({});

    // Generate authoritative inquiry number using the real atomic counter service
    const inquiryNumber = await generateInquiryNumber();

    const sampleInquiry = {
      inquiryNumber,
      date: '2026-09-17',
      salesPerson: 'Kiran Mehta',
      status: 'submitted',

      customer: {
        companyName: 'Shree Ambica Industries Pvt. Ltd.',
        contactPerson: 'Rahul Patel',
        designation: 'Plant Manager',
        mobile: '+91 98250 12345',
        email: 'rahul.patel@shreeambica.in',
        siteLocation: 'Plot No. 214, GIDC Vatva, Phase III, Ahmedabad, Gujarat - 382445',
        billingAddress: 'Plot No. 214, GIDC Vatva, Phase III, Ahmedabad, Gujarat - 382445',
        gstNo: '24AAACS1429B1Z8'
      },

      business: {
        customerType: 'GIDC/Industrial',
        industryType: 'Textile Processing',
        locationGidc: 'GIDC Vatva',
        facility: 'Factory',
        status: 'Existing',
        areaSqft: 18000,
        floors: 2,
        expectedDate: '2026-10-15'
      },

      products: [
        'ABC Fire Extinguisher',
        'Fire Hydrant/Hose Reel/Hose',
        'Fire Alarm & Detection'
      ],

      requirement: {
        productSpecification: 'ABC Type, 6 Kg, ISI marked',
        estimatedQuantity: '25 units',
        reason: 'Annual Requirement',
        currentPurchase: 'Annual AMC with a local vendor, contract ending this month'
      },

      commercial: {
        requirementValue: 180000,
        expectedOrderValue: 180000,
        budget: 'To Be Discussed',
        paymentTerms: '30 Days Net',
        decisionMakerName: 'Rahul Patel',
        decisionMakerDesignation: 'Plant Manager',
        decisionRole: 'Influencer',
        purchaseDecisionBy: '2026-09-25',
        competitors: 'Local dealer quote in hand'
      },

      visit: {
        visitType: 'Site Visit',
        personMet: 'Rahul Patel',
        requirementDiscussed: 'Existing extinguishers are past their refill date; also exploring a hydrant line upgrade for the new dyeing unit.',
        opportunity: 'HOT',
        photos: 'Not Required'
      },

      followUp: {
        nextAction: ['Quotation', 'Site Visit'],
        nextVisitType: 'Formal Meeting',
        quotationDate: '2026-09-18',
        followUpDate: '2026-09-20',
        nextActionCommitment: 'Send formal quotation for ABC extinguishers and follow up with the plant manager after Diwali.'
      },

      remarks: 'Customer is price-sensitive; competitor quote already in hand from a local dealer. Emphasize ISI certification and faster AMC response time.',

      managerReview: {
        status: 'Pending',
        remarks: ''
      },

      submissionMeta: {
        confirmedBy: 'Kiran Mehta',
        confirmedAt: new Date()
      },

      createdBy: {
        name: 'Kiran Mehta',
        email: 'kiran.mehta@pocika.com'
      }
    };

    const created = await Inquiry.create(sampleInquiry);
    console.log(`\n✅ Successfully seeded 1 realistic sample inquiry:`);
    console.log(`• Inquiry Number: ${created.inquiryNumber}`);
    console.log(`• Company: ${created.customer.companyName}`);
    console.log(`• Contact: ${created.customer.contactPerson} (${created.customer.mobile})`);
    console.log(`• Products: ${created.products.join(', ')}`);
    console.log(`• Opportunity: ${created.visit.opportunity}`);
    console.log(`• Salesperson: ${created.salesPerson}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding single inquiry failed:', error);
    process.exit(1);
  }
}

seedSingleSampleInquiry();

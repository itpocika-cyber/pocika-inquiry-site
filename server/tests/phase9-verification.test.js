import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from '../app.js';
import { Inquiry } from '../models/Inquiry.js';
import { User } from '../models/User.js';
import { generateInquiryHtml, generateInquiryPdf } from '../services/pdf.service.js';

let server;
let baseUrl;
let adminToken;
let testInquiryNumber;

describe('Phase 9 Critical Verification Suite', () => {

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const adminUser = await User.findOne({ email: 'admin@pocika.com' }) ||
      await User.create({
        email: 'admin@pocika.com',
        displayName: 'Admin User',
        role: 'admin',
        passwordHash: 'dummy'
      });

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    if (testInquiryNumber) {
      await Inquiry.deleteOne({ inquiryNumber: testInquiryNumber });
    }
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('A. PDF Preview and Download Binary Integrity', () => {
    it('should return a genuine application/pdf buffer with inline disposition for preview', async () => {
      const res = await fetch(`${baseUrl}/inquiries/PSI-2026-000001/pdf`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition && disposition.startsWith('inline'));
      assert.ok(disposition.includes('POCIKA-Inquiry-PSI-2026-000001.pdf'));

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert.ok(buf.length > 50000, `PDF buffer length should be > 50KB, got ${buf.length}`);
      assert.equal(buf.slice(0, 5).toString('utf-8'), '%PDF-');
    });

    it('should return attachment disposition when download=true query param is passed', async () => {
      const res = await fetch(`${baseUrl}/inquiries/PSI-2026-000001/pdf?download=true`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition && disposition.startsWith('attachment'));
      assert.ok(disposition.includes('POCIKA-Inquiry-PSI-2026-000001.pdf'));

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      assert.equal(buf.slice(0, 5).toString('utf-8'), '%PDF-');
    });
  });

  describe('B. Uploaded Photos Persistence & Cloudinary Integration', () => {
    it('POST /api/v1/upload should accept image buffer and return permanent secureUrl', async () => {
      const boundary = '----WebKitFormBoundaryPhase9Test';
      const samplePng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);

      const bodyParts = [
        `--${boundary}\r\n`,
        'Content-Disposition: form-data; name="photos"; filename="test-pixel.png"\r\n',
        'Content-Type: image/png\r\n\r\n'
      ];
      const headerBuf = Buffer.from(bodyParts.join(''));
      const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`);
      const payload = Buffer.concat([headerBuf, samplePng, footerBuf]);

      const res = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: payload
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.photo.secureUrl, 'Must return secureUrl');
      assert.ok(json.data.photo.secureUrl.startsWith('http') || json.data.photo.secureUrl.startsWith('/uploads/'));
      assert.equal(json.data.photo.originalFileName, 'test-pixel.png');
    });

    it('should durably store photos on Inquiry creation and return them on lookup', async () => {
      const mockPhoto = {
        photoId: 'test-photo-uuid-1',
        publicId: 'pocika/inquiries/drafts/photos/test-photo-uuid-1',
        secureUrl: 'https://res.cloudinary.com/qermfcge/image/upload/v1790000000/pocika/inquiries/drafts/photos/test-photo.jpg',
        url: 'https://res.cloudinary.com/qermfcge/image/upload/v1790000000/pocika/inquiries/drafts/photos/test-photo.jpg',
        caption: 'Front Warehouse Gate',
        fileName: 'front-gate.jpg',
        originalFileName: 'front-gate.jpg',
        sizeKB: 145
      };

      const res = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: '2026-09-22',
          salesPerson: 'Test Rep',
          customer: {
            companyName: 'Persistent Photo Co',
            contactPerson: 'Mr. Photo Buyer',
            mobile: '9876543210',
            siteLocation: 'Industrial Zone'
          },
          business: {
            customerType: 'Commercial Client',
            facility: 'Warehouse',
            status: 'Under Construction'
          },
          products: ['Fire Hydrant'],
          requirement: {
            productSpecification: 'Complete yard hydrant setup with hose reels'
          },
          visit: {
            visitType: 'Site Visit',
            opportunity: 'HOT',
            photos: 'Attached'
          },
          followUp: {
            nextAction: ['Quotation'],
            followUpDate: '2026-09-30'
          },
          photos: [mockPhoto]
        })
      });

      assert.equal(res.status, 201);
      const inqData = await res.json();
      testInquiryNumber = inqData.data.inquiryNumber;
      assert.ok(testInquiryNumber);

      // Verify persistence by querying DB directly
      const fetched = await Inquiry.findOne({ inquiryNumber: testInquiryNumber }).lean();
      assert.equal(fetched.photos.length, 1);
      assert.equal(fetched.photos[0].secureUrl, mockPhoto.secureUrl);
      assert.equal(fetched.photos[0].caption, mockPhoto.caption);

      // Verify persistence when fetched via GET endpoint
      const getRes = await fetch(`${baseUrl}/inquiries/${testInquiryNumber}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const getJson = await getRes.json();
      assert.equal(getJson.data.photos.length, 1);
      assert.equal(getJson.data.photos[0].secureUrl, mockPhoto.secureUrl);
    });
  });

  describe('C. PDF Dynamic Numbering & Section Filtering (No Gaps)', () => {
    it('should sequentially renumber sections starting at 1 when intermediate sections are empty', async () => {
      // Create mock inquiry with Sections 1, 4, 5 filled, but Sections 2 and 3 omitted
      const sparseInquiry = {
        inquiryNumber: 'PSI-SPARSE-TEST',
        date: '2026-09-22',
        salesPerson: 'Test Agent',
        customer: {
          companyName: 'No Products Inquiry Corp',
          contactPerson: 'Director Sharma',
          mobile: '9825000000',
          siteLocation: 'Sector 5'
        },
        business: {
          customerType: 'Retail/Other',
          customerTypeOther: 'General Store',
          facility: 'Commercial Site',
          status: 'Operational'
        },
        products: [],
        requirement: {},
        commercial: {},
        visit: {
          visitType: 'Courtesy Visit',
          opportunity: 'WARM',
          requirementDiscussed: 'General safety audit check-in'
        },
        followUp: {
          nextAction: ['Follow-up'],
          followUpDate: '2026-10-05',
          nextVisitType: 'Follow-up'
        },
        remarks: 'Client is expanding next quarter'
      };

      const html = await generateInquiryHtml(sparseInquiry);

      // Extract section headers
      const regex = /<div class="section-card-header">\s*<span>([^<]+)<\/span>/g;
      const headers = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        headers.push(m[1].replace(/&amp;/g, '&'));
      }

      assert.deepEqual(headers, [
        '1. Customer & Business Details',
        '2. Visit & Opportunity Status',
        '3. Next Action & Follow-up Plan',
        '4. Visit Remarks & Special Requirements'
      ]);
    });

    it('should number all 6 sections sequentially when all have data', async () => {
      const fullInquiry = {
        inquiryNumber: 'PSI-FULL-TEST',
        date: '2026-09-22',
        salesPerson: 'Test Rep',
        customer: {
          companyName: 'Full Specs Ltd',
          contactPerson: 'Mr. Full',
          mobile: '9825111111',
          siteLocation: 'GIDC Phase 2'
        },
        business: {
          customerType: 'Industrial Client',
          facility: 'Factory',
          status: 'New Construction'
        },
        products: ['ABC Fire Extinguisher'],
        requirement: {
          productSpecification: '50 units 6kg ABC'
        },
        commercial: {
          requirementValue: 250000,
          expectedOrderValue: 200000,
          budget: 'Approved'
        },
        visit: {
          visitType: 'Site Visit',
          opportunity: 'HOT',
          personMet: 'Safety Officer Patel'
        },
        followUp: {
          nextAction: ['Quotation'],
          quotationDate: '2026-09-25',
          followUpDate: '2026-09-28'
        },
        remarks: 'Needs urgent dispatch by month end'
      };

      const html = await generateInquiryHtml(fullInquiry);

      const regex = /<div class="section-card-header">\s*<span>([^<]+)<\/span>/g;
      const headers = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        headers.push(m[1].replace(/&amp;/g, '&'));
      }

      assert.deepEqual(headers, [
        '1. Customer & Business Details',
        '2. Product / Requirement Details',
        '3. Commercial / Sales Qualification',
        '4. Visit & Opportunity Status',
        '5. Next Action & Follow-up Plan',
        '6. Visit Remarks & Special Requirements'
      ]);
    });
  });

  describe('D. Natural PDF Pagination Rules', () => {
    it('HTML template must NOT contain unconditional page breaks (.page-2-start)', async () => {
      const html = await generateInquiryHtml({
        inquiryNumber: 'TEST-PAGINATION',
        date: '2026-09-22',
        customer: { companyName: 'Paginate Co', contactPerson: 'Tester', siteLocation: 'Site A' },
        business: { customerType: 'Commercial', facility: 'Office', status: 'Existing' },
        visit: { visitType: 'Visit', opportunity: 'HOT' },
        followUp: { followUpDate: '2026-10-01' }
      });

      assert.ok(!html.includes('page-2-start'), 'HTML must not have .page-2-start');
      assert.ok(!html.includes('break-before: page'), 'HTML must not force break-before: page');
      assert.ok(html.includes('page-break-inside: avoid'), 'Cards must avoid breaking inside');
    });

    it('generateInquiryPdf should produce valid PDF buffers for 0, 1, and 3 photos', async () => {
      const baseInq = {
        inquiryNumber: 'TEST-PHOTO-COUNTS',
        date: '2026-09-22',
        salesPerson: 'Test Agent',
        customer: { companyName: 'Photo Count Corp', contactPerson: 'Manager', mobile: '9999999999', siteLocation: 'Surat' },
        business: { customerType: 'Dealer', facility: 'Warehouse', status: 'Operational' },
        visit: { visitType: 'Visit', opportunity: 'HOT' },
        followUp: { followUpDate: '2026-10-01' }
      };

      // 0 photos
      const pdf0 = await generateInquiryPdf(baseInq);
      assert.ok(pdf0.length > 20000);
      assert.equal(pdf0.slice(0, 5).toString('utf-8'), '%PDF-');

      // 1 photo
      const inq1 = {
        ...baseInq,
        photos: [{
          photoId: 'p1',
          secureUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=300',
          originalFileName: 'site-photo.jpg'
        }]
      };
      const pdf1 = await generateInquiryPdf(inq1);
      assert.ok(pdf1.length > 20000);
      assert.equal(pdf1.slice(0, 5).toString('utf-8'), '%PDF-');
    });
  });

});

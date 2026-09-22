import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config/env.js';
import app from '../app.js';
import { Inquiry } from '../models/Inquiry.js';
import { generateInquiryPdf } from '../services/pdf.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let baseUrl;
let authToken;

describe('HOTFIX VERIFICATION SUITE: Photo Upload + Product Selection + 8-Step Form', () => {

  before(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(config.mongoUri);
    }
    // Start temporary test server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/v1`;
        resolve();
      });
    });

    authToken = jwt.sign(
      { userId: 'u-hotfix-admin', role: 'admin', email: 'admin@pocika.com' },
      config.jwtSecret,
      { expiresIn: '2h' }
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // BUG A: PHOTO UPLOAD IS BROKEN ("No photo files were uploaded")
  // =========================================================================
  describe('A. Photo Upload Fix Verification', () => {
    it('1. Should successfully upload single photo via FormData without manual Content-Type header conflict', async () => {
      const form = new FormData();
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC', 'base64');
      form.append('photos', samplePng, {
        filename: 'site-photo-1.png',
        contentType: 'image/png'
      });

      const res = await axios.post(`${baseUrl}/upload`, form, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...form.getHeaders()
        }
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.ok(res.data.data.photos?.length >= 1, 'Should return at least 1 uploaded photo');
      const uploaded = res.data.data.photos[0];
      assert.ok(uploaded.secureUrl, 'Uploaded photo must have Cloudinary secureUrl');
      assert.ok(uploaded.publicId, 'Uploaded photo must have Cloudinary publicId');
      assert.equal(uploaded.fileName, 'site-photo-1.png');
    });

    it('2. Should successfully upload multiple photos (up to 5) in a single request', async () => {
      const form = new FormData();
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC', 'base64');
      form.append('photos', samplePng, { filename: 'plant-photo-1.png', contentType: 'image/png' });
      form.append('photos', samplePng, { filename: 'plant-photo-2.jpg', contentType: 'image/jpeg' });
      form.append('photos', samplePng, { filename: 'plant-photo-3.webp', contentType: 'image/webp' });

      const res = await axios.post(`${baseUrl}/upload`, form, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...form.getHeaders()
        }
      });
      assert.equal(res.status, 201);
      assert.equal(res.data.success, true);
      assert.equal(res.data.data.photos?.length, 3, 'Should have processed all 3 files');
    });

    it('3. Should reject uploads exceeding the 5-photo limit with appropriate 400 error', async () => {
      const form = new FormData();
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC', 'base64');
      for (let i = 1; i <= 6; i++) {
        form.append('photos', samplePng, { filename: `extra-photo-${i}.png`, contentType: 'image/png' });
      }

      try {
        await axios.post(`${baseUrl}/upload`, form, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            ...form.getHeaders()
          }
        });
        assert.fail('Should have rejected > 5 photos');
      } catch (err) {
        assert.equal(err.response?.status, 400);
      }
    });
  });

  // =========================================================================
  // BUG B: PRODUCT SELECTION IN STEP 3 (DATA & SELECTION BEHAVIOR)
  // =========================================================================
  describe('B. Product Selection Fix Verification', () => {
    it('1. Should accept and store multi-selected products correctly in Inquiry model', async () => {
      const payload = {
        date: '2026-09-22',
        salesPerson: 'Test Agent',
        customer: {
          companyName: 'Hotfix Test Industries Ltd',
          contactPerson: 'Sanjay Sharma',
          designation: 'Safety Head',
          mobile: '9876543210',
          siteLocation: 'GIDC Naroda'
        },
        business: {
          customerType: 'Manufacturer',
          facility: 'Industrial',
          status: 'Operational'
        },
        hasProductRequirement: true,
        // Selected multiple products in Step 3
        products: ['ABC Fire Extinguisher', 'Fire Hydrant', 'Other'],
        productOther: 'Automatic Nitrogen Deluge System',
        requirement: {
          productSpecification: '45kg ABC Extinguishers and Yard Hydrant Valves',
          reason: 'Replacement'
        },
        commercial: {
          requirementValue: '₹1,00,000–2,50,000',
          expectedOrderValue: '₹1,00,000–2,50,000',
          budget: 'Available & Approved'
        },
        visit: {
          visitType: 'Cold Visit',
          opportunity: 'HOT',
          photos: 'Photos Taken'
        },
        followUp: {
          followUpDate: '2026-09-30',
          dealStatus: 'Pending',
          nextActionCommitment: 'Submit revised technical proposal'
        },
        remarks: 'Client verified product range on site.'
      };

      const res = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.success, true);
      assert.ok(data.data.inquiryNumber, 'Should generate an inquiryNumber');

      // Verify stored fields in MongoDB
      const savedInq = await Inquiry.findOne({ inquiryNumber: data.data.inquiryNumber });
      assert.ok(savedInq, 'Inquiry must exist in database');
      assert.deepEqual(savedInq.products, ['ABC Fire Extinguisher', 'Fire Hydrant', 'Other']);
      assert.equal(savedInq.productOther, 'Automatic Nitrogen Deluge System');
      assert.equal(savedInq.commercial.requirementValue, '₹1,00,000–2,50,000');
    });
  });

  // =========================================================================
  // C. FULL 8-STEP END-TO-END FLOW & REGRESSION
  // =========================================================================
  describe('C. Full 8-Step Inquiry Submission & PDF Generation', () => {
    it('1. Should submit full inquiry with photos, generate clean PDF, and allow deal status update', async () => {
      // 1. Upload photo first (simulating Step 7)
      const form = new FormData();
      const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAElFTkSuQmCC', 'base64');
      form.append('photos', samplePng, { filename: 'site-survey.png', contentType: 'image/png' });

      const uploadRes = await axios.post(`${baseUrl}/upload`, form, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...form.getHeaders()
        }
      });
      assert.equal(uploadRes.status, 201);
      const photoRecord = uploadRes.data.data.photos[0];

      // 2. Submit Full 8-step inquiry payload
      const fullInquiryPayload = {
        date: '2026-09-22',
        salesPerson: 'POCIKA Administrator',
        customer: {
          companyName: 'Apex Industrial Solutions Pvt Ltd',
          contactPerson: 'Anil Mehta',
          designation: 'Safety Officer',
          mobile: '9876501234',
          email: 'anil@apexindustrial.com',
          billingAddress: 'Plot 42, GIDC Vatva Phase 4, Ahmedabad',
          siteLocation: 'Vatva Chemical Zone',
          gstNo: '24AAACA1234A1Z5'
        },
        business: {
          customerType: 'Manufacturer',
          industryType: 'Specialty Chemicals',
          facility: 'Industrial',
          areaSqft: 25000,
          status: 'Operational'
        },
        hasProductRequirement: true,
        products: ['ABC Fire Extinguisher', 'CO2 Fire Extinguisher', 'Fire Hydrant'],
        requirement: {
          productSpecification: '10x 6kg ABC, 4x 4.5kg CO2, 2x Hydrant landing valves',
          reason: 'Periodic Refilling',
          renewalDueDate: '2026-10-31'
        },
        commercial: {
          requirementValue: '₹50,000–1,00,000',
          expectedOrderValue: '₹50,000–1,00,000',
          budget: 'Available & Approved',
          decisionRole: 'Final Decision Maker'
        },
        visit: {
          visitType: 'Cold Visit',
          opportunity: 'HOT',
          photos: 'Photos Taken'
        },
        followUp: {
          followUpDate: '2026-09-28',
          dealStatus: 'Pending',
          nextActionCommitment: 'Deliver sample demo unit on Monday'
        },
        remarks: 'Client highly receptive; plant manager needs audit before month end.',
        photos: [photoRecord]
      };

      const inqRes = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(fullInquiryPayload)
      });
      const inqData = await inqRes.json();
      assert.equal(inqRes.status, 201);
      const inquiryNumber = inqData.data.inquiryNumber;
      assert.ok(inquiryNumber);

      // 3. Verify Inquiry Details can be retrieved
      const getRes = await fetch(`${baseUrl}/inquiries/${inquiryNumber}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const retrieved = await getRes.json();
      assert.equal(getRes.status, 200);
      assert.equal(retrieved.data.customer?.companyName, 'Apex Industrial Solutions Pvt Ltd');
      assert.equal(retrieved.data.photos?.length, 1);
      assert.deepEqual(retrieved.data.products, ['ABC Fire Extinguisher', 'CO2 Fire Extinguisher', 'Fire Hydrant']);

      // 4. Verify Deal Status quick update (Pending -> Won)
      const patchRes = await fetch(`${baseUrl}/inquiries/${inquiryNumber}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          followUp: {
            dealStatus: 'Won'
          }
        })
      });
      const patchData = await patchRes.json();
      assert.equal(patchRes.status, 200);
      assert.equal(patchData.data.followUp?.dealStatus, 'Won');

      // 5. Verify PDF Generation with products and photos
      const pdfBuffer = await generateInquiryPdf(retrieved.data);
      assert.ok(Buffer.isBuffer(pdfBuffer), 'Must return a binary PDF Buffer');
      assert.ok(pdfBuffer.length > 1000, 'PDF buffer must be non-empty and well-formed');
      assert.equal(pdfBuffer.subarray(0, 4).toString(), '%PDF', 'PDF buffer must begin with %PDF magic bytes');
    });

    it('2. Should enforce required validation fields (Company Name, Mobile, Products)', async () => {
      const invalidPayload = {
        date: '2026-09-22',
        // Missing companyName and mobile
        customer: {},
        hasProductRequirement: true,
        // Empty products array when hasProductRequirement is true
        products: []
      };

      const res = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(invalidPayload)
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.equal(data.error?.code, 'VALIDATION_ERROR');
    });
  });
});

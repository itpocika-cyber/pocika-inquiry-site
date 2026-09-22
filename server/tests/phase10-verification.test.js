import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import app from '../app.js';
import { Inquiry } from '../models/Inquiry.js';
import { User } from '../models/User.js';
import { ProductCatalog } from '../models/ProductCatalog.js';
import { Announcement } from '../models/Announcement.js';

let server;
let baseUrl;
let adminToken;
let salesToken;
let testInquiryId;
let testCatalogId;
let testAnnouncementId;

describe('Phase 10 Add-on Features Verification Suite', () => {

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const adminUser = await User.findOne({ email: 'admin@pocika.com' }) ||
      await User.create({
        email: 'admin@pocika.com',
        displayName: 'Admin User',
        role: 'admin',
        firebaseUid: 'admin-test-' + Date.now(),
        passwordHash: 'dummy'
      });

    const salesUser = await User.findOne({ email: 'sales@pocika.com' }) ||
      await User.create({
        email: 'sales@pocika.com',
        displayName: 'Sales Agent',
        role: 'sales_person',
        firebaseUid: 'sales-test-' + Date.now(),
        passwordHash: 'dummy'
      });

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: adminUser.role, displayName: adminUser.displayName },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    salesToken = jwt.sign(
      { id: salesUser._id.toString(), email: salesUser.email, role: salesUser.role, displayName: salesUser.displayName },
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
    if (testInquiryId) {
      await Inquiry.deleteOne({ _id: testInquiryId });
    }
    if (testCatalogId) {
      await ProductCatalog.deleteOne({ _id: testCatalogId });
    }
    if (testAnnouncementId) {
      await Announcement.deleteOne({ _id: testAnnouncementId });
    }
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('B & J. Model Additions & Commercial Brackets', () => {
    it('should create inquiry with renewalDueDate and rupee bracket strings', async () => {
      const futureRenewal = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
      const res = await fetch(`${baseUrl}/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${salesToken}`
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          customer: {
            companyName: 'Phase 10 Test Enterprise',
            contactPerson: 'Harshil Patel',
            mobile: '9898012345',
            siteLocation: 'Sanand GIDC'
          },
          business: {
            customerType: 'Industrial',
            facility: 'Factory',
            status: 'Existing'
          },
          products: ['Fire Hydrant System'],
          requirement: {
            reason: 'Annual Requirement',
            renewalDueDate: futureRenewal
          },
          commercial: {
            requirementValue: '₹50,000–1,00,000',
            expectedOrderValue: 'Under ₹50,000',
            budget: 'Approved'
          },
          visit: {
            visitType: 'Site Visit',
            opportunity: 'HOT',
            photos: 'Attached'
          },
          followUp: {
            followUpDate: new Date().toISOString().split('T')[0],
            dealStatus: 'Pending'
          }
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.data._id);
      testInquiryId = json.data._id;
      assert.equal(json.data.requirement.renewalDueDate, futureRenewal);
      assert.equal(json.data.commercial.requirementValue, '₹50,000–1,00,000');
      assert.equal(json.data.commercial.expectedOrderValue, 'Under ₹50,000');
      assert.equal(json.data.followUp.dealStatus, 'Pending');
    });

    it('should filter inquiries by renewalsDueInDays', async () => {
      const res = await fetch(`${baseUrl}/inquiries?renewalsDueInDays=30`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.data.items));
      const found = json.data.items.some(i => i.customer.companyName === 'Phase 10 Test Enterprise');
      assert.ok(found, 'Should find inquiry with renewal due in 15 days');
    });
  });

  describe('C, D, L. Deal Status, Conversion KPIs, and Leaderboard', () => {
    it('should update deal status to Won and record Manager Review with Needs Follow-up', async () => {
      const res = await fetch(`${baseUrl}/inquiries/${testInquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          'followUp.dealStatus': 'Won',
          managerReview: {
            status: 'Needs Follow-up',
            remarks: 'Requires final quote sign-off'
          }
        })
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.followUp.dealStatus, 'Won');
      assert.equal(json.data.managerReview.status, 'Needs Follow-up');
      assert.equal(json.data.managerReview.remarks, 'Requires final quote sign-off');
    });

    it('should return monthly conversion KPIs and sales performance leaderboard in summary', async () => {
      const res = await fetch(`${baseUrl}/inquiries/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.thisMonth, 'Must contain thisMonth KPI block');
      assert.ok(json.data.thisMonth.won >= 1, 'Won count this month should be >= 1');
      assert.ok(Array.isArray(json.data.salesPerformance), 'Should include salesPerformance array');
    });
  });

  describe('M. Per-Inquiry Comment Thread', () => {
    it('should add a comment to an inquiry and retrieve it', async () => {
      const res = await fetch(`${baseUrl}/inquiries/${testInquiryId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          text: 'Spoke with safety officer Devraj, delivery expected by Friday.'
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.data.comment.commentId);
      assert.equal(json.data.comment.text, 'Spoke with safety officer Devraj, delivery expected by Friday.');
      assert.equal(json.data.comment.author.role, 'admin');

      // Verify on get inquiry
      const getRes = await fetch(`${baseUrl}/inquiries/${testInquiryId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const getJson = await getRes.json();
      assert.equal(getJson.data.comments.length, 1);
      assert.equal(getJson.data.comments[0].text, 'Spoke with safety officer Devraj, delivery expected by Friday.');
    });
  });

  describe('H. Excel Export Generation', () => {
    it('should generate a valid .xlsx file stream for admin', async () => {
      const res = await fetch(`${baseUrl}/inquiries/export/excel`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.ok(res.headers.get('content-disposition')?.includes('.xlsx'));

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      // Valid Excel .xlsx files are ZIP archives starting with PK (0x50, 0x4B, 0x03, 0x04)
      assert.equal(buf[0], 0x50);
      assert.equal(buf[1], 0x4B);
      assert.ok(buf.length > 2000, `Excel file should have substantial size, got ${buf.length}`);
    });

    it('should deny excel export to salesperson', async () => {
      const res = await fetch(`${baseUrl}/inquiries/export/excel`, {
        headers: { Authorization: `Bearer ${salesToken}` }
      });
      assert.equal(res.status, 403);
    });
  });

  describe('K. Product Catalog CRUD', () => {
    it('admin should create a catalog item', async () => {
      const res = await fetch(`${baseUrl}/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: 'CO2 Fire Extinguisher 4.5kg',
          category: 'Fire Extinguishers',
          description: 'High pressure seamless cylinder for electrical & server room fires',
          priceRange: '₹3,500 - ₹4,800',
          photo: { secureUrl: 'https://images.unsplash.com/photo-sample' }
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.data._id);
      testCatalogId = json.data._id;
      assert.equal(json.data.name, 'CO2 Fire Extinguisher 4.5kg');
    });

    it('salesperson can view catalog items (read-only)', async () => {
      const res = await fetch(`${baseUrl}/catalog`, {
        headers: { Authorization: `Bearer ${salesToken}` }
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.items.length >= 1);
      assert.ok(json.data.items.some(i => i.name === 'CO2 Fire Extinguisher 4.5kg'));
    });
  });

  describe('N. Team Announcement Board', () => {
    it('admin should create an announcement', async () => {
      const res = await fetch(`${baseUrl}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Q4 Product Pricing Update',
          message: 'New commercial bracket discounts effective 1st October.',
          priority: 'urgent'
        })
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.ok(json.data._id);
      testAnnouncementId = json.data._id;
      assert.equal(json.data.title, 'Q4 Product Pricing Update');
    });

    it('salesperson can view active announcements', async () => {
      const res = await fetch(`${baseUrl}/announcements`, {
        headers: { Authorization: `Bearer ${salesToken}` }
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.announcements.some(a => a.title === 'Q4 Product Pricing Update'));
    });
  });

});

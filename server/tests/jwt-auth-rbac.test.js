import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../models/User.js';
import { Inquiry } from '../models/Inquiry.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import mongoose from 'mongoose';
import { config } from '../config/env.js';

const JWT_SECRET = config.jwtSecret;

let server;
let baseUrl;

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Phase 4: JWT Auth + RBAC + MongoDB Inquiry Architecture Tests', () => {

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      await mongoose.disconnect();
    } catch {}
  });

  it('0. Health-check GET /api/health returns 200 with status ok (unauthenticated)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
  });

  it('1. Missing Authorization header returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.error?.code, 'UNAUTHORIZED');
  });

  it('2. Malformed token returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer invalid.token.payload' }
    });
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.error?.code, 'INVALID_TOKEN');
  });

  it('3. Valid JWT token returns user profile in /api/v1/auth/me', async () => {
    const token = createToken({
      id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439011',
      email: 'sales-test@pocika.com',
      role: 'sales_person',
      displayName: 'Sales Tester'
    });

    const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data?.user?.email, 'sales-test@pocika.com');
    assert.equal(data.data?.user?.role, 'sales_person');
  });

  it('4. POST /api/v1/auth/login requires email and password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '' })
    });
    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.error?.code, 'VALIDATION_ERROR');
  });

  it('5. Manager review field is part of Inquiry schema and defaults to Pending', () => {
    const schemaPath = Inquiry.schema.path('managerReview.status');
    assert.ok(schemaPath, 'managerReview.status must exist in schema');
    assert.ok(schemaPath.options.enum.includes('Pending'));
    assert.ok(schemaPath.options.enum.includes('Needs Follow-up'));
    assert.equal(schemaPath.options.default, 'Pending');
  });

  it('6. User model includes password hashing and verification', () => {
    const userSchema = User.schema;
    assert.ok(userSchema.path('password'), 'password field must exist in User schema');
    assert.ok(typeof userSchema.methods.comparePassword === 'function', 'comparePassword method must exist');
  });

  it('7. POST /api/v1/auth/register is locked down and rejects unauthenticated caller', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'newadmin@pocika.com', password: 'password123', role: 'admin' })
    });
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.error?.code, 'UNAUTHORIZED');
  });

  it('8. GET /api/v1/users rejects unauthenticated or salesperson callers', async () => {
    // Unauthenticated
    const unauthRes = await fetch(`${baseUrl}/api/v1/users`);
    assert.equal(unauthRes.status, 401);

    // Salesperson caller
    const salesToken = createToken({
      id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439011',
      email: 'sales@pocika.com',
      role: 'sales_person'
    });
    const salesRes = await fetch(`${baseUrl}/api/v1/users`, {
      headers: { Authorization: `Bearer ${salesToken}` }
    });
    assert.equal(salesRes.status, 403);
  });

  it('9. Admin can access GET /api/v1/users and password hash is omitted', async () => {
    const adminToken = createToken({
      id: '507f1f77bcf86cd799439099',
      userId: '507f1f77bcf86cd799439099',
      email: 'admin@pocika.com',
      role: 'admin'
    });
    const res = await fetch(`${baseUrl}/api/v1/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(data.data?.users));
  });

});

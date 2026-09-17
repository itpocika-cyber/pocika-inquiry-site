import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { User } from '../models/User.js';
import { Inquiry } from '../models/Inquiry.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const JWT_SECRET = process.env.JWT_SECRET || 'pocika_jwt_secret_secure_key_2026';

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
    if (server) server.close();
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
    assert.deepEqual(schemaPath.options.enum, ['Pending', 'Reviewed', 'Approved', 'Rejected']);
    assert.equal(schemaPath.options.default, 'Pending');
  });

  it('6. User model includes password hashing and verification', () => {
    const userSchema = User.schema;
    assert.ok(userSchema.path('password'), 'password field must exist in User schema');
    assert.ok(typeof userSchema.methods.comparePassword === 'function', 'comparePassword method must exist');
  });

});

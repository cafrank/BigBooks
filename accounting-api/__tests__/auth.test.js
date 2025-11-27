// --- __tests__/auth.test.js (simplified version) ---
const request = require('supertest');
const db = require('../src/config/database');

// Import app after environment is set
const app = require('../src/index');

describe('Authentication', () => {
  describe('POST /v1/auth/register', () => {
    it('should register a new user and organization', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          organizationName: 'Acme Corp'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.organization.name).toBe('Acme Corp');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          organizationName: 'Test Org'
        });

      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'Password456!',
          firstName: 'Jane',
          lastName: 'Smith',
          organizationName: 'Another Org'
        });

      expect(res.status).toBe(409);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'TestPass123!',
          firstName: 'Test',
          lastName: 'User',
          organizationName: 'Test Org'
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'TestPass123!'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('testuser@example.com');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { prisma } from '@/config/database';

describe('User Module', () => {
  // Clean up database before each test
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  // Clean up database after each test
  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('POST /api/v1/users/register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return validation error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'TestPassword123',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser1',
        password: 'TestPassword123',
      };

      // Create first user
      await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      // Try to create second user with same email
      const duplicateUserData = {
        ...userData,
        username: 'testuser2',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(duplicateUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });
  });

  describe('POST /api/v1/users/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'TestPassword123',
        });
    });

    it('should login successfully with email', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'TestPassword123',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should login successfully with username', async () => {
      const loginData = {
        identifier: 'testuser',
        password: 'TestPassword123',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'WrongPassword',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    let userId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'TestPassword123',
        });
      userId = response.body.data.user.id;
    });

    it('should get user by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(userId);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users', () => {
    beforeEach(async () => {
      // Create multiple test users
      await Promise.all([
        request(app).post('/api/v1/users/register').send({
          email: 'user1@example.com',
          username: 'user1',
          password: 'TestPassword123',
        }),
        request(app).post('/api/v1/users/register').send({
          email: 'user2@example.com',
          username: 'user2',
          password: 'TestPassword123',
        }),
      ]);
    });

    it('should get users list with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('should filter users by search term', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=user1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].username).toBe('user1');
    });
  });
});


const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../../index'); // Adjust path to your server instance
const User = require('../../models/userModel'); // Adjust path to your User model

// Define test user credentials
const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'testuser@example.com', // Ensure this is lowercase and valid
    password: 'Password123!'
};

const testUser2 = {
    firstName: 'Another',
    lastName: 'User',
    email: 'anotheruser@example.com', // Ensure this is lowercase and valid
    password: 'Password456!'
};

let userToken; // To store token for subsequent authenticated tests

// --- Before & After All Tests in This Suite ---
beforeAll(async () => {
    // Ensure the database is clean before running tests in this suite
    // (This runs before each 'describe' block or once before all tests if placed globally)
    await User.deleteMany({}); // Clear all users before tests
    console.log('Test DB cleared before user.test.js suite.');
});

afterAll(async () => {
    // Clean up the test database after all tests in this suite
    await User.deleteMany({}); // Clear all users after tests
    console.log('Test DB cleared after user.test.js suite.');

    // Close Mongoose connection and server
    await mongoose.connection.close(); // Close Mongoose connection
    server.close(); // Close Express server
});

// ... (Rest of your test suite as provided before, but with one change) ...

// User Registration Endpoint (POST /api/v1/users/signup) - NOTE THE /signup PATH
describe('User Registration Endpoint (POST /api/v1/users/signup)', () => { // <--- Changed from /register to /signup to match route.js
    it('should register a new user successfully', async () => {
        const res = await request(server)
            .post('/api/v1/users/signup') // <--- Changed path
            .send(testUser)
            .expect(201); // Expect 201 Created

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('User created successfully');
        expect(res.body.data.user).toHaveProperty('_id');
        expect(res.body.data.user.email).toEqual(testUser.email);
        expect(res.body.data.user).not.toHaveProperty('password');
        expect(res.body.data).toHaveProperty('token');

        userToken = res.body.data.token;
    });

    it('should not register a user with an existing email', async () => {
        const res = await request(server)
            .post('/api/v1/users/signup') // <--- Changed path
            .send(testUser)
            .expect(409); // Expect 409 Conflict

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Email already registered');
    });

    it('should return 400 for invalid registration payload (missing email)', async () => {
        const invalidUser = { ...testUser, email: undefined, firstName: 'Invalid', lastName: 'User' }; // Make sure other required fields are present
        const res = await request(server)
            .post('/api/v1/users/signup') // <--- Changed path
            .send(invalidUser)
            .expect(400); // Expect 400 Bad Request

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Validation failed'); // The message your service returns for validation errors
        expect(res.body.errors).toContain('Email is required'); // Expect Joi's custom message for missing email
    });
});

// User Login Endpoint (POST /api/v1/users/login)
describe('User Login Endpoint (POST /api/v1/users/login)', () => {
    beforeAll(async () => {
        await User.deleteMany({}); // Clear DB first
        await request(server).post('/api/v1/users/signup').send(testUser2); // <--- Changed path
    });

    it('should log in a user successfully and return a token', async () => {
        const res = await request(server)
            .post('/api/v1/users/login')
            .send({ email: testUser2.email, password: testUser2.password })
            .expect(200); // Expect 200 OK

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('User logged in successfully');
        expect(res.body.data.user).toHaveProperty('_id');
        expect(res.body.data.user.email).toEqual(testUser2.email);
        expect(res.body.data).toHaveProperty('token');
    });

    it('should not log in a user with incorrect password', async () => {
        const res = await request(server)
            .post('/api/v1/users/login')
            .send({ email: testUser2.email, password: 'wrongpassword' })
            .expect(401); // Expect 401 Unauthorized

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Invalid credentials');
    });

    it('should not log in a non-existent user', async () => {
        const res = await request(server)
            .post('/api/v1/users/login')
            .send({ email: 'nonexistent@example.com', password: 'anypassword' })
            .expect(401); // Expect 401 Unauthorized

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Invalid credentials');
    });
});


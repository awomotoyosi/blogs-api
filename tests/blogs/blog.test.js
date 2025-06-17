// tests/blogs/blog.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../../index'); // Adjust path to your server instance
const User = require('../../models/userModel'); // Adjust path to your User model
const Blog = require('../../models/blogModel'); // Adjust path to your Blog model

// --- Test User and Blog Data ---
const testUserBlog = {
    firstName: 'Blog',
    lastName: 'Author',
    email: 'blogauthor@example.com',
    password: 'BlogPassword123!'
};

const testUser2Blog = {
    firstName: 'Other',
    lastName: 'Author',
    email: 'otherauthor@example.com',
    password: 'OtherPassword123!'
};

let blogAuthorToken; // Token for testUserBlog
let blogAuthorId;    // ID for testUserBlog
let otherAuthorToken; // Token for testUser2Blog
let otherAuthorId;   // ID for testUser2Blog

// --- Sample Blog Data ---
const testBlogDataDraft = {
    title: 'My First Blog Draft',
    description: 'This is a test blog in draft state.',
    tags: ['testing', 'draft'],
    body: 'The full content of the first draft blog. Lorem ipsum dolor sit amet.'
};

const testBlogDataPublished = {
    title: 'My Awesome Published Blog',
    description: 'This is a test blog in published state for public viewing.',
    tags: ['testing', 'published', 'example'],
    body: 'The full content of the awesome published blog. This should be visible to everyone.'
};

// --- Before & After All Tests in This Suite ---
beforeAll(async () => {
    // Ensure the database is clean before starting this test suite
    await User.deleteMany({});
    await Blog.deleteMany({});
    console.log('Test DB cleared before blog.test.js suite.');

    // 1. Register and Login testUserBlog to get a token and ID
    const res1 = await request(server)
        .post('/api/v1/users/signup')
        .send(testUserBlog);
    blogAuthorToken = res1.body.data.token;
    blogAuthorId = res1.body.data.user._id;

    // 2. Register and Login testUser2Blog (for testing permissions/other authors)
    const res2 = await request(server)
        .post('/api/v1/users/signup')
        .send(testUser2Blog);
    otherAuthorToken = res2.body.data.token;
    otherAuthorId = res2.body.data.user._id;

    console.log('Test users registered and logged in for blog.test.js suite.');
});

afterAll(async () => {
    // Clean up the test database after all tests in this suite
    await User.deleteMany({});
    await Blog.deleteMany({});
    console.log('Test DB cleared after blog.test.js suite.');

    // Close Mongoose connection and server only if this is the very last test suite.
    // For now, if user.test.js and blog.test.js are the only suites,
    // you might consider moving server.close() and mongoose.connection.close()
    // to a global teardown file if Jest is configured for it.
    // For simple setups, if this is the last one to run, it can be here.
    // For robustness, consider putting these in a globalSetup/globalTeardown if using Jest 27+
    await mongoose.connection.close(); // For simple setups, close after all test files
    server.close(); // For simple setups, close after all test files
});

// --- Test Suite for Blog Creation ---
describe('Blog Creation Endpoint (POST /api/v1/blogs)', () => {
    it('should create a new blog successfully when authenticated', async () => {
        const res = await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`) // Set auth header
            .send(testBlogDataDraft)
            .expect(201);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Blog created successfully');
        expect(res.body.data).toHaveProperty('_id');
        expect(res.body.data.title).toEqual(testBlogDataDraft.title);
        expect(res.body.data.author).toEqual(blogAuthorId); // Check if author ID matches
        expect(res.body.data.state).toEqual('draft'); // Should be draft by default
    });

    it('should not create a blog if unauthenticated', async () => {
        const res = await request(server)
            .post('/api/v1/blogs')
            .send(testBlogDataDraft) // No Authorization header
            .expect(401);

        expect(res.body.message).toEqual('Authorization failed: No token provided.'); // Or specific message from your middleware
    });

    it('should return 400 for invalid blog creation payload (missing title)', async () => {
        const invalidBlog = { ...testBlogDataDraft, title: undefined };
        const res = await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send(invalidBlog)
            .expect(400);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Invalid payload');
        expect(res.body.errors).toContain('"title" is required'); // Expect Joi validation error
    });

    it('should not create a blog with a duplicate title for the same author', async () => {
        // First, create the blog
        await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({ ...testBlogDataDraft, title: "Unique Title 1" }) // Use a unique title for this test case
            .expect(201);

        // Then, try to create it again
        const res = await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({ ...testBlogDataDraft, title: "Unique Title 1" }) // Attempt to create duplicate
            .expect(409); // Expect 409 Conflict

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('A blog with this title already exists. Please choose a different title.');
    });
});
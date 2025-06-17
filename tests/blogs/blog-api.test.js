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

// Variables to store IDs and tokens after user creation/login
let blogAuthorToken;
let blogAuthorId;
let otherAuthorToken;
let otherAuthorId;
let createdBlogIdDraft;
let createdBlogIdPublished;
let createdBlogIdOtherAuthor;


// --- Before & After All Tests in This Suite ---
// These hooks ensure a clean slate for each test run and proper cleanup.
beforeAll(async () => {
    // 1. Clear both User and Blog collections in the test database
    await User.deleteMany({});
    await Blog.deleteMany({});
    console.log('Test DB cleared before blog.test.js suite.');

    // 2. Register and Login blogAuthor to get a token and ID
    const res1 = await request(server)
        .post('/api/v1/users/signup')
        .send(testUserBlog);
    blogAuthorToken = res1.body.data.token;
    blogAuthorId = res1.body.data.user._id;

    // 3. Register and Login otherAuthor (for testing permissions/other authors' blogs)
    const res2 = await request(server)
        .post('/api/v1/users/signup')
        .send(testUser2Blog);
    otherAuthorToken = res2.body.data.token;
    otherAuthorId = res2.body.data.user._id;

    console.log('Test users registered and logged in for blog.test.js suite.');

    // 4. Create some initial blogs for testing listing, viewing, updating, deleting
    // Blog 1: Draft by blogAuthor
    const blogRes1 = await request(server)
        .post('/api/v1/blogs')
        .set('Authorization', `Bearer ${blogAuthorToken}`)
        .send({
            title: 'My First Test Blog Draft',
            description: 'This is a test blog in draft state for listing and update tests.',
            tags: ['test', 'draft', 'initial'],
            body: 'Full content of the first test blog draft.'
        });
    createdBlogIdDraft = blogRes1.body.data._id;

    // Blog 2: Published by blogAuthor
    const blogRes2 = await request(server)
        .post('/api/v1/blogs')
        .set('Authorization', `Bearer ${blogAuthorToken}`)
        .send({
            title: 'My Second Test Blog Published',
            description: 'This is a test blog in published state for public listing and viewing tests.',
            tags: ['test', 'published', 'example'],
            body: 'Full content of the second test blog published.'
        });
    createdBlogIdPublished = blogRes2.body.data._id;
    // Update its state to published
    await request(server)
        .put(`/api/v1/blogs/${createdBlogIdPublished}`)
        .set('Authorization', `Bearer ${blogAuthorToken}`)
        .send({ state: 'published' })
        .expect(200);

    // Blog 3: Published by otherAuthor (for ownership tests)
    const blogRes3 = await request(server)
        .post('/api/v1/blogs')
        .set('Authorization', `Bearer ${otherAuthorToken}`)
        .send({
            title: 'Other Author Published Blog',
            description: 'A blog by a different author for permission tests.',
            tags: ['other', 'published'],
            body: 'Content by other author.'
        });
    createdBlogIdOtherAuthor = blogRes3.body.data._id;
    // Update its state to published
    await request(server)
        .put(`/api/v1/blogs/${createdBlogIdOtherAuthor}`)
        .set('Authorization', `Bearer ${otherAuthorToken}`)
        .send({ state: 'published' })
        .expect(200);

    console.log('Initial test blogs created and states updated.');
});

afterAll(async () => {
    // Clean up the test database after all tests in this suite
    await User.deleteMany({});
    await Blog.deleteMany({});
    console.log('Test DB cleared after blog.test.js suite.');

    // Close Mongoose connection and server once all test suites are done.
    // For Jest 27+, globalSetup/globalTeardown in jest.config.js is recommended for this.
    // If this is the last test file to run, these calls here are appropriate.
    await mongoose.connection.close();
    server.close();
});

// --- Blog Creation Endpoint Tests ---
describe('Blog Creation Endpoint (POST /api/v1/blogs)', () => {
    // Note: Initial blog creation tests are already done in beforeAll
    // This suite focuses on specific creation scenarios if needed
    it('should return 400 for invalid blog creation payload (missing title)', async () => {
        const invalidBlog = {
            description: 'This is a test blog without a title.',
            tags: ['invalid'],
            body: 'Invalid blog content.'
        };
        const res = await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send(invalidBlog)
            .expect(400);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Invalid payload');
        expect(res.body.errors).toContain('"title" is required');
    });

    it('should not create a blog if unauthenticated', async () => {
        const res = await request(server)
            .post('/api/v1/blogs')
            .send({
                title: 'Unauthenticated Blog',
                description: 'Attempt to create without auth',
                tags: ['fail'],
                body: 'Content'
            })
            .expect(401);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Authorization failed: No token provided.');
    });
});

// --- List All Published Blogs Endpoint Tests ---
describe('List All Published Blogs Endpoint (GET /api/v1/blogs)', () => {
    it('should return a paginated list of published blogs (summary data)', async () => {
        const res = await request(server)
            .get('/api/v1/blogs')
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Published blogs retrieved successfully');
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1); // At least one published blog
        expect(res.body.data[0]).toHaveProperty('title');
        expect(res.body.data[0]).not.toHaveProperty('body'); // Should be summary, no full body
        expect(res.body.data[0].author).toHaveProperty('firstName'); // Author should be populated
        expect(res.body.meta).toHaveProperty('totalBlogs');
        expect(res.body.meta).toHaveProperty('currentPage');
        expect(res.body.meta).toHaveProperty('totalPages');
        expect(res.body.meta).toHaveProperty('limit');
    });

    it('should filter published blogs by search term (title or tags)', async () => {
        const res = await request(server)
            .get('/api/v1/blogs?search=published') // Search for 'published' in title or tags
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].title).toContain('Published'); // Check if title matches search
    });

    it('should filter published blogs by author name (firstName/lastName/email)', async () => {
        const res = await request(server)
            .get(`/api/v1/blogs?author=${testUserBlog.firstName}`) // Search by author's first name
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].author.email).toEqual(testUserBlog.email);
    });

    it('should sort published blogs by read_count in descending order', async () => {
        // Increment read_count for one blog to make sorting predictable
        await request(server)
            .get(`/api/v1/blogs/${createdBlogIdPublished}`) // View to increment read_count
            .expect(200);

        const res = await request(server)
            .get('/api/v1/blogs?sortBy=read_count&order=desc')
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        // Ensure first blog has higher or equal read_count than next
        if (res.body.data.length > 1) {
            expect(res.body.data[0].read_count).toBeGreaterThanOrEqual(res.body.data[1].read_count);
        }
    });
});

// --- View Single Published Blog Endpoint Tests ---
describe('View Single Published Blog Endpoint (GET /api/v1/blogs/:id)', () => {
    it('should return full blog details and increment read_count', async () => {
        const initialBlogRes = await request(server)
            .get(`/api/v1/blogs/${createdBlogIdPublished}`);
        const initialReadCount = initialBlogRes.body.data.read_count;

        const res = await request(server)
            .get(`/api/v1/blogs/${createdBlogIdPublished}`)
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Blog retrieved successfully');
        expect(res.body.data).toHaveProperty('title', 'My Second Test Blog Published');
        expect(res.body.data).toHaveProperty('body', 'Full content of the second test blog published.'); // Full body should be present
        expect(res.body.data.read_count).toEqual(initialReadCount + 1); // Read count incremented
        expect(res.body.data.author).toHaveProperty('firstName', testUserBlog.firstName); // Author populated
    });

    it('should return 404 if blog is not found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toHexString(); // Generate a valid-looking but non-existent ID
        const res = await request(server)
            .get(`/api/v1/blogs/${nonExistentId}`)
            .expect(404);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Blog not found or is not published.');
    });

    it('should return 404 if blog is in draft state', async () => {
        const res = await request(server)
            .get(`/api/v1/blogs/${createdBlogIdDraft}`) // This blog is in draft state
            .expect(404);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Blog not found or is not published.');
    });
});

// --- Update Blog Endpoint Tests ---
describe('Update Blog Endpoint (PUT /api/v1/blogs/:id)', () => {
    it('should update a blog title and description (authenticated, owner)', async () => {
        const res = await request(server)
            .put(`/api/v1/blogs/${createdBlogIdDraft}`) // Update the draft blog
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({ title: 'Updated Draft Title', description: 'New description for draft.' })
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Blog updated successfully');
        expect(res.body.data.title).toEqual('Updated Draft Title');
        expect(res.body.data.description).toEqual('New description for draft.');
    });

    it('should update a blog state from draft to published (authenticated, owner)', async () => {
        const res = await request(server)
            .put(`/api/v1/blogs/${createdBlogIdDraft}`) // Use the same draft blog
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({ state: 'published' })
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Blog updated successfully');
        expect(res.body.data.state).toEqual('published');

        // Optional: Verify it now appears in public list (after this test, not in this assert)
    });

    it('should not update a blog if unauthenticated', async () => {
        const res = await request(server)
            .put(`/api/v1/blogs/${createdBlogIdPublished}`)
            .send({ title: 'Attempted Update' })
            .expect(401);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Authorization failed: No token provided.');
    });

    it('should not update a blog if authenticated but not the owner', async () => {
        const res = await request(server)
            .put(`/api/v1/blogs/${createdBlogIdPublished}`) // Try to update blogAuthor's blog
            .set('Authorization', `Bearer ${otherAuthorToken}`) // Use other author's token
            .send({ title: 'Malicious Update' })
            .expect(403); // Forbidden

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('You are not authorized to update this blog.');
    });

    it('should return 400 for invalid update payload (e.g., invalid state)', async () => {
        const res = await request(server)
            .put(`/api/v1/blogs/${createdBlogIdPublished}`)
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({ state: 'invalid_state' }) // Invalid state value
            .expect(400);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Invalid update payload');
        expect(res.body.errors).toContain('"state" must be one of [draft, published]');
    });
});

// --- Get Owner's Blogs Endpoint Tests ---
describe('Get Owner\'s Blogs Endpoint (GET /api/v1/blogs/my-blogs)', () => {
    it('should return a paginated list of owner\'s blogs (including draft and published)', async () => {
        const res = await request(server)
            .get('/api/v1/blogs/my-blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Owner\'s blogs retrieved successfully');
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1); // Should have created at least 2 blogs
        expect(res.body.data[0].author._id).toEqual(blogAuthorId); // Ensure blogs belong to owner
        expect(res.body.meta).toHaveProperty('totalBlogs');
    });

    it('should filter owner\'s blogs by state (draft)', async () => {
        const res = await request(server)
            .get('/api/v1/blogs/my-blogs?state=draft')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(0); // Might be 0 if all are published
        if (res.body.data.length > 0) {
            expect(res.body.data[0].state).toEqual('draft');
        }
    });

    it('should filter owner\'s blogs by state (published)', async () => {
        const res = await request(server)
            .get('/api/v1/blogs/my-blogs?state=published')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .expect(200);

        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data[0].state).toEqual('published');
    });

    it('should not return owner\'s blogs if unauthenticated', async () => {
        const res = await request(server)
            .get('/api/v1/blogs/my-blogs')
            .expect(401);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Authorization failed: No token provided.');
    });
});

// --- Delete Blog Endpoint Tests ---
describe('Delete Blog Endpoint (DELETE /api/v1/blogs/:id)', () => {
    let blogToDeleteId; // ID of a blog created specifically for deletion in this test

    // Create a blog specifically for deletion before each test in this suite
    beforeEach(async () => {
        const res = await request(server)
            .post('/api/v1/blogs')
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .send({
                title: `Blog to Delete - ${Date.now()}`, // Unique title
                description: 'This blog will be deleted.',
                tags: ['delete'],
                body: 'Ephemeral content.'
            });
        blogToDeleteId = res.body.data._id;
    });

    it('should delete a blog successfully (authenticated, owner)', async () => {
        const res = await request(server)
            .delete(`/api/v1/blogs/${blogToDeleteId}`)
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .expect(200);

        expect(res.body.status).toEqual('success');
        expect(res.body.message).toEqual('Blog deleted successfully');
        expect(res.body.data).toHaveProperty('_id', blogToDeleteId);

        // Verify it's actually deleted from DB
        const checkRes = await request(server).get(`/api/v1/blogs/${blogToDeleteId}`); // Try to view it
        expect(checkRes.statusCode).toEqual(404); // Should no longer be found
    });

    it('should not delete a blog if unauthenticated', async () => {
        const res = await request(server)
            .delete(`/api/v1/blogs/${blogToDeleteId}`)
            .expect(401);

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Authorization failed: No token provided.');
    });

    it('should not delete a blog if authenticated but not the owner', async () => {
        const res = await request(server)
            .delete(`/api/v1/blogs/${blogToDeleteId}`) // Try to delete blogAuthor's blog
            .set('Authorization', `Bearer ${otherAuthorToken}`) // Use other author's token
            .expect(403); // Forbidden

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('You are not authorized to delete this blog.');
    });

    it('should return 404 if trying to delete a non-existent blog', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toHexString();
        const res = await request(server)
            .delete(`/api/v1/blogs/${nonExistentId}`)
            .set('Authorization', `Bearer ${blogAuthorToken}`)
            .expect(404); // Not Found

        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Blog not found or you do not have permission to delete this blog.');
    });
});

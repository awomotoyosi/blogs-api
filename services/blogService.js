const Blog = require('../models/blogModel');
const User = require('../models/userModel'); 

// Helper function to calculate reading time (as before)
const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
};



const CreateBlog = async({
    title, description, tags, body, authorId
}) => {
    try {
        // ... blog creation logic ...
        return CreateBlog;
    } catch (error) {
        console.error("Error creating blog in service layer:", error);

        if (error.code === 11000 && error.keyPattern && Object.keys(error.keyPattern).includes('title')) {
            const customError = new Error('A blog with this title already exists. Please choose a different title.');
            customError.statusCode = 409;
            customError.status = "error"; // <-- CRUCIAL: Add this for consistent handling in controller
            throw customError;
        }
        throw error;
    }
};


// 2. Get All Published Blogs Function (with search, sort, pagination)
const GetAllPublishedBlogs = async ({ page, limit, search, author, sortBy, order }) => {
    try {
        const query = { state: 'published' }; // Only retrieve published blogs by default
        let sort = {};

        // Build Search Query
        if (search) {
            const searchRegex = new RegExp(search, 'i'); // Case-insensitive search
            query.$or = [
                { title: searchRegex },
                { tags: searchRegex },
            ];
        }

        // Search by Author Name/ID
        if (author) {
            const authorUsers = await User.find({
                $or: [
                    { firstName: new RegExp(author, 'i') },
                    { lastName: new RegExp(author, 'i') },
                    { email: new RegExp(author, 'i') }
                ]
            }).select('_id');

            const authorIds = authorUsers.map(user => user._id);

            if (authorIds.length > 0) {
                query.author = { $in: authorIds };
            } else if (search && query.$or) {
                 query.author = { $in: [] }; // If author search yields no users, ensure no blogs are found for this part
            } else {
                return { data: [], meta: { totalBlogs: 0, currentPage: page, totalPages: 0, limit: limit } };
            }
        }

        // Build Sort Order
        const sortOrder = order === 'desc' ? -1 : 1;
        switch (sortBy) {
            case 'read_count':
                sort = { read_count: sortOrder };
                break;
            case 'reading_time':
                sort = { reading_time: sortOrder }; // Consider numerical storage for better sorting
                break;
            case 'timestamp': // Maps to createdAt
            default:
                sort = { createdAt: sortOrder };
                break;
        }

        // Pagination
        const skip = (page - 1) * limit;

        const [blogs, totalBlogs] = await Promise.all([
            Blog.find(query)
            .select('title description tags read_count reading_time createdAt updatedAt author')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('author', 'firstName lastName email'), // Populate author info
            Blog.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalBlogs / limit);

        return {
            data: blogs,
            meta: {
                totalBlogs,
                currentPage: page,
                totalPages,
                limit
            }
        };

    } catch (error) {
        console.error("Error in BlogService.GetAllPublishedBlogs:", error);
        throw error;
    }
};

// 3. Update Blog Function (with ownership check)
const UpdateBlog = async ({ blogId, authorId, updates }) => {
    try {
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return null; // Blog not found
        }

        // Ownership check
        if (!blog.author.equals(authorId)) {
            const error = new Error('You are not authorized to update this blog.');
            error.statusCode = 403; // Forbidden
            throw error;
        }

        // Apply allowed updates
        const allowedUpdates = ['title', 'description', 'body', 'tags', 'state'];
        let hasChanges = false;

        for (const key of allowedUpdates) {
            if (updates[key] !== undefined && updates[key] !== blog[key]) {
                blog[key] = updates[key];
                hasChanges = true;
            }
        }

        // Recalculate reading time if body changed
        if (updates.body !== undefined && updates.body !== blog.body) {
            blog.reading_time = calculateReadingTime(blog.body);
            hasChanges = true;
        }

        if (!hasChanges) {
             return blog; // No actual changes provided
        }

        await blog.save(); // Save the updated blog

        // Populate author information before returning
        const populatedBlog = await Blog.findById(blog._id).populate('author', 'firstName lastName email');

        return populatedBlog;

    } catch (error) {
        console.error("Error in BlogService.UpdateBlog:", error);
        throw error;
    }
};

// --- VIEWING A SINGLE PUBLISHED BLOG ---
const GetSinglePublishedBlog = async ({ blogId }) => {
    try {
        // Find the blog by ID
        const blog = await Blog.findById(blogId);

        // 1. Check if blog exists
        if (!blog) {
            return null; // Blog not found
        }

        // 2. Check if blog is published
        if (blog.state !== 'published') {
            return null; // Blog found, but not published (shouldn't be viewable publicly)
        }

        // 3. Increment read_count
        blog.read_count += 1;
        await blog.save(); // Save the updated read_count

        // 4. Populate author information
        const populatedBlog = await Blog.findById(blog._id).populate('author', 'firstName lastName email');

        return populatedBlog;

    } catch (error) {
        console.error("Error in BlogService.GetSinglePublishedBlog:", error);
        throw error;
    }
};

// VIEW OWNER'S LIST OF BLOGS ---
const GetOwnerBlogs = async ({ ownerId, page, limit, state }) => {
    try {
        const query = { author: ownerId }; // Filter by the authenticated owner's ID
        let sort = { createdAt: -1 }; // Default sort by most recent

        // Filter by state if provided (draft or published)
        if (state) {
            // Ensure the state is either 'draft' or 'published' if provided
            if (state === 'draft' || state === 'published') {
                query.state = state;
            } else {
                // Optionally throw an error or ignore invalid state filter
                // For now, we'll just ignore it, so it acts like no state filter was applied.
                // You could also throw: throw new Error('Invalid state filter. Must be "draft" or "published".');
            }
        }

        // Pagination
        const skip = (page - 1) * limit;

        const [blogs, totalBlogs] = await Promise.all([
            Blog.find(query)
                .select('title description tags state read_count reading_time createdAt updatedAt author') // Summary data
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('author', 'firstName lastName email'), // Populate author info
            Blog.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalBlogs / limit);

        return {
            data: blogs,
            meta: {
                totalBlogs,
                currentPage: page,
                totalPages,
                limit
            }
        };

    } catch (error) {
        console.error("Error in BlogService.GetOwnerBlogs:", error);
        throw error;
    }
};

// --- NEW SERVICE FUNCTION FOR DELETING A BLOG ---
const DeleteBlog = async ({ blogId, authorId }) => {
    try {
        const blog = await Blog.findById(blogId);

        // 1. Check if blog exists
        if (!blog) {
            return null; // Blog not found
        }

        // 2. Ownership check: Ensure the authenticated user is the author of the blog
        if (!blog.author.equals(authorId)) {
            const error = new Error('You are not authorized to delete this blog.');
            error.statusCode = 403; // Forbidden
            throw error;
        }

        // 3. Delete the blog
        const deletedBlog = await Blog.findByIdAndDelete(blogId); // Use findByIdAndDelete

        return deletedBlog; // Return the deleted document

    } catch (error) {
        console.error("Error in BlogService.DeleteBlog:", error);
        throw error;
    }
};

module.exports = {
    CreateBlog,
 GetAllPublishedBlogs,
 UpdateBlog,
 GetSinglePublishedBlog,
 GetOwnerBlogs,
 DeleteBlog

};
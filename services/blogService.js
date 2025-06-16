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
    title,
    description,
    tags,
    body,
    authorId
   
}) => {

    try{
   // Step 1: Calculate derived fields *before* saving
   const reading_time = calculateReadingTime(body);

   // Step 2: Call Mongoose's create method with the
   //         fields that match your schema,
   //         including calculated and mapped values.

    const createBlog = await Blog.create({
        title,
        description,
        author:authorId,
        reading_time,
       tags,
        body
    })


    return createBlog;

}

catch (error) {
    console.error("Error creating blog:", error);
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
module.exports = {
    CreateBlog,
 GetAllPublishedBlogs,
 UpdateBlog

};

const BlogService = require('../services/blogService');

const CreateBlogController = async (req, res) => {
    try {
        const payload = req.body;
        // Access the authenticated user's ID from req.user._id
        const authorId = req.user._id; // <--- This is the key change!

        if (!authorId) {
            // This case should ideally not be reached if AuthorizeUser works,
            // but it's a good safeguard.
            return res.status(401).json({ message: 'Author ID not found. User not authenticated.' });
        }

        const response = await BlogService.CreateBlog({
            title: payload.title,
            description: payload.description,
            tags: payload.tags,
            body: payload.body,
            authorId: authorId, // Pass the extracted authorId to the service
        });

        if (response) {
            return res.status(201).json({
                message: 'Blog created successfully',
                data: response
            });
        }
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({
                message: error.message,
            });
        }
        console.error("Error in createBlogController:", error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};




//  FOR LISTING PUBLISHED BLOGS ---
const getPublishedBlogsController = async (req, res) => {
    try {
        // Extract query parameters for search, sort, and pagination
        const {
            page = 1,
            limit = 20,
            search, // Can be used for title/tags
            author, // Author's name or ID for search
            sortBy, // Field to sort by (read_count, reading_time, timestamp)
            order // asc or desc
        } = req.query;

        const blogs = await BlogService.GetAllPublishedBlogs({
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            author,
            sortBy,
            order
        });

        return res.status(200).json({
            status: "success",
            message: "Published blogs retrieved successfully",
            data: blogs.data,
            meta: blogs.meta // For pagination info
        });

    } catch (error) {
        console.error("Error in getPublishedBlogsController:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
};


const updateBlogController = async (req, res) => {
    try {
        const blogId = req.params.id; // Get blog ID from URL parameter (e.g., /blogs/:id)
        const updates = req.body;     // Get the fields to update from the request body
        const authorId = req.user._id;  // Get the ID of the authenticated user (the current author)

        if (!authorId) {
            // This should ideally be caught by AuthorizeUser middleware, but good safeguard
            return res.status(401).json({ message: 'Authentication required to update blog.' });
        }

        // Call the service layer to handle the update logic
        const updatedBlog = await BlogService.UpdateBlog({
            blogId,
            authorId, // Passed to service for ownership check
            updates   // Passed to service for applying changes
        });

        if (!updatedBlog) {
            // If the service returns null (blog not found) or throws an error
            // due to permissions (caught in service, then re-thrown with status code)
            return res.status(404).json({ message: 'Blog not found or you do not have permission to edit this blog.' });
        }

        // Success response
        return res.status(200).json({
            status: "success",
            message: "Blog updated successfully",
            data: updatedBlog
        });

    } catch (error) {
        // Handle custom errors (like 403 Forbidden from service) or generic 500
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                status: "error",
                message: error.message
            });
        }
        console.error("Error in updateBlogController:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
};


module.exports = {
    CreateBlogController,
    getPublishedBlogsController,
    updateBlogController

};

const BlogService = require('../services/blogService');

const CreateBlogController = async (req, res) => {
    try {
        const payload = req.body;
        const authorId = req.user._id;

        const response = await BlogService.CreateBlog({
            title: payload.title,
            description: payload.description,
            tags: payload.tags,
            body: payload.body,
            authorId: authorId,
        });

        // --- MODIFIED SUCCESS RESPONSE ---
        return res.status(201).json({
            status: "success", // <-- Test expects this as a string
            message: 'Blog created successfully',
            data: response // This is the blog object from service
        });
    } catch (error) {
        console.error("Error in createBlogController:", error); // Keep this log

        // This catch block handles errors THROWN by service
        // Ensure error.statusCode and error.status are set by the service/custom error
        const statusCode = error.statusCode || 500;
        const statusString = error.status || "error"; // Expecting service to set error.status = "error"
        const message = error.message || 'Internal server error';
        const errors = error.errors; // For validation errors

        return res.status(statusCode).json({
            status: statusString, // <-- Test expects this as a string
            message: message,
            errors: errors
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

const getSinglePublishedBlogController = async (req, res) => {
    try {
        const blogId = req.params.id; // Get the blog ID from the URL

        const blog = await BlogService.GetSinglePublishedBlog({ blogId });

        if (!blog) {
            // Blog not found OR blog is not published (as per service logic)
            return res.status(404).json({
                status: "error",
                message: "Blog not found or is not published."
            });
        }

        return res.status(200).json({
            status: "success",
            message: "Blog retrieved successfully",
            data: blog
        });

    } catch (error) {
        console.error("Error in getSinglePublishedBlogController:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
};

const getOwnerBlogsController = async (req, res) => {
    try {
        const ownerId = req.user._id; // Get the ID of the authenticated user (the owner)

        if (!ownerId) {
            return res.status(401).json({ message: 'Authentication required to view your blogs.' });
        }

        // Extract query parameters for pagination and state filter
        const {
            page = 1,
            limit = 20,
            state // Can be 'draft', 'published', or undefined (to get all states)
        } = req.query;

        const blogs = await BlogService.GetOwnerBlogs({
            ownerId,
            page: parseInt(page),
            limit: parseInt(limit),
            state
        });

        return res.status(200).json({
            status: "success",
            message: "Owner's blogs retrieved successfully",
            data: blogs.data,
            meta: blogs.meta // For pagination info
        });

    } catch (error) {
        console.error("Error in getOwnerBlogsController:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error",
            error: error.message
        });
    }
};

const deleteBlogController = async (req, res) => {
    try {
        const blogId = req.params.id; // Get blog ID from URL parameter
        const authorId = req.user._id; // Get authenticated author's ID

        if (!authorId) {
            return res.status(401).json({ message: 'Authentication required to delete blog.' });
        }

        const deletedBlog = await BlogService.DeleteBlog({
            blogId,
            authorId // Pass authorId for ownership check
        });

        if (!deletedBlog) {
            // This case handles blog not found or not owned by the author
            return res.status(404).json({ message: 'Blog not found or you do not have permission to delete this blog.' });
        }

        return res.status(200).json({
            status: "success",
            message: "Blog deleted successfully",
            data: deletedBlog // Optionally return the deleted blog data
        });

    } catch (error) {
        // Specific error handling for permission issues
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                status: "error",
                message: error.message
            });
        }
        console.error("Error in deleteBlogController:", error);
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
    updateBlogController,
    getSinglePublishedBlogController,
    getOwnerBlogsController,
    deleteBlogController

};
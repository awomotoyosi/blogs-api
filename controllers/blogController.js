
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
        console.error("Error in createBlogController:", error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

// ... (other blog controller functions)

module.exports = {
    CreateBlogController

};
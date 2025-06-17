const express = require('express');

const router = express.Router();

const blogController = require('../controllers/blogController');
const blogMiddleware = require('../middleware/blogMiddleware.js');
const userMiddleware = require('../middleware/userMiddleware');

// --- Public Routes (No Auth Required) ---
// List all published blogs with search, sort, pagination
router.get('/', blogController.getPublishedBlogsController); 
// Get a list of blogs owned by the authenticated user
router.get('/my-blogs', userMiddleware.AuthorizeUser, blogController.getOwnerBlogsController); 
// View a single published blog and increment read_count
router.get('/:id', blogController.getSinglePublishedBlogController); // <--- ADD THIS ROUTE



// --- Protected Routes (Auth Required) ---
// create a blog by Loggedin Users
router.post('/', userMiddleware.AuthorizeUser, blogMiddleware.CreateBlogValidator, blogController.CreateBlogController);

//  Edit a Blog and also move a blog from draft state to published
router.put('/:id', userMiddleware.AuthorizeUser, blogMiddleware.UpdateBlogValidator, blogController.updateBlogController); 

//Delete a Blog
 router.delete('/:id', userMiddleware.AuthorizeUser, blogController.deleteBlogController);



module.exports = router;
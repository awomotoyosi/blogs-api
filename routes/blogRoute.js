const express = require('express');

const router = express.Router();

const blogController = require('../controllers/blogController');
const blogMiddleware = require('../middleware/blogMiddleware.js');
const userMiddleware = require('../middleware/userMiddleware');

// --- Public Routes (No Auth Required) ---
// List all published blogs with search, sort, pagination
router.get('/', blogController.getPublishedBlogsController); 


// --- Protected Routes (Auth Required) ---
// create a blog by Loggedin Users
router.post('/', userMiddleware.AuthorizeUser, blogMiddleware.CreateBlogValidator, blogController.CreateBlogController);
//  Edit a Blog and also move a blog from draft state to published
router.put('/:id', userMiddleware.AuthorizeUser, blogMiddleware.UpdateBlogValidator, blogController.updateBlogController); // <--- ADDED VALIDATOR HERE!



// router.delete('/:id', userMiddleware.AuthorizeUser, blogController.deleteBlogController);
// router.get('/my-blogs', userMiddleware.AuthorizeUser, blogController.getMyBlogsController);


module.exports = router;
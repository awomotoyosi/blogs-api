const express = require('express');

const router = express.Router();

const blogController = require('../controllers/blogController');
const blogMiddleware = require('../middleware/blogMiddleware.js');
const userMiddleware = require('../middleware/userMiddleware');

router.use(userMiddleware.AuthorizeUser)

// create job
router.post('/', blogMiddleware.CreateBlogValidator, blogController.CreateBlogController);
//router.get('/', jobsController.getJobsController);

module.exports = router;
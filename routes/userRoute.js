const express = require('express');
const userMiddleware = require('../middleware/userMiddleware');

const UsersController = require('../controllers/userController');

const router = express.Router();


router.post('/signup', userMiddleware.RegisterUserValidator, UsersController.CreateUser);
router.post('/login', UsersController.LoginUser);

module.exports = router;
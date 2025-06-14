const express = require('express');

const router = express.Router();

const UsersController = require('../controllers/userController');

router.post('/signup', UsersController.CreateUser);
router.post('/login', UsersController.LoginUser);

module.exports = router;
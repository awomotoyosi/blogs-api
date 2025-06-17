const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const joi = require("joi");



// Joi schema for user registration validation
const RegisterUserSchema = joi.object({
    firstName: joi.string().min(2).required().messages({
        'string.min': 'First name must be at least 2 characters long',
        'any.required': 'First name is required'
    }),
    lastName: joi.string().min(2).required().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'any.required': 'Last name is required'
    }),
    email: joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi.string().min(6).required().messages({ // Stronger password validation can be added
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    })
});

// Middleware function to validate registration payload
const RegisterUserValidator = async (req, res, next) => {
    try {
        const payload = req.body;
        await RegisterUserSchema.validateAsync(payload, { abortEarly: false }); // abortEarly: false to get all errors

        next(); // If validation passes, proceed to the next middleware/controller
    } catch (error) {
        // If validation fails, Joi throws an error
        return res.status(400).json({
            status: "error",
            message: "Validation failed", // More general message
            errors: error.details.map(detail => detail.message) // Map Joi details to just messages
        });
    }
};

const AuthorizeUser = async (req, res, next) => {
    const bearerToken = req.headers['authorization'];

    if (!bearerToken) {
        return res.status(401).json({
            status: 'error',
            message: 'Authorization failed: No token provided.' // <--- EXACT match for test
        });
    }

    const tokenArray = bearerToken.split(' ');
    const token = tokenArray[1];

    if (!token) {
        return res.status(401).json({
            status: 'error',
            message: 'Authorization failed: Malformed token header.' // Consider matching this too if you have a test for it
        });
    }

    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
        req.user = { _id: decoded.id };
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ status: 'error', message: 'Authentication failed: Invalid token.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ status: 'error', message: 'Authentication failed: Token expired.' });
        }
        return res.status(500).json({ status: 'error', message: 'Internal server error during authentication.' });
    }
};

module.exports = {
    RegisterUserValidator,
    AuthorizeUser
};

const UserService = require('../services/userService');

const CreateUser = async (req, res) => {
    try {
        const payload = req.body;
        const serviceResponse = await UserService.CreateUser(payload);

        // Map service's `success` boolean to `status` string in response body
        const responseStatusString = serviceResponse.success ? "success" : "error";

        return res.status(serviceResponse.status).json({
            status: responseStatusString, // This is the string the test expects
            message: serviceResponse.message,
            data: serviceResponse.data,
            errors: serviceResponse.errors // Include errors array for validation failures
        });
    } catch (error) {
        console.error("Unhandled error in CreateUser controller:", error); // Log original error
        return res.status(500).json({
            status: "error",
            message: 'Internal server error',
            error: error.message
        });
    }
};

const LoginUser = async (req, res) => {
    try {
        const serviceResponse = await UserService.LoginUser(req.body);

        // Map service's `success` boolean to `status` string in response body
        const responseStatusString = serviceResponse.success ? "success" : "error";

        return res.status(serviceResponse.status).json({
            status: responseStatusString, // This is the string the test expects
            message: serviceResponse.message,
            data: serviceResponse.data
        });
    } catch (error) {
        console.error("Unhandled error in LoginUser controller:", error); // Log original error
        return res.status(500).json({
            status: "error",
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    CreateUser,
    LoginUser
};
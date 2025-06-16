const joi = require("joi");

const CreateBlogValidator = async (req, res, next) => {
  

    try {
            const payload = req.body;

    const schema = joi.object({
        title: joi.string().required(),
        description: joi.string().required(),
        tags: joi.array().required(),
        body: joi.string().required(),
        
    })

    const { error, value } = await schema.validate(payload);

    if (!error) {
        next()
    } else {
        return res.status(400).json({
            status: "error",
            message: "Invalid payload",
            error: error.details
        })
    }

    } catch (error) {
        return res.status(400).json({
            status: "error",
            message: error.message
        })
    }
}


// --- NEW VALIDATOR FOR UPDATING A BLOG ---
const UpdateBlogValidator = async (req, res, next) => {
    try {
        const payload = req.body;

        // For updates, fields are usually optional, as you might only update one field.
        // We ensure that if a field IS provided, it meets the type requirements.
        const schema = joi.object({
            title: joi.string().optional(),
            description: joi.string().optional(),
            tags: joi.array().items(joi.string()).optional(),
            body: joi.string().optional(),
            // For 'state', ensure it's a valid enum value if provided
            state: joi.string().valid('draft', 'published').optional(),
            // Ensure no unknown fields are passed if you want strict validation
        }).min(1); // At least one field must be provided for an update

        const { error, value } = await schema.validate(payload);

        if (!error) {
            next();
        } else {
            return res.status(400).json({
                status: "error",
                message: "Invalid update payload",
                error: error.details
            });
        }

    } catch (error) {
        console.error("Error in UpdateBlogValidator:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error during validation.",
            error: error.message
        });
    }
};


module.exports = {
    CreateBlogValidator,
    UpdateBlogValidator
}
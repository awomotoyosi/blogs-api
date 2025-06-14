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

module.exports = {
    CreateBlogValidator
}
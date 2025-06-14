const Blog = require('../models/blogModel');

// Helper function to calculate reading time (as before)
const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
};



const CreateBlog = async({
    title,
    description,
    tags,
    body,
    authorId
   
}) => {

    try{
   // Step 1: Calculate derived fields *before* saving
   const reading_time = calculateReadingTime(body);

   // Step 2: Call Mongoose's create method with the
   //         fields that match your schema,
   //         including calculated and mapped values.

    const createBlog = await Blog.create({
        title,
        description,
        author:authorId,
        reading_time,
       tags,
        body
    })


    return createBlog;

}

catch (error) {
    console.error("Error creating blog:", error);
    throw error;
}
};




const GetAllJobs = async({ location, status, mode }) => {
    const query = {}

    if (location) {
        query.location = location;
    }

    if (status) {
        query.status = status;
    }

    if (mode) {
        query.mode = mode;
    }

    const jobs = await Job.find(query); // select * from jobs where location = location and status = status and mode = mode

    return jobs;
}

module.exports = {
    CreateBlog,
    GetAllJobs
};
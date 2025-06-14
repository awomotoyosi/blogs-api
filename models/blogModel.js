const mongoose = require('mongoose');
const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      state: {
        type: String,
        enum: ['draft', 'published'],
        default: 'draft',
        required: true
      },
      read_count: {
        type: Number,
        default: 0
      },
      reading_time: {
        type: String
      },
      tags: [{
        type: String,
        trim: true
      }],
      body: {
        type: String,
        required: true
    }
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
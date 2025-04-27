// models/Post.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  content: String,
  image: String,
  role: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  comments: [commentSchema]
});

module.exports = mongoose.model("Post", postSchema);

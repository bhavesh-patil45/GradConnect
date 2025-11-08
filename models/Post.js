const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  likes: {
    type: Number,
    default: 0
  },
  
comments: {
  type: [
    {
      text: String,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  ],
  default: [] // ✅ Always define this
}

});


module.exports = mongoose.model("Post", postSchema);

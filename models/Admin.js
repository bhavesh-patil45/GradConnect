const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: String,
  email: {
    type: String,
    require: true,
    unique: true // prevent duplicate
  },
  password: String,
  role: {
    type: String,
    default: "admin"
  },
  bio: { type: String, default: "" },
  profileImage: { type: String, default: "/images/default-avatar.png" },

});

module.exports = mongoose.model("Admin", adminSchema);

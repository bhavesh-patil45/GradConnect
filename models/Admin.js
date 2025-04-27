const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: String,
  email: {
    type: String,
    require : true,
    unique: true // prevent duplicate
  },
  password: String,
  role: {
    type: String,
    default: "admin"
  }
});

module.exports = mongoose.model("Admin", adminSchema);

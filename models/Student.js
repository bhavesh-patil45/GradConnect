const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  studentId: { type: String, required: true },
  year: { type: String, required: true },
  bio: { type: String, default: "" },
  profileImage: { type: String, default: "/images/default-avatar.png" },
  department: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: {
    type: String,
    default: '/default-avatar.png'
  }

});

module.exports = mongoose.model("Student", studentSchema);

const mongoose = require("mongoose");

const alumniSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: String,
  batch: String,
  currentCompany: { type: String, default: "" },
  designation: { type: String, default: "" },
  bio: { type: String, default: "" },
  profileImage: { type: String, default: "/images/default-avatar.png" },
  experience: [
    {
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      description: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Alumni", alumniSchema);

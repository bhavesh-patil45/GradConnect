const mongoose = require ("mongoose");

const alumniSchema = new mongoose.Schema({
  name: String,
  email:{

  type: String,
  unique: true,
  },
  password: String,
  batch : String,
  department : String,
  currentCompany: String,
  designation: String
});

module.exports = mongoose.model("Alumni", alumniSchema);
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  description: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applyLink: { type: String, required: true }, // <-- New field
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);

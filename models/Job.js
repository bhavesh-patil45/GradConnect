const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  applicants: [{ 
    userId: mongoose.Schema.Types.ObjectId,
    role: String,
    appliedAt: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Job', jobSchema);

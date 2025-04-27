const express = require('express');
const router = express.Router();

// Sample data (replace with DB data later)
const posts = [
  {
    user: { name: 'Bhavesh', profilePic: '/images/bhav.png' },
    image: '/images/post1.jpg',
    likes: 5,
    comments: ["Nice!", "Wow!"]
  }
];

const suggestions = [
  { name: 'Ravi' },
  { name: 'Sneha' }
];

const jobs = [
  { title: 'Frontend Developer', company: 'Infosys' },
  { title: 'Backend Intern', company: 'TCS' }
];

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { posts, suggestions, jobs });
});

module.exports = router;

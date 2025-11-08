// server.js — Final Stable Version (LinkedIn-style Profile + Fully Functional Backend)

const express = require('express');
const app = express();
const path = require("path");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const socketIo = require('socket.io');
const http = require('http').createServer(app);
const io = socketIo(http);

// Models
const Student = require('./models/Student');
const Alumni = require('./models/Alumni');
const Admin = require('./models/Admin');
const Post = require('./models/Post');
const Job = require('./models/Job');
const Notification = require('./models/Notification');

// Set EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(
  session({
    secret: "gradconnect_secret",
    resave: false,
    saveUninitialized: false
  })
);

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/gradconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// File Uploads for posts
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// File Uploads for profile pictures
const uploadProfilePic = multer({
  storage: multer.diskStorage({
    destination: 'public/uploads/profiles',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  })
});

// Socket.IO — chat
io.on('connection', socket => {
  console.log('💬 A user connected');
  socket.on('chatMessage', msg => io.emit('chatMessage', msg));
});

// Authentication check
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.role) return next();
  res.redirect('/login');
}

// Routes
app.get('/', (req, res) => res.render('select-role'));

app.get('/login', (req, res) => {
  const role = req.query.role || '';
  res.render('login', { role, error: null });
});

app.get('/forgot-password', (req, res) => {
  const role = req.query.role || '';
  res.render('forgot-password', { role, message: null });
});

app.post('/forgot-password', async (req, res) => {
  const { email, role } = req.body;
  const Model = role === "Admin" ? Admin : role === "Student" ? Student : Alumni;
  const user = await Model.findOne({ email });
  const msg = user ? 'Password reset link sent (demo)' : 'No account found';
  res.render('forgot-password', { role, message: msg });
});

// Registration routes
app.get('/admin/register', (req, res) => res.render('admin-register'));
app.get('/student/register', (req, res) => res.render('student-register'));
app.get('/alumni/register', (req, res) => res.render('alumni-register'));

app.post('/admin/register', async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await Admin.findOne({ email });
  if (existing)
    return res.render('already-registered', { message: 'Already Registered', loginRoute: '/login?role=admin' });
  const hash = await bcrypt.hash(password, 10);
  await new Admin({ username: name, email, password: hash }).save();
  res.render('success', { name, loginRoute: '/login?role=admin' });
});

app.post('/student/register', async (req, res) => {
  const { name, studentId, year, department, email, password } = req.body;
  const existing = await Student.findOne({ email });
  if (existing)
    return res.render('already-registered', { message: 'Already Registered', loginRoute: '/login?role=student' });
  const hash = await bcrypt.hash(password, 10);
  await new Student({ name, studentId, year, department, email, password: hash }).save();
  res.render('success', { name, loginRoute: '/login?role=student' });
});

app.post('/alumni/register', async (req, res) => {
  const { name, email, password, batch, department, currentCompany, designation } = req.body;
  const existing = await Alumni.findOne({ email });
  if (existing)
    return res.render('already-registered', { message: 'Already Registered', loginRoute: '/login?role=alumni' });
  const hash = await bcrypt.hash(password, 10);
  await new Alumni({ name, email, password: hash, batch, department, currentCompany, designation }).save();
  res.render('success', { name, loginRoute: '/login?role=alumni' });
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  const Model = role === "Admin" ? Admin : role === "Student" ? Student : Alumni;
  const user = await Model.findOne({ email });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = user;
    req.session.role = role;
    return res.redirect('/dashboard');
  }
  res.render('login', { role, error: 'Invalid email or password.' });
});

// Dashboard
app.get("/dashboard", isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  const posts = await Post.find().sort({ createdAt: -1 });
  const myposts = await Post.find({ createdBy: user._id }).sort({ createdAt: -1 });
  const jobs = await Job.find().sort({ createdAt: -1 });
  const notifications = await Notification.find({ user: user._id }).sort({ createdAt: -1 });

  res.render("dashboard", {
    name: user.name || user.username,
    role,
    user,
    posts,
    myposts,
    jobs,
    notifications
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Logout error');
    res.redirect('/login');
  });
});

// Create post
app.post('/post', isAuthenticated, upload.single('image'), async (req, res) => {
  const { content } = req.body;
  const { user, role } = req.session;
  const image = req.file ? '/uploads/' + req.file.filename : null;

  const newPost = new Post({ content, image, createdBy: user._id, role });
  await newPost.save();

  await Notification.create({ user: user._id, message: "Your post has been created!" });
  res.redirect("/dashboard");
});

// Like post
app.post('/post/:id/like', isAuthenticated, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post) {
    post.likes = (post.likes || 0) + 1;
    await post.save();
  }
  res.redirect('/dashboard');
});

// Comment post
app.post('/post/:id/comment', isAuthenticated, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post) {
    const comment = { user: req.session.user.name || req.session.user.username, text: req.body.text };
    post.comments.push(comment);
    await post.save();
  }
  res.redirect('/dashboard');
});

app.post('/post', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body; // from <textarea name="content">
    const image = req.file ? '/uploads/' + req.file.filename : null;

    // make sure you have req.session.userId or derive from req.session.user
    const userId = req.session.user ? req.session.user._id : null;

    if (!userId) {
      console.log("⚠️ Missing userId in session");
      return res.redirect('/login');
    }

    const newPost = new Post({
      caption: content, // ✅ map content → caption
      image,
      userId
    });

    await newPost.save();
    console.log("✅ Post created successfully");
    res.redirect('/dashboard');
  } catch (err) {
    console.error("❌ Error creating post:", err);
    res.status(500).send("Error creating post");
  }
});

// ====================== PROFILE MANAGEMENT ======================

// Update Profile Info (bio, company, designation, profile picture)
app.post("/profile/update", isAuthenticated, uploadProfilePic.single("profileImage"), async (req, res) => {
  try {
    const { bio, currentCompany, designation } = req.body;
    const userId = req.session.user._id;

    const updateData = { bio, currentCompany, designation };
    if (req.file) {
      updateData.profileImage = "/uploads/profiles/" + req.file.filename;
    }

    // Update for all roles
    let Model;
    if (req.session.role === "Alumni") Model = Alumni;
    else if (req.session.role === "Student") Model = Student;
    else Model = Admin;

    const updatedUser = await Model.findByIdAndUpdate(userId, updateData, { new: true });
    req.session.user = updatedUser; // refresh session

    console.log("✅ Profile updated:", updatedUser);
    res.redirect("/dashboard#profile");
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).send("Error updating profile.");
  }
});


// Add Experience (company, position, start & end dates)
app.post("/profile/experience", isAuthenticated, async (req, res) => {
  try {
    const { company, position, startDate, endDate, description } = req.body;
    const userId = req.session.user._id;

    const updatedUser = await Alumni.findByIdAndUpdate(
      userId,
      { $push: { experience: { company, position, startDate, endDate, description } } },
      { new: true }
    );

    req.session.user = updatedUser;
    console.log("✅ Experience added for user:", updatedUser.name);
    res.redirect("/dashboard#profile");
  } catch (error) {
    console.error("Experience add error:", error);
    res.status(500).send("Error adding experience.");
  }
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});

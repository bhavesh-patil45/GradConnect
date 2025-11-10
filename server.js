// =================== server.js — FINAL STABLE VERSION ===================

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

// =================== MODELS ===================
const User = require('./models/User');
const Student = require('./models/Student');
const Alumni = require('./models/Alumni');
const Admin = require('./models/Admin');
const Post = require('./models/Post');
const Job = require('./models/Job');
const Notification = require('./models/Notification');

// =================== APP SETTINGS ===================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    secret: "gradconnect_secret",
    resave: false,
    saveUninitialized: false,
  })
);

// =================== DATABASE CONNECTION ===================
mongoose.connect('mongodb://127.0.0.1:27017/gradconnect')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =================== FILE UPLOAD CONFIG ===================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

const uploadProfilePic = multer({
  storage: multer.diskStorage({
    destination: 'public/uploads/profiles',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  }),
});

// =================== SOCKET.IO CHAT ===================
io.on('connection', socket => {
  console.log('💬 A user connected');
  socket.on('chatMessage', msg => io.emit('chatMessage', msg));
});

// =================== AUTH MIDDLEWARE ===================
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.role) return next();
  res.redirect('/login');
}

// =================== ROUTES ===================

// ---------- ROLE SELECTION ----------
app.get('/', (req, res) => res.render('select-role'));

// ---------- LOGIN & REGISTER ----------
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

// ---------- REGISTER ----------
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

// ---------- LOGIN ----------
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

// =================== DASHBOARD ===================
app.get("/dashboard", isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  // ✅ Ensure posts have user data populated properly
  const posts = await Post.find()
    .sort({ _id: -1 })
    .populate("userId", "name email profileImage");

  const jobs = await Job.find().sort({ createdAt: -1 });
  const notifications = await Notification.find({ user: user._id }).sort({ createdAt: -1 });

  res.render("dashboard", {
    name: user.name || user.username,
    role,
    user,
    posts,
    jobs,
    notifications
  });
});

// =================== LOGOUT ===================
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// =================== CREATE POST ===================
app.post('/post/create', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.session.user._id;
    const image = req.file ? '/uploads/' + req.file.filename : null;

    const newPost = new Post({ caption, image, userId });
    await newPost.save();

    // ✅ Create a notification for the user
    await Notification.create({ user: userId, message: "Your post has been created!" });

    res.redirect("/dashboard");
  } catch (err) {
    console.error("❌ Error creating post:", err);
    res.status(500).send("Error creating post");
  }
});

// =================== LIKE & COMMENT ===================
app.post('/post/:id/like', isAuthenticated, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post) {
    post.likes = (post.likes || 0) + 1;
    await post.save();
  }
  res.redirect('/dashboard');
});

app.post('/post/:id/comment', isAuthenticated, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (post) {
    post.comments.push({
      text: req.body.text,
      user: req.session.user._id
    });
    await post.save();
  }
  res.redirect('/dashboard');
});

// Create a new Job
app.post('/job/create', isAuthenticated, async (req, res) => {
  try {
    const { title, company, location, description, applyLink } = req.body;
    const newJob = new Job({
      title,
      company,
      location,
      description,
      applyLink,
      postedBy: req.session.user._id
    });
    await newJob.save();
    res.redirect('/dashboard#jobs');
  } catch (err) {
    console.error("❌ Error creating job:", err);
    res.status(500).send("Error creating job");
  }
});

// =================== PROFILE UPDATE ===================
app.post("/profile/update", isAuthenticated, uploadProfilePic.single("profileImage"), async (req, res) => {
  try {
    const { bio, currentCompany, designation } = req.body;
    const updateData = { bio, currentCompany, designation };
    if (req.file) updateData.profileImage = "/uploads/profiles/" + req.file.filename;

    const Model = req.session.role === "Alumni" ? Alumni : req.session.role === "Student" ? Student : Admin;
    const updatedUser = await Model.findByIdAndUpdate(req.session.user._id, updateData, { new: true });

    req.session.user = updatedUser;
    res.redirect("/dashboard#profile");
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).send("Error updating profile.");
  }
});

// =================== ADD EXPERIENCE ===================
app.post("/profile/experience", isAuthenticated, async (req, res) => {
  try {
    const { company, position, startDate, endDate, description } = req.body;
    const updatedUser = await Alumni.findByIdAndUpdate(
      req.session.user._id,
      { $push: { experience: { company, position, startDate, endDate, description } } },
      { new: true }
    );
    req.session.user = updatedUser;
    res.redirect("/dashboard#profile");
  } catch (error) {
    console.error("Experience add error:", error);
    res.status(500).send("Error adding experience.");
  }
});

// =================== SERVER START ===================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`✅ Server is running at http://localhost:${PORT}`));

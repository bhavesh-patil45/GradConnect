const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Student = require('./models/Student');
const Alumni = require('./models/Alumni');
const Admin = require('./models/Admin');
const Post = require('./models/Post');
const Job = require('./models/Job');

const app = express(); // ✅ Ye baad me ho raha hai
const http = require('http').createServer(app); // ✅ Fir use karo
const socketIo = require('socket.io');
const io = socketIo(http); // ✅ Attach socket to http server

// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(session({
  secret: 'gradconnect-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/gradconnect', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error: ', err));


  //like post
  app.post("/post/:id/like", async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (post) {
      post.likes += 1;
      await post.save();
    }
    res.redirect("/dashboard");
  });
  
  //comment post
  app.post("/post/:id/comment", async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (post) {
      const comment = {
        user: req.session.user.name || req.session.user.username,
        text: req.body.text
      };
      post.comments.push(comment);
      await post.save();
    }
    res.redirect("/dashboard");
  });
  

// Serve chat on client
io.on('connection', socket => {
  console.log("A user connected");
  socket.on('chatMessage', msg => {
    io.emit('chatMessage', msg); // Broadcast
  });
});


// =========================== FILE UPLOAD ===============================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// =========================== ROUTES ===============================

app.get("/", (req, res) => {
  res.render("select-role");
});

app.get("/login", (req, res) => {
  const role = req.query.role || "";
  res.render("login", { role, error: null });
});

// =========================== REGISTER ROUTES ===============================

app.get("/admin/register", (req, res) => res.render("admin-register"));
app.post("/admin/register", async (req, res) => {
  const { name, email, password } = req.body;
  const existing = await Admin.findOne({ email });
  if (existing) {
    return res.render("already-registered", {
      message: "Email already registered!",
      loginRoute: "/login?role=admin"
    });
  }
  const hash = await bcrypt.hash(password, 10);
  await new Admin({ username: name, email, password: hash }).save();
  res.render("success", { name, loginRoute: "/login?role=admin" });
});

app.get("/student/register", (req, res) => res.render("student-register"));
app.post("/student/register", async (req, res) => {
  const { name, studentId, year, department, email, password } = req.body;
  const existing = await Student.findOne({ email });
  if (existing) return res.render("already-registered", { message: "Email already registered!", loginRoute: "/login?role=student" });
  const hash = await bcrypt.hash(password, 10);
  await new Student({ name, studentId, year, department, email, password: hash }).save();
  res.render("success", { name, loginRoute: "/login?role=student" });
});

app.get("/alumni/register", (req, res) => res.render("alumni-register"));
app.post("/alumni/register", async (req, res) => {
  const { name, email, password, batch, department, currentCompany, designation } = req.body;
  const existing = await Alumni.findOne({ email });
  if (existing) return res.render("already-registered", { message: "Email already registered!", loginRoute: "/login?role=alumni" });
  const hash = await bcrypt.hash(password, 10);
  await new Alumni({ name, email, password: hash, batch, department, currentCompany, designation }).save();
  res.render("success", { name, loginRoute: "/login?role=alumni" });
});

// =========================== UNIVERSAL LOGIN ===============================

app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user;

    if (role === 'Admin') {
      user = await Admin.findOne({ email });
    } else if (role === 'Student') {
      user = await Student.findOne({ email });
    } else if (role === 'Alumni') {
      user = await Alumni.findOne({ email });
    }

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = user;
      req.session.role = role;
      return res.redirect("/dashboard");
    }

    res.render("login", { role, error: "Invalid email or password." });
  } catch (err) {
    console.error(err);
    res.render("login", { role, error: "Something went wrong. Please try again later." });
  }
});

// ======================= FORGOT PASSWORD ========================

app.get("/forgot-password", (req, res) => {
  const role = req.query.role || "";
  res.render("forgot-password", { role, message: null });
});

app.post("/forgot-password", async (req, res) => {
  const { email, role } = req.body;

  let userModel;
  if (role === "Admin") userModel = Admin;
  else if (role === "Student") userModel = Student;
  else if (role === "Alumni") userModel = Alumni;

  const user = await userModel.findOne({ email });
  if (!user) {
    return res.render("forgot-password", { role, message: "No account found with this email." });
  }

  return res.render("forgot-password", { role, message: "Password reset link sent to your email (demo)." });
});

// ===================== UNIVERSAL DASHBOARD =======================

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const { user, role } = req.session;
  const posts = await Post.find().sort({ createdAt: -1 });
  const jobs = await Job.find().sort({ createdAt: -1 });
  res.render("dashboard", {
    name: req.session.user.name,
    role: req.session.user.role,
    posts,
    jobs
  });
});

// Middleware to protect dashboard
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.role) {
    return next();
  }
  res.redirect("/login");
}

// =========================== POST FUNCTIONALITY ===============================

app.post("/post", isAuthenticated, upload.single("image"), async (req, res) => {
  const { content } = req.body;
  const { user, role } = req.session;
  const image = req.file ? "/uploads/" + req.file.filename : null;

  const post = new Post({
    content,
    image,
    createdBy: user._id,
    role
  });

  await post.save();
  res.redirect("/dashboard");
});

// =========================== SERVER ===============================
http.listen(3000, () => console.log("Server running on http://localhost:3000"));

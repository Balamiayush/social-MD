const cookieParser = require("cookie-parser");
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const app = express();

const User = require("./models/user");
const Post = require("./models/post");

const port = 3000;

// Middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

// Routes

// Home route
app.get("/", (req, res) => {
  res.render("index");
});

// Login route
app.get("/login", (req, res) => {
  res.render("login");
});

// Register route
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).send("User already exists");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ email: user.email, userid: user._id }, "ayush");
    res.cookie("token", token);
    res.status(201).send("User registered successfully");
  } catch (err) {
    res.status(500).send("Error registering user");
  }
});

// Login POST route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send("Incorrect password");

    const token = jwt.sign({ email: user.email, userid: user._id }, "ayush");
    res.cookie("token", token);
    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error logging in");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const data = jwt.verify(token, "ayush");
    req.user = data;
    next();
  } catch (err) {
    res.status(401).send("Invalid token");
  }
}

// Profile route


// Post creation route
app.post("/post", isLoggedIn, async (req, res) => {
  try {
    const { postContent } = req.body;
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).send("User not found");

    const post = new Post({ content: postContent, user: user._id });
    await post.save();

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error creating post");
  }
});

// Like/unlike route
app.get("/like/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    const likeIndex = post.likes.indexOf(req.user.userid);
    if (likeIndex === -1) {
      post.likes.push(req.user.userid);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error toggling like");
  }
});

// Edit post route
app.get("/edit/:id", isLoggedIn, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    res.render("edit", { post });
  } catch (err) {
    res.status(500).send("Error fetching post for editing");
  }
});

// Update post route
app.post("/update/:id", isLoggedIn, async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, { content: req.body.content });
    res.redirect("/profile");
  } catch (err) {
    res.status(500).send("Error updating post");
  }
});

// Image upload routes
app.get("/uploadImg", (req, res) => {
  res.render("uploadImg");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).populate(
      "posts"
    );
    if (!user) return res.status(404).send("User not found");

    const posts = await Post.find({ user: user._id });
    res.render("profile", { user, posts });
  } catch (err) {
    res.status(500).send("Error fetching profile");
  }
});
app.post('/upload',isLoggedIn,upload.single("image"),async(req,res,next)=>{
  let user = await User.findOne({email:req.user.email})
  user.imageUrl = req.file.filename
  await user.save()
  res.redirect('/profile')
})
// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

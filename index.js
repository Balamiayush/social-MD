const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const User = require("./models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Post = require("./models/post");
app.set("view engine", "ejs");
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", async (req, res) => {
  res.render("login");
});

// Protecting post route with isLoggedIn middleware
app.get("/post", isLoggedIn, (req, res) => {
  res.render("login", { user: req.user });
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).send("User already exists");
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return res.status(500).send("Error generating salt");
    }
    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) {
        return res.status(500).send("Error hashing password");
      }
      let user = await User.create({
        name,
        email,
        password: hash,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "ayush");
      res.cookie("token", token);
      res.status(201).send("User registered successfully");
    });
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User not found");
  }
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (isMatch) {
      // Generate JWT token and store it in a cookie
      let token = jwt.sign({ email: email, userid: user._id }, "ayush");
      res.cookie("token", token);
      return res.redirect("/profile");
    } else {
      return res.status(401).send("Incorrect password");
    }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.send("You must be logged in");
  try {
    let data = jwt.verify(token, "ayush");
    req.user = data;
    next();
  } catch (err) {
    return res.send("Invalid token");
  }
}

app.get("/profile", isLoggedIn, async (req, res) => {
  let user = await User.findOne({ email: req.user.email });
  res.render("profile", { user: user });
  // Get user's posts
  let {content} = req.body;
  let post = await Post.find({ user: user._id,content });
  user.posts.push(post._id);
  await user.save();
  res.render("profile", { user: user, posts: post });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

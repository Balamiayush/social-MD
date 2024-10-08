const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const path = require("path");
const User = require("./models/user");
const PostModel = require("./models/user");

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

app.get("/login", (req, res) => {
  res.render("login");
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
  if (!token) return res.redirect("/login");
  try {
    let data = jwt.verify(token, "ayush");
    req.user = data;
    next();
  } catch (err) {
    return res.send("Invalid token");
  }
}

app.get("/profile", isLoggedIn, async (req, res) => {
  try {
    let user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Get the user's posts
    let posts = await Post.find({ user: user._id });
    user.populate("posts", { user });

    res.render("profile", { user: user, posts: posts });
  } catch (err) {
    res.status(500).send("Error fetching profile");
  }
});
app.post("/post", isLoggedIn, async (req, res) => {
  try {
    const { postContent } = req.body;
    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Create a new post
    const post = await Post.create({
      content: postContent,
      user: user._id,
    });

    // Optionally, add the post to the user's posts array
    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).send("Server error");
  }
});
app.get("/like/:id", isLoggedIn, async (req, res) => {
  try {
    let post = await Post.findOne({ _id: req.params.id }).populate("user");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    // Toggle like/unlike
    if (post.likes.indexOf(req.user.userid) === -1) {
      // Like the post
      post.likes.push(req.user.userid);
    } else {
      // Unlike the post
      post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect("/profile");
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).send("Server error");
  }
});
app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post = await Post.findOne({ _id: req.params.id }).populate("user");
  res.render("edit",{post:post});
});
app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post = await Post.findOneAndUpdate({ _id: req.params.id },{content:req.body.content});
  res.redirect("/profile");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

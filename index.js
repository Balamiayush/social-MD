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

app.get('/profile',isLoggedIn,(req,res)=>{
  res.render('login',{user:req.user});  
})
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
  // res.status(201).send("User registered successfully");
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send("User not found");
  }
  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (isMatch) {
      return res.status(400).send("you can login");
    } else {
      return res.render("login");
    }
  });
});
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});
function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") return res.send("you must be logged in");
  else {
    let data = jwt.verify(req.cookies.token, "ayush");
    req.User = data
  }
  next();
}

app.listen(port, () => {
  console.log(`Server is running on port `);
});

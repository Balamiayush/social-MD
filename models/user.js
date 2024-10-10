const mongoose = require("mongoose");
let url =
  "mongodb+srv://aryanbalami54:socialMDA12345@ayush123.ldoy7.mongodb.net/?retryWrites=true&w=majority&appName=Ayush123";
mongoose
  .connect(url)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

const userSchema = new mongoose.Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  imageUrl: {
    type: String,
    default: "default.jpg",
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;

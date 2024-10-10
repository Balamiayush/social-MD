const mongoose = require("mongoose");
const postSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    content:String,
    date:{
        type:Date,
        default:Date.now
    },
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User' 
        }
    ]
},{timestamps:true})

const Post = mongoose.model("Post",postSchema);

module.exports = Post;


const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Post title is required"],
            minlength: [3, "Title must be at least 3 characters long"],
            trim: true,
        },
        excerpt: {
            type: String,
            trim: true,
            default: "",
        },
        content: {
            type: String,
            required: [true, "Post content is required"],
            trim: true,
        },
        category: {
            type: String,
            trim: true,
            default: "General",
        },
        status: {
            type: String,
            enum: ["Draft", "Published", "Scheduled"],
            default: "Draft",
        },
        liked: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        image: {
            url: {
                type: String,
                required: [true, "Post image URL is required"],
            },
            public_id: {
                type: String,
            },
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);

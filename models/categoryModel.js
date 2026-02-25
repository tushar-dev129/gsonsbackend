const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Category Name"],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        required: [true, "Please Enter Category Slug"],
        unique: true,
        trim: true,
        lowercase: true,
    },
    description: {
        type: String,
        trim: true,
    },
    image: {
        url: {
            type: String,
            required: true,
        },
        publicUrl: {
            type: String,
            required: true,
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Category", categorySchema);

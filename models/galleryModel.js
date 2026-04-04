const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: [true, "Image URL is required"],
            trim: true,
        },
        public_id: {
            type: String,
            required: [true, "Public ID is required"],
            trim: true,
        },
        folder: {
            type: mongoose.Schema.ObjectId,
            ref: "GalleryFolder",
            required: [true, "Folder reference is required"],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Gallery", GallerySchema);

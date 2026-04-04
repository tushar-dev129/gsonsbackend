const mongoose = require('mongoose');

const GalleryFolderSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Folder name is required"],
            unique: true,
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("GalleryFolder", GalleryFolderSchema);

const GalleryFolder = require("../models/galleryFolderModel");
const Gallery = require("../models/galleryModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");

// Create Folder
const createFolder = catchAsyncError(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
        return next(new ErrorHandler("Please provide folder name", 400));
    }

    const folder = await GalleryFolder.create({ name });

    res.status(201).json({
        success: true,
        folder,
    });
});

// Get All Folders
const getAllFolders = catchAsyncError(async (req, res, next) => {
    const folders = await GalleryFolder.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        folders,
    });
});

// Delete Folder (Only if empty)
const deleteFolder = catchAsyncError(async (req, res, next) => {
    const folder = await GalleryFolder.findById(req.params.id);

    if (!folder) {
        return next(new ErrorHandler("Folder not found", 404));
    }

    // Check if folder contains any images
    const imageCount = await Gallery.countDocuments({ folder: req.params.id });

    if (imageCount > 0) {
        return next(new ErrorHandler("Cannot delete non-empty folder. Please delete all images inside it first.", 400));
    }

    await folder.deleteOne();

    res.status(200).json({
        success: true,
        message: "Folder deleted successfully",
    });
});

module.exports = {
    createFolder,
    getAllFolders,
    deleteFolder,
};

const Gallery = require("../models/galleryModel");
const { GalleryUpload, deleteImages } = require("../utils/uploadFiles");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");

// Add Images to Gallery (Admin)
const addGalleryImage = catchAsyncError(async (req, res, next) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return next(new ErrorHandler("Please upload at least one image", 400));
    }

    const galleryItems = [];

    for (const file of files) {
        const result = await GalleryUpload(file.buffer);
        const item = await Gallery.create({
            url: result.secure_url,
            public_id: result.public_id,
        });
        galleryItems.push(item);
    }

    res.status(201).json({
        success: true,
        galleryItems,
        count: galleryItems.length
    });
});

// Get All Gallery Images
const getGalleryImages = catchAsyncError(async (req, res, next) => {
    const images = await Gallery.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        images,
    });
});

// Remove Image from Gallery (Admin)
const removeGalleryImage = catchAsyncError(async (req, res, next) => {
    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
        return next(new ErrorHandler("Image not found", 404));
    }

    // Remove from Cloudinary
    await deleteImages(galleryItem.public_id);

    // Remove from DB
    await galleryItem.deleteOne();

    res.status(200).json({
        success: true,
        message: "Image removed from gallery",
    });
});

module.exports = {
    addGalleryImage,
    getGalleryImages,
    removeGalleryImage,
};

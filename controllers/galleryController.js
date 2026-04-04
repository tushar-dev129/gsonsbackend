const Gallery = require("../models/galleryModel");
const { GalleryUpload, deleteImages } = require("../utils/uploadFiles");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");

// Add Images to Gallery (Admin)
const addGalleryImage = catchAsyncError(async (req, res, next) => {
    const files = req.files;
    const { folderId } = req.body;

    if (!folderId) {
        return next(new ErrorHandler("Please provide folder ID", 400));
    }

    if (!files || files.length === 0) {
        return next(new ErrorHandler("Please upload at least one image", 400));
    }

    const galleryItems = [];

    for (const file of files) {
        const result = await GalleryUpload(file.buffer);
        const item = await Gallery.create({
            url: result.secure_url,
            public_id: result.public_id,
            folder: folderId,
        });
        galleryItems.push(item);
    }

    res.status(201).json({
        success: true,
        galleryItems,
        count: galleryItems.length
    });
});

// Get Gallery Images (Filterable by folder)
const getGalleryImages = catchAsyncError(async (req, res, next) => {
    const { folderId } = req.query;
    
    let query = {};
    if (folderId) {
        query.folder = folderId;
    }

    const images = await Gallery.find(query).sort({ createdAt: -1 });

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

// Bulk Delete Images (Admin)
const bulkDeleteImages = catchAsyncError(async (req, res, next) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler("Please provide image IDs to delete", 400));
    }

    const images = await Gallery.find({ _id: { $in: ids } });

    if (images.length === 0) {
        return next(new ErrorHandler("No images found for the provided IDs", 404));
    }

    // Extract public IDs for Cloudinary cleanup
    const publicIds = images.map(img => img.public_id);

    // Delete from Cloudinary
    for (const publicId of publicIds) {
        await deleteImages(publicId);
    }

    // Delete from DB
    await Gallery.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
        success: true,
        message: `${images.length} images deleted successfully`,
    });
});

module.exports = {
    addGalleryImage,
    getGalleryImages,
    removeGalleryImage,
    bulkDeleteImages,
};

const GalleryFolder = require("../models/galleryFolderModel");
const Gallery = require("../models/galleryModel");
const AdmZip = require("adm-zip");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");

// Create Folder
const createFolder = catchAsyncError(async (req, res, next) => {
    const { name } = req.body;

    if (!name) {
        return next(new ErrorHandler("Please provide folder name", 400));
    }

    const regexName = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");
    const existingFolder = await GalleryFolder.findOne({ name: regexName });

    if (existingFolder) {
        return next(new ErrorHandler("Folder with this name already exists", 400));
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

// Export All Folders as ZIP
const exportAllFolders = catchAsyncError(async (req, res, next) => {
    const folders = await GalleryFolder.find();
    const images = await Gallery.find().populate("folder");

    const zip = new AdmZip();

    // Helper to download image
    const downloadImage = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        } catch (error) {
            console.error(`Error downloading ${url}:`, error);
            return null;
        }
    };

    // Process in chunks of 10 to avoid overloading
    const CHUNK_SIZE = 10;
    for (let i = 0; i < images.length; i += CHUNK_SIZE) {
        const chunk = images.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (img) => {
            const folderName = img.folder?.name || "Unsorted";
            const fileName = img.public_id.split('/').pop() || `image_${img._id}`;
            const extension = img.url.split('.').pop() || 'jpg';
            
            const buffer = await downloadImage(img.url);
            if (buffer) {
                zip.addFile(`${folderName}/${fileName}.${extension}`, buffer);
            }
        }));
    }

    const zipBuffer = zip.toBuffer();

    res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="gsons_gallery_export.zip"',
        "Content-Length": zipBuffer.length,
    });

    res.send(zipBuffer);
});

module.exports = {
    createFolder,
    getAllFolders,
    deleteFolder,
    exportAllFolders,
};

const Category = require("../models/categoryModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const { CategoryUpload, deleteImages } = require("../utils/uploadFiles");

// Create Category (Admin)
exports.createCategory = catchAsyncError(async (req, res, next) => {
    const { name, slug, description, isActive } = req.body;
    const file = req.file;

    if (!file) {
        return next(new ErrorHandler("Category image is required", 400));
    }

    const result = await CategoryUpload(file.buffer);

    const category = await Category.create({
        name,
        slug,
        description,
        isActive: isActive === 'false' ? false : true,
        image: {
            url: result.secure_url,
            publicUrl: result.public_id,
        },
    });

    res.status(201).json({
        success: true,
        category,
    });
});

// Update Category (Admin)
exports.updateCategory = catchAsyncError(async (req, res, next) => {
    const { name, slug, description, isActive } = req.body;
    const file = req.file;

    const category = await Category.findById(req.params.id);
    if (!category) {
        return next(new ErrorHandler("Category not found", 404));
    }

    let imageData = category.image;

    if (file) {
        // Delete old image
        if (category.image && category.image.publicUrl) {
            await deleteImages(category.image.publicUrl);
        }
        const result = await CategoryUpload(file.buffer);
        imageData = {
            url: result.secure_url,
            publicUrl: result.public_id,
        };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name,
            slug,
            description,
            isActive: isActive !== undefined ? (isActive === 'false' ? false : true) : category.isActive,
            image: imageData,
        },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        category: updatedCategory,
    });
});

// Get All Categories (Public)
exports.getAllCategories = catchAsyncError(async (req, res, next) => {
    // Admin can see inactive, public can only see active
    const query = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    const categories = await Category.find(query);

    res.status(200).json({
        success: true,
        categories,
    });
});

// Delete Category (Admin)
exports.deleteCategory = catchAsyncError(async (req, res, next) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return next(new ErrorHandler("Category not found", 404));
    }

    // Delete image from Cloudinary
    if (category.image && category.image.publicUrl) {
        await deleteImages(category.image.publicUrl);
    }

    await category.deleteOne();

    res.status(200).json({
        success: true,
        message: "Category Deleted Successfully",
    });
});

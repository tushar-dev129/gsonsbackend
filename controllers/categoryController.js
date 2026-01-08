const Category = require("../models/categoryModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");

// Create Category
exports.createCategory = catchAsyncError(async (req, res, next) => {
    const { name } = req.body;

    const category = await Category.create({ name });

    res.status(201).json({
        success: true,
        category,
    });
});

// Get All Categories
exports.getAllCategories = catchAsyncError(async (req, res, next) => {
    const categories = await Category.find();

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

    await category.deleteOne();

    res.status(200).json({
        success: true,
        message: "Category Deleted Successfully",
    });
});

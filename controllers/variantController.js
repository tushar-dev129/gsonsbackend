const variantModel = require("../models/variantModel");
const productModel = require("../models/productModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const { deleteImages, VariantUpload } = require("../utils/uploadFiles");

// Add Variant (Admin)
exports.addVariant = catchAsyncError(async (req, res, next) => {
    const { productId, sku, price, stock, attributes, isActive } = req.body;
    const files = req.files;

    if (!productId) {
        return next(new ErrorHandler("Product ID is required", 400));
    }

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    // SKU Unique validation (already handled by index, but good to check)
    const existingVariant = await variantModel.findOne({ sku });
    if (existingVariant) {
        return next(new ErrorHandler("SKU already exists", 400));
    }

    const uploadedFiles = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const result = await VariantUpload(file.buffer);
            uploadedFiles.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });
        }
    }

    // Parse attributes if it's a string (from form-data)
    let parsedAttributes = attributes;
    if (typeof attributes === 'string') {
        try {
            parsedAttributes = JSON.parse(attributes);
        } catch (e) {
            // If not JSON, leave as is or handle accordingly
        }
    }

    const variant = await variantModel.create({
        productId,
        sku,
        price,
        stock,
        attributes: parsedAttributes,
        images: uploadedFiles,
        isActive: isActive === 'false' ? false : true,
    });

    res.status(201).json({
        success: true,
        variant,
    });
});

// Update Variant (Admin)
exports.updateVariant = catchAsyncError(async (req, res, next) => {
    const variantId = req.params.id;
    const { sku, price, stock, attributes, isActive } = req.body;
    const files = req.files;

    const variant = await variantModel.findById(variantId);
    if (!variant) {
        return next(new ErrorHandler("Variant not found", 404));
    }

    // SKU uniqueness check if changed
    if (sku && sku !== variant.sku) {
        const existingVariant = await variantModel.findOne({ sku });
        if (existingVariant) {
            return next(new ErrorHandler("SKU already exists", 400));
        }
    }

    let updatedData = { sku, price, stock };
    if (isActive !== undefined) {
        updatedData.isActive = isActive === 'false' ? false : true;
    }

    if (attributes) {
        try {
            updatedData.attributes = typeof attributes === 'string' ? JSON.parse(attributes) : attributes;
        } catch (e) { }
    }

    if (files && files.length > 0) {
        // Delete old images
        if (variant.images && variant.images.length > 0) {
            for (const file of variant.images) {
                if (file.publicUrl) {
                    await deleteImages(file.publicUrl);
                }
            }
        }

        const uploadedFiles = [];
        for (const file of files) {
            const result = await VariantUpload(file.buffer);
            uploadedFiles.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });
        }
        updatedData.images = uploadedFiles;
    }

    const updatedVariant = await variantModel.findByIdAndUpdate(
        variantId,
        updatedData,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        variant: updatedVariant,
    });
});

// Delete Variant (Admin)
exports.deleteVariant = catchAsyncError(async (req, res, next) => {
    const variant = await variantModel.findById(req.params.id);

    if (!variant) {
        return next(new ErrorHandler("Variant not found", 404));
    }

    if (variant.images && variant.images.length > 0) {
        for (const file of variant.images) {
            if (file.publicUrl) {
                await deleteImages(file.publicUrl);
            }
        }
    }

    await variant.deleteOne();

    res.status(200).json({
        success: true,
        message: "Variant Deleted Successfully",
    });
});

// Get Variant by SKU (Public)
exports.getVariantBySku = catchAsyncError(async (req, res, next) => {
    const variant = await variantModel.findOne({ sku: req.params.sku }).populate('productId');
    if (!variant) {
        return next(new ErrorHandler("Variant not found", 404));
    }

    res.status(200).json({
        success: true,
        variant,
    });
});

// Get Variant by ID (Admin/Public)
exports.getVariantById = catchAsyncError(async (req, res, next) => {
    const variant = await variantModel.findById(req.params.id).populate('productId');
    if (!variant) {
        return next(new ErrorHandler("Variant not found", 404));
    }

    res.status(200).json({
        success: true,
        variant,
    });
});

// Get All Variants (Public)
exports.getAllVariants = catchAsyncError(async (req, res, next) => {
    const limit = parseInt(req.query.limit) || 12;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const variantsCount = await variantModel.countDocuments({ isActive: true });
    const variants = await variantModel.find({ isActive: true })
        .populate('productId')
        .limit(limit)
        .skip(skip);

    res.status(200).json({
        success: true,
        count: variants.length,
        total: variantsCount,
        data: variants,
    });
});

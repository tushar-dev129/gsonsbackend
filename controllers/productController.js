const productModel = require("../models/productModel");
const { deleteImages, QuestionUpload } = require("../utils/uploadFiles");

const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apifeatures");

const createProduct = catchAsyncError(async (req, res, next) => {
    const data = req.body;
    const files = req.files;
    const userId = req.user._id;

    if (!files || files.length === 0) {
        return next(new ErrorHandler("No product images uploaded", 400));
    }

    if (files.length > 5) {
        return next(new ErrorHandler("You can only upload up to 5 images", 400));
    }

    const uploadedFiles = [];
    for (const file of files) {
        const result = await QuestionUpload(file.buffer); // Using existing util
        uploadedFiles.push({
            url: result.secure_url,
            public_id: result.public_id,
        });
    }

    const product = await productModel.create({
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        rating: data.rating,
        reviews: data.reviews,
        isSale: data.isSale,
        images: uploadedFiles,
        created_by: userId,
    });

    return res.status(200).json({ success: true, product });
});

const updateProduct = catchAsyncError(async (req, res, next) => {
    const data = req.body || {};
    const productId = req.params.id;
    const files = req.files;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Ownership check - allow admin or creator
    if (product.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to edit this product", 403));
    }

    // Clean up boolean/number fields from form data if necessary (often multipart form data sends strings)
    // Assuming body parser handles it or we parse manually if strictly needed. Mongoose does casting mostly.

    if (files && files.length > 0) {

        if (files.length > 5) {
            return next(new ErrorHandler("You can only upload up to 5 images", 400));
        }

        // Delete old images
        if (product.images && product.images.length > 0) {
            for (const file of product.images) {
                if (file.public_id) {
                    await deleteImages(file.public_id);
                }
            }
        }

        const uploadedFiles = [];
        for (const file of files) {
            const result = await QuestionUpload(file.buffer);
            uploadedFiles.push({
                url: result.secure_url,
                public_id: result.public_id,
            });
        }

        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            {
                ...data,
                images: uploadedFiles,
            },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, updatedProduct });
    } else {
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { ...data },
            { new: true, runValidators: true }
        );
        return res.status(200).json({ success: true, updatedProduct });
    }
});

const deleteProduct = catchAsyncError(async (req, res, next) => {
    const productId = req.params.id;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Ownership check
    if (product.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to delete this product", 403));
    }

    if (product.images && product.images.length > 0) {
        for (const file of product.images) {
            if (file.public_id) {
                await deleteImages(file.public_id);
            }
        }
    }

    await product.deleteOne();

    return res.status(200).json({ success: true, message: "Product has been deleted" });
});

const getAllProducts = catchAsyncError(async (req, res, next) => {
    const resultPerPage = parseInt(req.query.limit) || 10;
    const productsCount = await productModel.countDocuments();

    const apiFeature = new ApiFeatures(productModel.find(), req.query)
        .search("name")
        .filter();

    let products = await apiFeature.query;
    let filteredProductsCount = products.length;

    apiFeature.pagination(resultPerPage);

    if (req.query.sort === "new") {
        apiFeature.query = apiFeature.query.sort({ createdAt: -1 });
    } else if (req.query.sort === "old") {
        apiFeature.query = apiFeature.query.sort({ createdAt: 1 });
    }

    products = await apiFeature.query.clone();

    res.status(200).json({
        success: true,
        total: productsCount,
        filteredCount: filteredProductsCount,
        page: parseInt(req.query.page) || 1,
        totalPages: Math.ceil(filteredProductsCount / resultPerPage),
        count: products.length,
        data: products,
    });
});

const likeProduct = catchAsyncError(async (req, res, next) => {
    const userId = req.user._id;
    const productId = req.params.id;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    let updated;
    if (product.liked.includes(userId)) {
        updated = await productModel.findByIdAndUpdate(
            productId,
            { $pull: { liked: userId } },
            { new: true }
        );
    } else {
        updated = await productModel.findByIdAndUpdate(
            productId,
            { $push: { liked: userId } },
            { new: true }
        );
    }

    res.status(200).json({ success: true, updated });
});

const getProductById = catchAsyncError(async (req, res, next) => {
    const product = await productModel.findById(req.params.id);
    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }
    res.status(200).json({ success: true, data: product });
});

module.exports = {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    likeProduct,
    getProductById,
};

const productModel = require("../models/productModel");
const variantModel = require("../models/variantModel");
const { deleteImages, ProductUpload } = require("../utils/uploadFiles");

const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apifeatures");

// Create Product (Admin)
const createProduct = catchAsyncError(async (req, res, next) => {
    const { name, slug, categoryId, description, isActive } = req.body;
    const files = req.files;
    const userId = req.user._id;

    if (!files || files.length === 0) {
        return next(new ErrorHandler("No product images uploaded", 400));
    }

    const uploadedFiles = [];
    for (const file of files) {
        const result = await ProductUpload(file.buffer);
        uploadedFiles.push({
            url: result.secure_url,
            publicUrl: result.public_id,
        });
    }

    const product = await productModel.create({
        name,
        slug,
        categoryId,
        description,
        images: uploadedFiles,
        isActive: isActive === 'false' ? false : true,
        created_by: userId,
    });

    return res.status(201).json({ success: true, product });
});

// Update Product (Admin)
const updateProduct = catchAsyncError(async (req, res, next) => {
    const data = req.body || {};
    const productId = req.params.id;
    const files = req.files;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Ownership check
    if (product.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to edit this product", 403));
    }

    let updatedData = { ...data };
    if (data.isActive !== undefined) {
        updatedData.isActive = data.isActive === 'false' ? false : true;
    }

    if (files && files.length > 0) {
        // Delete old images
        if (product.images && product.images.length > 0) {
            for (const file of product.images) {
                if (file.publicUrl) {
                    await deleteImages(file.publicUrl);
                }
            }
        }

        const uploadedFiles = [];
        for (const file of files) {
            const result = await ProductUpload(file.buffer);
            uploadedFiles.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });
        }
        updatedData.images = uploadedFiles;
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
        productId,
        updatedData,
        { new: true, runValidators: true }
    );

    return res.status(200).json({ success: true, product: updatedProduct });
});

// Delete Product (Admin)
const deleteProduct = catchAsyncError(async (req, res, next) => {
    const productId = req.params.id;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Check if variants exist
    const variantsCount = await variantModel.countDocuments({ productId });
    if (variantsCount > 0) {
        return next(new ErrorHandler("Cannot delete product with existing variants. Delete variants first.", 400));
    }

    // Ownership check
    if (product.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to delete this product", 403));
    }

    if (product.images && product.images.length > 0) {
        for (const file of product.images) {
            if (file.publicUrl) {
                await deleteImages(file.publicUrl);
            }
        }
    }

    await product.deleteOne();

    return res.status(200).json({ success: true, message: "Product has been deleted" });
});

// Get All Products (Public)
const getAllProducts = catchAsyncError(async (req, res, next) => {
    const resultPerPage = parseInt(req.query.limit) || 12;

    // Basic query for active products
    let query = { isActive: true };
    if (req.user && req.user.role === 'admin') {
        query = {}; // Admin sees all
    }

    // Filter by category if provided
    if (req.query.categoryId) {
        query.categoryId = req.query.categoryId;
    }

    // Filter by attributes (dynamic)
    const attributeFilters = {};
    Object.keys(req.query).forEach(key => {
        if (!['categoryId', 'page', 'limit', 'sort', 'name', 'q', 'minPrice', 'maxPrice'].includes(key)) {
            attributeFilters[`attributes.${key}`] = req.query[key];
        }
    });

    if (Object.keys(attributeFilters).length > 0) {
        const matchingVariants = await variantModel.find(attributeFilters).select('productId');
        const productIds = matchingVariants.map(v => v.productId);
        query._id = query._id ? { $and: [query._id, { $in: productIds }] } : { $in: productIds };
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
        const priceQuery = {};
        if (req.query.minPrice) priceQuery.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) priceQuery.$lte = Number(req.query.maxPrice);

        const matchingVariants = await variantModel.find({ price: priceQuery }).select('productId');
        const productIds = matchingVariants.map(v => v.productId);
        query._id = query._id ? { $and: [query._id, { $in: productIds }] } : { $in: productIds };
    }

    const productsCount = await productModel.countDocuments(query);

    const apiFeature = new ApiFeatures(productModel.find(query).populate('categoryId').populate('variants'), req.query)
        .search("name");

    let products = await apiFeature.query;
    let filteredProductsCount = products.length;

    apiFeature.pagination(resultPerPage);

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

const getProductById = catchAsyncError(async (req, res, next) => {
    let product = await productModel.findById(req.params.id).populate('categoryId');

    // If not found, check if it's a variant ID
    if (!product) {
        const variant = await variantModel.findById(req.params.id);
        if (variant) {
            product = await productModel.findById(variant.productId).populate('categoryId');
        }
    }

    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    // Get variants for this product
    const variants = await variantModel.find({ productId: product._id });

    res.status(200).json({
        success: true,
        data: {
            ...product._doc,
            variants
        }
    });
});

const getProductBySlug = catchAsyncError(async (req, res, next) => {
    let product = await productModel.findOne({ slug: req.params.slug }).populate('categoryId');

    // If not found, check if it's a variant SKU (often used as slug-like identifier)
    if (!product) {
        const variant = await variantModel.findOne({ sku: req.params.slug });
        if (variant) {
            product = await productModel.findById(variant.productId).populate('categoryId');
        }
    }

    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    // Get variants for this product
    const variants = await variantModel.find({ productId: product._id, isActive: true });

    res.status(200).json({
        success: true,
        data: {
            ...product._doc,
            variants
        }
    });
});

const searchProducts = catchAsyncError(async (req, res, next) => {
    const { q } = req.query;

    if (!q) {
        return next(new ErrorHandler("Search query is required", 400));
    }

    // 1. Exact SKU match
    let variants = await variantModel.find({ sku: q, isActive: true }).populate('productId');
    if (variants.length > 0) {
        return res.status(200).json({
            success: true,
            results: variants.map(v => ({
                product: v.productId,
                matchedVariant: v
            }))
        });
    }

    // 2. Partial SKU match
    variants = await variantModel.find({ sku: { $regex: q, $options: 'i' }, isActive: true }).populate('productId');
    if (variants.length > 0) {
        return res.status(200).json({
            success: true,
            results: variants.map(v => ({
                product: v.productId,
                matchedVariant: v
            }))
        });
    }

    // 3. Product name match
    const products = await productModel.find({ name: { $regex: q, $options: 'i' }, isActive: true }).populate('categoryId').populate('variants');
    if (products.length > 0) {
        const results = [];
        for (const product of products) {
            const variant = await variantModel.findOne({ productId: product._id, isActive: true });
            results.push({
                product,
                matchedVariant: variant
            });
        }
        return res.status(200).json({
            success: true,
            results
        });
    }

    // 4. Attribute match
    const allVariants = await variantModel.find({ isActive: true }).populate('productId');
    const attrMatchedVariants = allVariants.filter(v => {
        if (!v.attributes) return false;
        const values = Array.from(v.attributes.values());
        return values.some(val => val.toLowerCase().includes(q.toLowerCase()));
    });

    if (attrMatchedVariants.length > 0) {
        return res.status(200).json({
            success: true,
            results: attrMatchedVariants.map(v => ({
                product: v.productId,
                matchedVariant: v
            }))
        });
    }

    res.status(200).json({
        success: true,
        results: []
    });
});

module.exports = {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
    getProductBySlug,
    searchProducts,
};

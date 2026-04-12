const productModel = require("../models/productModel");
const variantModel = require("../models/variantModel");
const categoryModel = require("../models/categoryModel");
const GalleryFolder = require("../models/galleryFolderModel");
const Gallery = require("../models/galleryModel");
const { deleteImages, DynamicCategoryUpload } = require("../utils/uploadFiles");
const { getOrCreateFolder } = require("../utils/folderUtils");

const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apifeatures");

// Create Product (Admin)
const createProduct = catchAsyncError(async (req, res, next) => {
    const { name, slug, categoryId, description, isActive } = req.body;
    const userId = req.user._id;
    const files = req.files;

    let categoryName = "products";
    if (categoryId) {
        const category = await categoryModel.findById(categoryId);
        if (category) {
            categoryName = category.name;
        }
    }

    let folderObj = null;
    if (files && files.length > 0) {
        folderObj = await getOrCreateFolder(categoryName);
        categoryName = folderObj.name;
    }

    let imageList = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const result = await DynamicCategoryUpload(file.buffer, categoryName, file.originalname);
            imageList.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });

            // Sync to Gallery
            await Gallery.create({
                url: result.secure_url,
                public_id: result.public_id,
                folder: folderObj._id,
            });
        }
    }

    // Handle images from gallery
    if (req.body.galleryImages) {
        try {
            const galleryImages = typeof req.body.galleryImages === 'string' 
                ? JSON.parse(req.body.galleryImages) 
                : req.body.galleryImages;
            
            if (Array.isArray(galleryImages)) {
                galleryImages.forEach(img => {
                    imageList.push({
                        url: img.url,
                        publicUrl: img.public_id || img.publicUrl
                    });
                });
            }
        } catch (e) {
            console.error("Error parsing galleryImages:", e);
        }
    }

    const product = await productModel.create({
        name,
        slug,
        categoryId,
        description,
        images: imageList,
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

    let targetCategoryId = data.categoryId || product.categoryId;
    let categoryName = "products";
    if (targetCategoryId) {
        const category = await categoryModel.findById(targetCategoryId);
        if (category) {
            categoryName = category.name;
        }
    }

    let folderObj = null;
    if (files && files.length > 0) {
        folderObj = await getOrCreateFolder(categoryName);
        categoryName = folderObj.name;
    }

    // Handle new images if uploaded
    if (files && files.length > 0) {
        let newImages = [];
        for (const file of files) {
            const result = await DynamicCategoryUpload(file.buffer, categoryName, file.originalname);
            newImages.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });

            // Sync to Gallery
            await Gallery.create({
                url: result.secure_url,
                public_id: result.public_id,
                folder: folderObj._id,
            });
        }
        // Append new images to existing ones (or replace if desired)
        // For GSons, we append to preserve user management
        updatedData.images = [...(product.images || []), ...newImages];
    }

    // Handle images from gallery
    if (req.body.galleryImages) {
        try {
            const galleryImages = typeof req.body.galleryImages === 'string' 
                ? JSON.parse(req.body.galleryImages) 
                : req.body.galleryImages;
            
            if (Array.isArray(galleryImages)) {
                const currentImages = updatedData.images || product.images || [];
                const newGalleryImages = galleryImages.map(img => ({
                    url: img.url,
                    publicUrl: img.public_id || img.publicUrl
                }));
                updatedData.images = [...currentImages, ...newGalleryImages];
            }
        } catch (e) {
            console.error("Error parsing galleryImages:", e);
        }
    }

    // Handle existing images to delete (if passed)
    if (data.imagesToDelete) {
        const idsToDelete = Array.isArray(data.imagesToDelete) 
            ? data.imagesToDelete 
            : [data.imagesToDelete];
        
        // Remove from Cloudinary
        for (const pid of idsToDelete) {
            await deleteImages(pid);
        }

        // Remove from database list (if we haven't overwritten updatedData.images yet)
        const currentImages = updatedData.images || product.images || [];
        updatedData.images = currentImages.filter(img => !idsToDelete.includes(img.publicUrl));
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

    // Delete all variants and their images
    const variants = await variantModel.find({ productId });
    for (const variant of variants) {
        if (variant.images && variant.images.length > 0) {
            for (const file of variant.images) {
                if (file.publicUrl) {
                    await deleteImages(file.publicUrl);
                }
            }
        }
        await variant.deleteOne();
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
    query.$and = [];

    // Filter by category if provided
    if (req.query.categoryId) {
        query.categoryId = req.query.categoryId;
    }

    // Filter by attributes (dynamic)
    const attributeFilters = {};
    Object.keys(req.query).forEach(key => {
        if (!['categoryId', 'page', 'limit', 'sort', 'name', 'keyword', 'q', 'minPrice', 'maxPrice'].includes(key)) {
            attributeFilters[`attributes.${key}`] = req.query[key];
        }
    });

    if (Object.keys(attributeFilters).length > 0) {
        const matchingVariants = await variantModel.find(attributeFilters).select('productId');
        const productIds = matchingVariants.map(v => v.productId);
        query.$and.push({ _id: { $in: productIds } });
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
        const priceQuery = {};
        if (req.query.minPrice) priceQuery.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) priceQuery.$lte = Number(req.query.maxPrice);

        const matchingVariants = await variantModel.find({ price: priceQuery }).select('productId');
        const productIds = matchingVariants.map(v => v.productId);
        query.$and.push({ _id: { $in: productIds } });
    }

    // Filter by keyword (Name, Description, Category Name, SKU, Attributes)
    if (req.query.keyword) {
        const keyword = req.query.keyword;
        
        // 1. Match products by name/description
        const productsByName = await productModel.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ]
        }).select('_id');

        // 2. Match products by category name
        const matchedCategories = await categoryModel.find({
            name: { $regex: keyword, $options: 'i' }
        }).select('_id');
        const productsByCategory = await productModel.find({
            categoryId: { $in: matchedCategories.map(c => c._id) }
        }).select('_id');
        
        // 3. Match products by variant SKU or attributes
        const productsByVariant = await variantModel.find({
            $or: [
                { sku: { $regex: keyword, $options: 'i' } },
                { "attributes.watt": { $regex: keyword, $options: 'i' } },
                { "attributes.color": { $regex: keyword, $options: 'i' } },
                { "attributes.shape": { $regex: keyword, $options: 'i' } },
                { "attributes.cutout": { $regex: keyword, $options: 'i' } }
            ]
        }).select('productId');

        const combinedIds = Array.from(new Set([
            ...productsByName.map(p => p._id.toString()),
            ...productsByCategory.map(p => p._id.toString()),
            ...productsByVariant.map(v => v.productId.toString())
        ]));

        query.$and.push({ _id: { $in: combinedIds } });
    }

    if (query.$and && query.$and.length === 0) {
        delete query.$and;
    }

    const productsCount = await productModel.countDocuments(query);

    const apiFeature = new ApiFeatures(productModel.find(query).populate('categoryId').populate('variants'), req.query);

    let products = await apiFeature.query; // Fetch all matched to allow complex sorting

    // 1. Sort products in memory
    if (req.query.sort) {
        if (req.query.sort === 'price' || req.query.sort === '-price') {
            const order = req.query.sort === '-price' ? -1 : 1;
            products.sort((a, b) => {
                const getMinPrice = (p) => p.variants?.length ? Math.min(...p.variants.map(v => v.price || 0)) : (p.price || 0);
                return (getMinPrice(a) - getMinPrice(b)) * order;
            });
        } else if (req.query.sort === 'name' || req.query.sort === '-name') {
            const order = req.query.sort === '-name' ? -1 : 1;
            products.sort((a, b) => {
                const nameA = a.name || "";
                const nameB = b.name || "";
                return nameA.localeCompare(nameB) * order;
            });
        } else if (req.query.sort === 'createdAt' || req.query.sort === '-createdAt') {
            const order = req.query.sort === '-createdAt' ? -1 : 1;
            products.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return (dateA - dateB) * order;
            });
        } else if (req.query.sort === 'updatedAt' || req.query.sort === '-updatedAt') {
            const order = req.query.sort === '-updatedAt' ? -1 : 1;
            products.sort((a, b) => {
                const dateA = new Date(a.updatedAt).getTime();
                const dateB = new Date(b.updatedAt).getTime();
                return (dateA - dateB) * order;
            });
        }
    } else {
        // Default sort (Newest First)
        products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    let filteredProductsCount = products.length;

    // 2. Manual Pagination
    const currentPage = Number(req.query.page) || 1;
    const skip = resultPerPage * (currentPage - 1);
    const paginatedProducts = products.slice(skip, skip + resultPerPage);

    res.status(200).json({
        success: true,
        total: productsCount,
        filteredCount: filteredProductsCount,
        page: currentPage,
        totalPages: Math.ceil(filteredProductsCount / resultPerPage),
        count: paginatedProducts.length,
        data: paginatedProducts,
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

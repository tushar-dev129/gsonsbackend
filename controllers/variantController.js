const variantModel = require("../models/variantModel");
const productModel = require("../models/productModel");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const { deleteImages, VariantUpload } = require("../utils/uploadFiles");

// Helper to sync product image from first available variant
const syncProductImage = async (productId) => {
    const product = await productModel.findById(productId);
    if (!product) return;

    const variants = await variantModel.find({ productId }).sort({ createdAt: 1 });
    
    // Find first variant with images
    const variantWithImages = variants.find(v => v.images && v.images.length > 0);

    if (variantWithImages) {
        // Use only the first image as the primary product image
        product.images = [variantWithImages.images[0]];
    } else {
        product.images = [];
    }

    await product.save({ validateBeforeSave: false });
};

exports.syncProductImage = syncProductImage;

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

    // Handle images from gallery
    if (req.body.galleryImages) {
        try {
            const galleryImages = typeof req.body.galleryImages === 'string' 
                ? JSON.parse(req.body.galleryImages) 
                : req.body.galleryImages;
            
            if (Array.isArray(galleryImages)) {
                galleryImages.forEach(img => {
                    uploadedFiles.push({
                        url: img.url,
                        publicUrl: img.public_id || img.publicUrl
                    });
                });
            }
        } catch (e) {
            console.error("Error parsing galleryImages:", e);
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

    // Sync product image
    await syncProductImage(productId);

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

    // Handle existing images to delete
    let currentImages = [...(variant.images || [])];
    if (req.body.imagesToDelete) {
        const idsToDelete = Array.isArray(req.body.imagesToDelete) 
            ? req.body.imagesToDelete 
            : [req.body.imagesToDelete];
        
        for (const pid of idsToDelete) {
            if (pid) await deleteImages(pid);
        }
        currentImages = currentImages.filter(img => !idsToDelete.includes(img.publicUrl));
    }

    // Handle new images
    if (files && files.length > 0) {
        const uploadedFiles = [];
        for (const file of files) {
            const result = await VariantUpload(file.buffer);
            uploadedFiles.push({
                url: result.secure_url,
                publicUrl: result.public_id,
            });
        }
        currentImages = [...currentImages, ...uploadedFiles];
    }

    // Handle images from gallery
    if (req.body.galleryImages) {
        try {
            const galleryImages = typeof req.body.galleryImages === 'string' 
                ? JSON.parse(req.body.galleryImages) 
                : req.body.galleryImages;
            
            if (Array.isArray(galleryImages)) {
                const newGalleryImages = galleryImages.map(img => ({
                    url: img.url,
                    publicUrl: img.public_id || img.publicUrl
                }));
                currentImages = [...currentImages, ...newGalleryImages];
            }
        } catch (e) {
            console.error("Error parsing galleryImages:", e);
        }
    }

    updatedData.images = currentImages;

    const updatedVariant = await variantModel.findByIdAndUpdate(
        variantId,
        updatedData,
        { new: true, runValidators: true }
    );

    // Sync product image
    await syncProductImage(updatedVariant.productId);

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

    const productId = variant.productId;
    await variant.deleteOne();

    // Sync product image
    await syncProductImage(productId);

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
    const resultPerPage = parseInt(req.query.limit) || 12;

    let query = { isActive: true };
    if (req.user && req.user.role === 'admin') {
        query = {}; // Admin sees all
    }
    
    query.$and = [];

    // Category and Keyword filters require finding matching products first
    let productIdsFromCategory = null;
    let productIdsFromKeyword = null;

    if (req.query.categoryId) {
        const productsInCat = await productModel.find({ categoryId: req.query.categoryId }).select('_id');
        productIdsFromCategory = productsInCat.map(p => p._id.toString());
    }

    if (req.query.keyword) {
        const keyword = req.query.keyword;
        const productsByName = await productModel.find({
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } }
            ]
        }).select('_id');
        productIdsFromKeyword = productsByName.map(p => p._id.toString());
    }

    // Intersect product IDs if both provided
    let finalProductIds = null;
    if (productIdsFromCategory !== null && productIdsFromKeyword !== null) {
        finalProductIds = productIdsFromCategory.filter(id => productIdsFromKeyword.includes(id));
    } else if (productIdsFromCategory !== null) {
        finalProductIds = productIdsFromCategory;
    }

    let keywordOrCond = null;
    if (req.query.keyword) {
        const keyword = req.query.keyword;
        keywordOrCond = {
            $or: [
                { sku: { $regex: keyword, $options: 'i' } },
                { "attributes.watt": { $regex: keyword, $options: 'i' } },
                { "attributes.color": { $regex: keyword, $options: 'i' } },
                { "attributes.shape": { $regex: keyword, $options: 'i' } },
                { "attributes.cutout": { $regex: keyword, $options: 'i' } }
            ]
        };
        if (productIdsFromKeyword && productIdsFromKeyword.length > 0) {
            keywordOrCond.$or.push({ productId: { $in: productIdsFromKeyword } });
        }
        
        // If category filter is active, we enforce that category
        if (finalProductIds !== null) {
             query.$and.push({ productId: { $in: finalProductIds } }); 
             query.$and.push(keywordOrCond);
        } else {
             query.$and.push(keywordOrCond);
        }
    } else if (finalProductIds !== null) {
         query.$and.push({ productId: { $in: finalProductIds } });
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
        const priceQuery = {};
        if (req.query.minPrice) priceQuery.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) priceQuery.$lte = Number(req.query.maxPrice);
        query.$and.push({ price: priceQuery });
    }

    // Filter by attributes (dynamic)
    const attributeFilters = {};
    Object.keys(req.query).forEach(key => {
        if (!['categoryId', 'page', 'limit', 'sort', 'name', 'keyword', 'q', 'minPrice', 'maxPrice'].includes(key)) {
            attributeFilters[`attributes.${key}`] = req.query[key];
        }
    });

    if (Object.keys(attributeFilters).length > 0) {
        query.$and.push(attributeFilters);
    }
    
    if (query.$and && query.$and.length === 0) {
        delete query.$and;
    }

    const variantsCount = await variantModel.countDocuments(query);
    
    // Fetch all matched to allow complex sorting
    let variants = await variantModel.find(query).populate({
        path: 'productId',
        populate: {
            path: 'categoryId'
        }
    });

    // 1. Sort variants in memory
    if (req.query.sort) {
        if (req.query.sort === 'price' || req.query.sort === '-price') {
            const order = req.query.sort === '-price' ? -1 : 1;
            variants.sort((a, b) => (a.price - b.price) * order);
        } else if (req.query.sort === 'name' || req.query.sort === '-name') {
            const order = req.query.sort === '-name' ? -1 : 1;
            variants.sort((a, b) => {
                const nameA = a.productId?.name || "";
                const nameB = b.productId?.name || "";
                return nameA.localeCompare(nameB) * order;
            });
        } else if (req.query.sort === 'createdAt' || req.query.sort === '-createdAt') {
            const order = req.query.sort === '-createdAt' ? -1 : 1;
            variants.sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return (dateA - dateB) * order;
            });
        }
    } else {
        // Default sort (Newest First)
        variants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    let filteredCount = variants.length;

    // 2. Manual Pagination
    const currentPage = Number(req.query.page) || 1;
    const skip = resultPerPage * (currentPage - 1);
    const paginatedVariants = variants.slice(skip, skip + resultPerPage);

    res.status(200).json({
        success: true,
        total: variantsCount,
        filteredCount: filteredCount,
        page: currentPage,
        totalPages: Math.ceil(filteredCount / resultPerPage),
        count: paginatedVariants.length,
        data: paginatedVariants,
    });
});

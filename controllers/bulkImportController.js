const AdmZip = require('adm-zip');
const productModel = require('../models/productModel');
const variantModel = require('../models/variantModel');
const { BulkUpload } = require('../utils/uploadFiles');
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const csv = require('csv-parser');
const { Readable } = require('stream');

const parseCSV = (buffer) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const stream = Readable.from(buffer);
        stream.pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

const parseJSON = (buffer) => {
    try {
        return JSON.parse(buffer.toString());
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
};

const categoryModel = require('../models/categoryModel');

exports.bulkImport = catchAsyncError(async (req, res, next) => {
    const files = req.files;
    const userId = req.user._id;

    if (!files || !files.products_data) {
        return next(new ErrorHandler("Please upload products data", 400));
    }

    const imagesZip = files.images_zip ? files.images_zip[0].buffer : null;
    const productsDataBuffer = files.products_data[0].buffer;
    const variantsDataBuffer = files.variants_data ? files.variants_data[0].buffer : null;

    // 1. Extract Images from ZIP (if provided)
    const imageMap = {}; // filename -> buffer
    if (imagesZip) {
        const zip = new AdmZip(imagesZip);
        const zipEntries = zip.getEntries();

        zipEntries.forEach((entry) => {
            if (!entry.isDirectory) {
                imageMap[entry.name] = entry.getData();
            }
        });
    }

    // 2. Parse Products Data
    let productsJson = [];
    if (files.products_data[0].originalname.endsWith('.csv')) {
        productsJson = await parseCSV(productsDataBuffer);
    } else {
        productsJson = parseJSON(productsDataBuffer);
    }

    // 3. Parse Variants Data
    let variantsJson = [];
    if (variantsDataBuffer) {
        if (files.variants_data[0].originalname.endsWith('.csv')) {
            variantsJson = await parseCSV(variantsDataBuffer);
        } else {
            variantsJson = parseJSON(variantsDataBuffer);
        }
    }

    const summary = {
        productsCreated: 0,
        variantsCreated: 0,
        errors: []
    };

    const productMap = {}; // sku/name -> productId

    // 4. Process Products
    for (const p of productsJson) {
        try {
            // Find matched images in imageMap
            const matchedImages = [];
            const imageNames = Array.isArray(p.images) ? p.images : (p.images ? p.images.split(';') : []);

            const imageBuffers = [];
            for (const name of imageNames) {
                const trimmedName = name.trim();
                if (imageMap[trimmedName]) {
                    imageBuffers.push({ buffer: imageMap[trimmedName], name: trimmedName });
                }
            }

            // Upload to Cloudinary
            const uploadedImages = imageBuffers.length > 0 ? await BulkUpload(imageBuffers, "products") : [];

            // Category Lookup Logic
            let categoryId = p.categoryId || p.category_id;
            if (!categoryId && p.categoryname) {
                const category = await categoryModel.findOne({ name: p.categoryname.trim() });
                if (category) {
                    categoryId = category._id;
                } else {
                    throw new Error(`Category not found: ${p.categoryname}`);
                }
            }

            if (!categoryId) {
                throw new Error("Category is required");
            }

            const sku = p.sku || p.product_sku;
            if (!sku) {
                throw new Error("Product SKU is required");
            }

            const product = await productModel.create({
                name: p.name,
                slug: p.slug || p.name.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""),
                sku: sku,
                categoryId: categoryId,
                description: p.description,
                images: uploadedImages,
                isActive: p.isActive === 'false' || p.isActive === false ? false : true,
                created_by: userId
            });

            productMap[sku] = product._id;
            productMap[p.slug || p.name] = product._id;
            summary.productsCreated++;
        } catch (err) {
            summary.errors.push(`Product ${p.name || 'Unknown'}: ${err.message}`);
        }
    }

    // 5. Process Variants
    for (const v of variantsJson) {
        try {
            const productId = v.productId || productMap[v.product_sku] || productMap[v.productRef] || productMap[v.product_id];
            if (!productId) {
                summary.errors.push(`Variant ${v.sku}: Skipping as matching product not found for Ref: ${v.product_sku || v.productRef}`);
                continue;
            }

            // Find matched images in imageMap
            const imageNames = Array.isArray(v.images) ? v.images : (v.images ? v.images.split(';') : []);

            const imageBuffers = [];
            for (const name of imageNames) {
                const trimmedName = name.trim();
                if (imageMap[trimmedName]) {
                    imageBuffers.push({ buffer: imageMap[trimmedName], name: trimmedName });
                }
            }

            // Upload to Cloudinary
            const uploadedImages = imageBuffers.length > 0 ? await BulkUpload(imageBuffers, "variants") : [];

            // Parse attributes if they are in 'key:value; key2:value2' format
            let attributes = v.attributes;
            if (typeof attributes === 'string' && attributes.includes(':')) {
                const attrObj = {};
                attributes.split(';').forEach(pair => {
                    const [key, value] = pair.split(':');
                    if (key && value) {
                        attrObj[key.trim()] = value.trim();
                    }
                });
                attributes = attrObj;
            } else if (typeof attributes === 'string') {
                try {
                    attributes = JSON.parse(attributes);
                } catch (e) {
                    attributes = {};
                }
            }

            await variantModel.create({
                productId,
                sku: v.sku,
                price: Number(v.price) || Number(v.dlp) || Number(v.DLP) || 0,
                stock: v.stock !== undefined && v.stock !== '' ? Number(v.stock) : Number(v.qty) || 100,
                attributes: attributes || {},
                images: uploadedImages,
                isActive: v.isActive === 'false' || v.isActive === false ? false : true,
            });

            summary.variantsCreated++;
        } catch (err) {
            summary.errors.push(`Variant ${v.sku}: ${err.message}`);
        }
    }

    res.status(200).json({
        success: true,
        summary
    });
});

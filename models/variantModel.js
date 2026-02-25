const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Product ID is required"],
            index: true,
        },
        sku: {
            type: String,
            required: [true, "SKU is required"],
            unique: true,
            trim: true,
            index: true,
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price must be at least 0"],
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
            min: [0, "Stock must be at least 0"],
            default: 0,
        },
        attributes: {
            type: Map,
            of: String,
            default: {},
        },
        images: [
            {
                url: {
                    type: String,
                    required: true,
                },
                publicUrl: {
                    type: String,
                    required: true,
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Create text index for search on SKU and attributes
variantSchema.index({ sku: 'text', 'attributes.*': 'text' });

module.exports = mongoose.model("Variant", variantSchema);

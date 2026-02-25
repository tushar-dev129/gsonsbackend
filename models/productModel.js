const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            minlength: [3, "Name must be at least 3 characters long"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Product slug is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Category is required"],
            index: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
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
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

function arrayLimit(val) {
    return val.length <= 5;
}

ProductSchema.virtual('variants', {
    ref: 'Variant',
    localField: '_id',
    foreignField: 'productId',
});

// Set toJSON and toObject to include virtuals
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

ProductSchema.index({ name: 'text' });

module.exports = mongoose.model("Product", ProductSchema);

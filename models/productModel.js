const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            minlength: [3, "Name must be at least 3 characters long"],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        price: {
            type: Number,
            required: [true, "Product price is required"],
            maxLength: [8, "Price cannot exceed 8 characters"],
        },
        category: {
            type: String,
            trim: true,
            default: "General",
        },
        rating: {
            type: Number,
            default: 0,
        },
        reviews: {
            type: Number,
            default: 0,
        },
        isSale: {
            type: Boolean,
            default: false,
        },
        liked: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        images: {
            type: [
                {
                    url: {
                        type: String,
                        required: true,
                    },
                    public_id: {
                        type: String,
                        required: true,
                    },
                },
            ],
            validate: [arrayLimit, '{PATH} exceeds the limit of 5'],
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

module.exports = mongoose.model("Product", ProductSchema);

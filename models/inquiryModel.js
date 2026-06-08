const mongoose = require("mongoose");

const inquiryItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
        },
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant",
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            trim: true,
            default: "",
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        attributes: {
            type: Map,
            of: String,
            default: {},
        },
    },
    { _id: false }
);

const inquirySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        buyerName: {
            type: String,
            required: [true, "Buyer name is required"],
            trim: true,
        },
        buyerEmail: {
            type: String,
            required: [true, "Buyer email is required"],
            trim: true,
            lowercase: true,
        },
        buyerPhone: {
            type: String,
            required: [true, "Buyer phone is required"],
            trim: true,
        },
        company: {
            type: String,
            trim: true,
            default: "",
        },
        message: {
            type: String,
            trim: true,
            default: "",
        },
        items: {
            type: [inquiryItemSchema],
            validate: {
                validator: (items) => Array.isArray(items) && items.length > 0,
                message: "At least one inquiry item is required",
            },
        },
        totalItems: {
            type: Number,
            required: true,
            min: 1,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["new", "contacted", "closed"],
            default: "new",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Inquiry", inquirySchema);

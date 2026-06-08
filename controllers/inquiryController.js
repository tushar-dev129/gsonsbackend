const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const Inquiry = require("../models/inquiryModel");
const sendEmail = require("../utils/sendEmail");

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const buildInquiryEmail = (inquiry) => {
    const itemLines = inquiry.items.map((item, index) => {
        const attrs = item.attributes && item.attributes.size
            ? ` (${Array.from(item.attributes.values()).join(" | ")})`
            : "";
        return `${index + 1}. ${item.name}${attrs}
   Code: ${item.code || "N/A"}
   Qty: ${item.quantity}
   Price: ${formatCurrency(item.price)}
   Line Total: ${formatCurrency(item.price * item.quantity)}`;
    }).join("\n\n");

    return `Order inquiry details

Buyer: ${inquiry.buyerName}
Email: ${inquiry.buyerEmail}
Phone: ${inquiry.buyerPhone}
Company: ${inquiry.company || "N/A"}
Message: ${inquiry.message || "N/A"}

Items:
${itemLines}

Total Items: ${inquiry.totalItems}
Subtotal: ${formatCurrency(inquiry.subtotal)}
Inquiry ID: ${inquiry._id}`;
};

exports.createInquiry = catchAsyncErrors(async (req, res, next) => {
    const { buyerName, buyerEmail, buyerPhone, company, message, items } = req.body;

    if (!buyerName || !buyerEmail || !buyerPhone) {
        return next(new ErrorHandler("Please provide name, email, and phone", 400));
    }

    if (!Array.isArray(items) || items.length === 0) {
        return next(new ErrorHandler("Please add at least one item to send an inquiry", 400));
    }

    const normalizedItems = items.map((item) => ({
        productId: item.productId || undefined,
        variantId: item.variantId || undefined,
        name: item.name,
        code: item.code || "",
        price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        attributes: item.attributes || {},
    }));

    if (normalizedItems.some((item) => !item.name || item.price < 0 || item.quantity < 1)) {
        return next(new ErrorHandler("Inquiry items include invalid product details", 400));
    }

    const totalItems = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const inquiry = await Inquiry.create({
        userId: req.user?._id,
        buyerName,
        buyerEmail,
        buyerPhone,
        company,
        message,
        items: normalizedItems,
        totalItems,
        subtotal,
    });

    const emailMessage = buildInquiryEmail(inquiry);

    try {
        const adminEmail = process.env.SMPT_MAIL || process.env.SMTP_MAIL;
        if (adminEmail) {
            await sendEmail({
                email: adminEmail,
                subject: `New order inquiry from ${buyerName}`,
                message: emailMessage,
            });
        }

        await sendEmail({
            email: buyerEmail,
            subject: "We received your Gsons order inquiry",
            message: `Thank you for your inquiry, ${buyerName}.\n\nOur team will contact you soon.\n\n${emailMessage}`,
        });
    } catch (error) {
        console.error("Inquiry email failed:", error.message);
    }

    res.status(201).json({
        success: true,
        message: "Inquiry sent successfully",
        inquiry,
    });
});

exports.getAllInquiries = catchAsyncErrors(async (req, res) => {
    const inquiries = await Inquiry.find()
        .sort({ createdAt: -1 })
        .populate("items.productId", "name")
        .populate("items.variantId", "sku");

    res.status(200).json({
        success: true,
        inquiries,
    });
});

exports.getMyInquiries = catchAsyncErrors(async (req, res) => {
    const inquiries = await Inquiry.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("items.productId", "name")
        .populate("items.variantId", "sku");

    res.status(200).json({
        success: true,
        inquiries,
    });
});

const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncError");
const sendEmail = require("../utils/sendEmail");

// Send Contact Email
exports.sendContactEmail = catchAsyncErrors(async (req, res, next) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return next(new ErrorHandler("Please provide name, email, and message", 400));
    }

    const subject = `Contact Form Submission from ${name}`;
    const emailMessage = `
    You have received a new message from your contact form.
    
    Name: ${name}
    Email: ${email}
    Message: ${message}
  `;

    try {
        await sendEmail({
            email: process.env.SMPT_MAIL,
            subject,
            message: emailMessage,
        });

        res.status(200).json({
            success: true,
            message: "Email sent successfully",
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

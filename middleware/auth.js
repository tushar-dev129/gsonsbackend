const ErrorHandler = require('../utils/errorHandler');
const catchAsyncError = require("./catchAsyncError");
const jwt = require('jsonwebtoken');
const User = require('../models/userModels')

exports.isAuthenticatedUser = catchAsyncError(async (req, res, next) => {
    let { token } = req.cookies;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next(new ErrorHandler("please login to access this resource", 401))
    };

    const decodeData = jwt.verify(token, process.env.JWT_SECRET_KEY);

    req.user = await User.findById(decodeData.id);

    next();
});

exports.AuthorizeRoles = (...roles) => {
    return (req, res, next) => {

        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role: ${req.user.role} is not allowed to access this resource  `, 403))

        }

        next();
    }
}


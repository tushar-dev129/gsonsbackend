const productModel = require("../models/productModel");
const variantModel = require("../models/variantModel");
const userModels = require("../models/userModels");
const postModel = require("../models/postModel");
const catchAsyncError = require("../middleware/catchAsyncError");

// Get Dashboard Stats (Admin)
const getDashboardStats = catchAsyncError(async (req, res, next) => {
    const productsCount = await productModel.countDocuments();
    const usersCount = await userModels.countDocuments();
    const postsCount = await postModel.countDocuments();

    // 10 latest added products
    const latestProducts = await productModel.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('categoryId', 'name');

    // 5 variants with least stock
    const lowStockVariants = await variantModel.find()
        .sort({ stock: 1 })
        .limit(5)
        .populate({
            path: 'productId',
            select: 'name'
        });

    res.status(200).json({
        success: true,
        stats: {
            totalProducts: productsCount,
            totalUsers: usersCount,
            totalPosts: postsCount
        },
        latestProducts,
        lowStockVariants
    });
});

module.exports = {
    getDashboardStats
};

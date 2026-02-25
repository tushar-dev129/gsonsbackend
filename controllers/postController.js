const postModel = require("../models/postModel");
const { PostUpload, deleteImages } = require("../utils/uploadFiles");
const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler = require("../utils/errorHandler");
const ApiFeatures = require("../utils/apifeatures");

const createPost = catchAsyncError(async (req, res, next) => {
    const data = req.body;
    const file = req.file?.buffer;
    const userId = req.user._id;

    if (!file) {
        return next(new ErrorHandler("No post image uploaded", 400));
    }
    const result = await PostUpload(file);

    const post = await postModel.create({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        status: data.status,
        image: {
            url: result.secure_url,
            public_id: result.public_id,
        },
        created_by: userId,
    });

    return res.status(200).json({ success: true, post });
});

const updatePost = catchAsyncError(async (req, res, next) => {
    const data = req.body || {};
    const postId = req.params.id;
    const file = req.file?.buffer;

    const post = await postModel.findById(postId);
    if (!post) {
        return next(new ErrorHandler("Post Not Found", 404));
    }

    // Ownership check
    if (post.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to edit this post", 403));
    }

    if (file) {
        if (post.image?.public_id) {
            await deleteImages(post.image.public_id);
        }
        const result = await PostUpload(file);
        const updatedPost = await postModel.findByIdAndUpdate(
            postId,
            {
                ...data,
                image: { url: result.secure_url, public_id: result.public_id },
            },
            { new: true, runValidators: true }
        );
        return res.status(200).json({ success: true, updatedPost });
    } else {
        const updatedPost = await postModel.findByIdAndUpdate(
            postId,
            { ...data },
            { new: true, runValidators: true }
        );
        return res.status(200).json({ success: true, updatedPost });
    }
});

const deletePost = catchAsyncError(async (req, res, next) => {
    const postId = req.params.id;

    const post = await postModel.findById(postId);
    if (!post) {
        return next(new ErrorHandler("Post Not Found", 404));
    }

    // Ownership check
    if (post.created_by.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return next(new ErrorHandler("You are not authorized to delete this post", 403));
    }

    if (post.image?.public_id) {
        await deleteImages(post.image.public_id);
    }

    await post.deleteOne();

    return res.status(200).json({ success: true, message: "Post has been deleted" });
});

const getAllPosts = catchAsyncError(async (req, res, next) => {
    const resultPerPage = parseInt(req.query.limit) || 10;
    const postsCount = await postModel.countDocuments();

    const apiFeature = new ApiFeatures(postModel.find(), req.query)
        .search("title")
        .filter();

    let posts = await apiFeature.query;
    let filteredPostsCount = posts.length;

    apiFeature.pagination(resultPerPage);

    // Sorting
    if (req.query.sort === "new") {
        apiFeature.query = apiFeature.query.sort({ createdAt: -1 });
    } else if (req.query.sort === "old") {
        apiFeature.query = apiFeature.query.sort({ createdAt: 1 });
    }

    posts = await apiFeature.query.clone();

    res.status(200).json({
        success: true,
        total: postsCount,
        filteredCount: filteredPostsCount,
        page: parseInt(req.query.page) || 1,
        totalPages: Math.ceil(filteredPostsCount / resultPerPage),
        count: posts.length,
        posts: posts,
    });
});

const likePost = catchAsyncError(async (req, res, next) => {
    const userId = req.user._id;
    const postId = req.params.id;

    const post = await postModel.findById(postId);
    if (!post) {
        return next(new ErrorHandler("Post not found", 404));
    }

    let updated;
    if (post.liked.includes(userId)) {
        updated = await postModel.findByIdAndUpdate(
            postId,
            { $pull: { liked: userId } },
            { new: true }
        );
    } else {
        updated = await postModel.findByIdAndUpdate(
            postId,
            { $push: { liked: userId } },
            { new: true }
        );
    }

    res.status(200).json({ success: true, updated });
});

const getPostById = catchAsyncError(async (req, res, next) => {
    const post = await postModel.findById(req.params.id);
    if (!post) {
        return next(new ErrorHandler("Post not found", 404));
    }
    res.status(200).json({ success: true, post: post });
});

module.exports = {
    createPost,
    getAllPosts,
    likePost,
    updatePost,
    deletePost,
    getPostById,
};

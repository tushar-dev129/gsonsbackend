const express = require("express");
const Router = express.Router();
const {
    getAllPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
    getPostById,
} = require("../controllers/postController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

Router.get("/posts", getAllPosts)
    .post(
        "/admin/post/new",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        upload.single("file"),
        createPost
    )
    .post(
        "/admin/post/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        upload.single("file"),
        updatePost
    )
    .delete(
        "/admin/post/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        deletePost
    )
    .put(
        "/post/like/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        likePost
    )
    .get("/post/:id", getPostById);

module.exports = Router;

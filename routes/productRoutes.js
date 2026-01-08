const express = require("express");
const Router = express.Router();
const {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    likeProduct,
    getProductById,
} = require("../controllers/productController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

Router.get("/products", getAllProducts)
    .post(
        "/admin/product/new",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        upload.array("files", 5),
        createProduct
    )
    .post(
        "/admin/product/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        upload.array("files", 5),
        updateProduct
    )
    .delete(
        "/admin/product/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        deleteProduct
    )
    .put(
        "/product/like/:id",
        isAuthenticatedUser,
        AuthorizeRoles("user", "admin"),
        likeProduct
    )
    .get("/product/:id", getProductById);

module.exports = Router;

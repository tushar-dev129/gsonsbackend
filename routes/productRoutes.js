const express = require("express");
const Router = express.Router();
const {
    getAllProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    likeProduct,
    getProductById,
    getProductBySlug,
    searchProducts,
} = require("../controllers/productController");
const { bulkImport } = require("../controllers/bulkImportController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

Router.get("/products", getAllProducts)
    .get("/search", searchProducts)
    .post(
        "/admin/product/new",
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        upload.array("files", 20),
        createProduct
    )
    .post(
        "/admin/product/:id",
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        upload.array("files", 20),
        updateProduct
    )
    .delete(
        "/admin/product/:id",
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        deleteProduct
    )
    .get("/product/:id", getProductById)
    .get("/product/slug/:slug", getProductBySlug)
    .post(
        "/admin/bulk-import",
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        upload.fields([
            { name: "images_zip", maxCount: 1 },
            { name: "products_data", maxCount: 1 },
            { name: "variants_data", maxCount: 1 },
        ]),
        bulkImport
    );

module.exports = Router;

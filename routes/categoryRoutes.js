const express = require("express");
const {
    createCategory,
    updateCategory,
    getAllCategories,
    deleteCategory,
} = require("../controllers/categoryController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");

const router = express.Router();

const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route("/admin/category").post(isAuthenticatedUser, AuthorizeRoles("admin"), upload.single("file"), createCategory);
router.route("/categories").get(getAllCategories);
router
    .route("/admin/category/:id")
    .put(isAuthenticatedUser, AuthorizeRoles("admin"), upload.single("file"), updateCategory)
    .delete(isAuthenticatedUser, AuthorizeRoles("admin"), deleteCategory);

module.exports = router;

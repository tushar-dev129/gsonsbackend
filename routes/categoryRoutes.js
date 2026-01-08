const express = require("express");
const {
    createCategory,
    getAllCategories,
    deleteCategory,
} = require("../controllers/categoryController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.route("/category").post(isAuthenticatedUser, createCategory);
router.route("/categories").get(getAllCategories);
router
    .route("/category/:id")
    .delete(isAuthenticatedUser, AuthorizeRoles("admin"), deleteCategory);

module.exports = router;

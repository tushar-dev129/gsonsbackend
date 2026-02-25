const express = require("express");
const Router = express.Router();
const {
    addVariant,
    updateVariant,
    deleteVariant,
    getVariantBySku,
    getVariantById,
} = require("../controllers/variantController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

Router.get("/variant/:sku", getVariantBySku);
Router.get("/admin/variant/:id", isAuthenticatedUser, AuthorizeRoles("admin"), getVariantById);


Router.post(
    "/admin/variant/new",
    isAuthenticatedUser,
    AuthorizeRoles("admin"),
    upload.array("files", 5),
    addVariant
);

Router.route("/admin/variant/:id")
    .post(isAuthenticatedUser, AuthorizeRoles("admin"), upload.array("files", 5), updateVariant)
    .delete(isAuthenticatedUser, AuthorizeRoles("admin"), deleteVariant);

module.exports = Router;

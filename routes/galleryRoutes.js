const express = require("express");
const Router = express.Router();
const {
    addGalleryImage,
    getGalleryImages,
    removeGalleryImage,
} = require("../controllers/galleryController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

Router.route("/gallery")
    .get(getGalleryImages)
    .post(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        upload.array("images", 50),
        addGalleryImage
    );

Router.route("/gallery/:id")
    .delete(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        removeGalleryImage
    );

module.exports = Router;

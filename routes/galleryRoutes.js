const express = require("express");
const Router = express.Router();
const {
    addGalleryImage,
    getGalleryImages,
    removeGalleryImage,
    bulkDeleteImages,
} = require("../controllers/galleryController");
const {
    createFolder,
    getAllFolders,
    deleteFolder,
} = require("../controllers/galleryFolderController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Image Routes
Router.route("/gallery")
    .get(getGalleryImages)
    .post(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        upload.array("images", 50),
        addGalleryImage
    );

Router.route("/gallery/bulk-delete")
    .post(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        bulkDeleteImages
    );

Router.route("/gallery/:id")
    .delete(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        removeGalleryImage
    );

// Folder Routes
Router.route("/gallery/folders")
    .get(getAllFolders)
    .post(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        createFolder
    );

Router.route("/gallery/folders/:id")
    .delete(
        isAuthenticatedUser,
        AuthorizeRoles("admin"),
        deleteFolder
    );

module.exports = Router;

const express = require("express");
const { toggleSavedItem, getSavedItems } = require("../controllers/savedController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const upload = multer();
const Router = express.Router();


Router
    .post('/toggle-save-item/:id', isAuthenticatedUser, AuthorizeRoles('user', 'admin'), upload.none(), toggleSavedItem)
    .get('/get-saved-item', isAuthenticatedUser, AuthorizeRoles('user', 'admin'), getSavedItems)

module.exports = Router;
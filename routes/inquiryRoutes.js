const express = require("express");
const { createInquiry, getAllInquiries, getMyInquiries } = require("../controllers/inquiryController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");

const router = express.Router();

router.route("/inquiries").post(isAuthenticatedUser, createInquiry);
router.route("/my/inquiries").get(isAuthenticatedUser, getMyInquiries);
router.route("/admin/inquiries").get(isAuthenticatedUser, AuthorizeRoles("admin"), getAllInquiries);

module.exports = router;

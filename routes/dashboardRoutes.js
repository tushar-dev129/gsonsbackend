const express = require("express");
const { getDashboardStats } = require("../controllers/dashboardController");
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const router = express.Router();

router.route("/admin/dashboard-stats").get(isAuthenticatedUser, AuthorizeRoles("admin"), getDashboardStats);

module.exports = router;

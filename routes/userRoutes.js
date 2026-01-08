const express = require("express");
const {
  registerUser,
  loginUser,
  logout,
  forgotPassword,
  resetPassword,
  getUserDetails,
  updatePassword,
  updateProfile,
  getAllUser,
  getSingleUser,
  updateUserRole,
  deleteUser
} = require("../controllers/userController");
const router = express.Router();
const { isAuthenticatedUser, AuthorizeRoles } = require("../middleware/auth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.route("/register").post(upload.single("avatar"), registerUser);

router.route("/login").post(upload.none(), loginUser);

router.route("/password/forgot").post(upload.none(), forgotPassword);

router.route("/password/reset/:token").put(upload.none(), resetPassword);

router.route("/me").get(isAuthenticatedUser, getUserDetails);

router.route("/password/update").put(isAuthenticatedUser, upload.none(), updatePassword);

router.route("/me/update").put(isAuthenticatedUser, upload.single("avatar"), updateProfile);

router
  .route("/admin/users")
  .get(isAuthenticatedUser, AuthorizeRoles("admin"), getAllUser);

router
  .route("/admin/user/:id")
  .get(isAuthenticatedUser, AuthorizeRoles("admin"), getSingleUser)
  .put(isAuthenticatedUser, AuthorizeRoles("admin"), updateUserRole)
  .delete(isAuthenticatedUser, AuthorizeRoles("admin"), deleteUser);

router.route("/logout").get(logout);

module.exports = router;

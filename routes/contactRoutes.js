const express = require("express");
const { sendContactEmail } = require("../controllers/contactController");
const router = express.Router();

router.route("/contact").post(sendContactEmail);

module.exports = router;

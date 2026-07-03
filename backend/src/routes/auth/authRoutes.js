const express = require("express");
const { loginUser } = require("../../controllers/auth/authController");
const { authLimiter } = require("../../middleware/rateLimiters");

const router = express.Router();

router.post("/auth/login", authLimiter, loginUser);

module.exports = router;

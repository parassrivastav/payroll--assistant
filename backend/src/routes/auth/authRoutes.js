const express = require("express");
const { loginUser } = require("../../controllers/auth/authController");

const router = express.Router();

router.post("/auth/login", loginUser);

module.exports = router;

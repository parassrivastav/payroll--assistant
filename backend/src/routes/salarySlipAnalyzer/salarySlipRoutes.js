const express = require("express");
const multer = require("multer");
const { analyzeSalarySlip } = require("../../controllers/salarySlipAnalyzer/salarySlipController");
const { env } = require("../../config/env");
const { requireAuth } = require("../../middleware/authMiddleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 }
});

router.post(
  "/upload-doc/salary-slip",
  requireAuth,
  upload.fields([
    { name: "salarySlip", maxCount: 1 },
    { name: "file", maxCount: 1 }
  ]),
  analyzeSalarySlip
);

module.exports = router;

const express = require("express");
const {
  narratePayrollFromBody,
  narratePayrollFromStoredAnalysis
} = require("../../controllers/llmNarrator/payrollNarratorController");
const { requireAuth } = require("../../middleware/authMiddleware");
const { chatLimiter } = require("../../middleware/rateLimiters");

const router = express.Router();

router.post("/payroll/narrate", chatLimiter, requireAuth, narratePayrollFromBody);
router.post("/payroll/:id/narrate", chatLimiter, requireAuth, narratePayrollFromStoredAnalysis);

module.exports = router;

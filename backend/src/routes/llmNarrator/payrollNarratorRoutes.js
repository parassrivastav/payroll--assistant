const express = require("express");
const {
  narratePayrollFromBody,
  narratePayrollFromStoredAnalysis
} = require("../../controllers/llmNarrator/payrollNarratorController");
const { requireAuth } = require("../../middleware/authMiddleware");

const router = express.Router();

router.post("/payroll/narrate", requireAuth, narratePayrollFromBody);
router.post("/payroll/:id/narrate", requireAuth, narratePayrollFromStoredAnalysis);

module.exports = router;

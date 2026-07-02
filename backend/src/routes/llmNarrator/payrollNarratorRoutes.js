const express = require("express");
const {
  narratePayrollFromBody,
  narratePayrollFromStoredAnalysis
} = require("../../controllers/llmNarrator/payrollNarratorController");

const router = express.Router();

router.post("/payroll/narrate", narratePayrollFromBody);
router.post("/payroll/:id/narrate", narratePayrollFromStoredAnalysis);

module.exports = router;

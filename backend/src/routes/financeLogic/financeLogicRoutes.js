const express = require("express");
const {
  getLatestPayrollSummary,
  getPayrollSummary,
  runSection80CSimulation,
  getProofChecklist
} = require("../../controllers/financeLogic/financeLogicController");

const router = express.Router();

router.get("/payroll/summary", getLatestPayrollSummary);
router.get("/payroll/:id/summary", getPayrollSummary);
router.post("/tax/80c/simulate", runSection80CSimulation);
router.get("/investment-proofs/checklist", getProofChecklist);

module.exports = router;

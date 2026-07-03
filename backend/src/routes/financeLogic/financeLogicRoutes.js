const express = require("express");
const {
  getLatestPayrollSummary,
  getMonthComparison,
  getPayrollHistory,
  getPayrollSummary,
  runSection80CSimulation,
  getProofChecklist
} = require("../../controllers/financeLogic/financeLogicController");
const { requireAuth } = require("../../middleware/authMiddleware");

const router = express.Router();

router.get("/payroll/summary", requireAuth, getLatestPayrollSummary);
router.get("/payroll/history", requireAuth, getPayrollHistory);
router.get("/payroll/:id/summary", requireAuth, getPayrollSummary);
router.get("/payroll/month-comparison", requireAuth, getMonthComparison);
router.post("/tax/80c/simulate", requireAuth, runSection80CSimulation);
router.get("/investment-proofs/checklist", requireAuth, getProofChecklist);

module.exports = router;

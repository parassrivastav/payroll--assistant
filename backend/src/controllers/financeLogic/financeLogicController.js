const { getSalarySlipAnalysisById } = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { buildPayrollSummaryFromRecord } = require("../../services/financeLogic/payrollSummaryBuilder");
const { simulateSection80C } = require("../../services/financeLogic/section80CSimulator");
const { getInvestmentProofChecklist } = require("../../services/financeLogic/investmentProofChecklist");

function getPayrollSummary(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: { message: "A valid payroll analysis id is required.", code: "INVALID_ANALYSIS_ID" } });
    }

    const record = getSalarySlipAnalysisById(id);
    if (!record) {
      return res.status(404).json({ error: { message: `No payroll analysis found for id ${id}.`, code: "ANALYSIS_NOT_FOUND" } });
    }

    res.json(buildPayrollSummaryFromRecord(record));
  } catch (err) {
    next(err);
  }
}

function runSection80CSimulation(req, res, next) {
  try {
    res.json(simulateSection80C({
      additionalInvestment: req.body?.additionalInvestment,
      alreadyDeclared80C: req.body?.alreadyDeclared80C
    }));
  } catch (err) {
    next(err);
  }
}

function getProofChecklist(_req, res, next) {
  try {
    res.json(getInvestmentProofChecklist());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayrollSummary,
  runSection80CSimulation,
  getProofChecklist
};

const {
  getLatestSalarySlipAnalysis,
  getLatestSalarySlipAnalyses,
  getLatestSalarySlipAnalysesForEmployee,
  getLatestSalarySlipAnalysisForEmployee,
  getSalarySlipAnalysisById
} = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const {
  buildMockPayrollSummary,
  buildPayrollSummaryFromRecord
} = require("../../services/financeLogic/payrollSummaryBuilder");
const { simulateSection80C } = require("../../services/financeLogic/section80CSimulator");
const { getInvestmentProofChecklist } = require("../../services/financeLogic/investmentProofChecklist");
const { buildMonthComparison } = require("../../services/financeLogic/monthComparisonService");
const { resolveRequestEmployee } = require("../../middleware/authMiddleware");
const { logAudit } = require("../../services/audit/auditLogger");

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

    const employeeId = ensureRecordAccess(req, record);
    logAudit({
      user: req.user,
      employeeId,
      action: "payroll_summary_view",
      metadata: { analysisId: record.id }
    });

    res.json(buildPayrollSummaryFromRecord(record));
  } catch (err) {
    next(err);
  }
}

function getLatestPayrollSummary(_req, res, next) {
  try {
    const employeeId = resolveRequestEmployee(_req);
    const record = _req.user.role === "PAYROLL_ADMIN" && !employeeId
      ? getLatestSalarySlipAnalysis()
      : getLatestSalarySlipAnalysisForEmployee(employeeId);

    logAudit({
      user: _req.user,
      employeeId,
      action: "payroll_summary_view",
      metadata: { analysisId: record?.id || null, source: record ? "uploaded" : "mock" }
    });

    res.json(record ? buildPayrollSummaryFromRecord(record) : buildMockPayrollSummary());
  } catch (err) {
    next(err);
  }
}

function runSection80CSimulation(req, res, next) {
  try {
    const employeeId = resolveRequestEmployee(req);
    logAudit({
      user: req.user,
      employeeId,
      action: "tax_simulation",
      metadata: {
        alreadyDeclared80C: req.body?.alreadyDeclared80C,
        additionalInvestment: req.body?.additionalInvestment
      }
    });

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
    const employeeId = resolveRequestEmployee(_req);
    logAudit({
      user: _req.user,
      employeeId,
      action: "proof_checklist_view",
      metadata: {}
    });

    res.json(getInvestmentProofChecklist());
  } catch (err) {
    next(err);
  }
}

function getMonthComparison(_req, res, next) {
  try {
    const employeeId = resolveRequestEmployee(_req);
    const records = _req.user.role === "PAYROLL_ADMIN" && !employeeId
      ? getLatestSalarySlipAnalyses(2)
      : getLatestSalarySlipAnalysesForEmployee(employeeId, 2);

    logAudit({
      user: _req.user,
      employeeId,
      action: "payroll_summary_view",
      metadata: { comparison: true, source: records.length >= 2 ? "uploaded" : "mock" }
    });

    res.json(buildMonthComparison(records));
  } catch (err) {
    next(err);
  }
}

function ensureRecordAccess(req, record) {
  const requestedEmployeeId = req.query?.employeeId || record.employeeId;
  const employeeId = resolveRequestEmployee({ ...req, query: { ...req.query, employeeId: requestedEmployeeId } });

  if (record.employeeId && record.employeeId !== employeeId && req.user.role !== "PAYROLL_ADMIN") {
    const err = new Error("You do not have access to this payroll analysis.");
    err.statusCode = 403;
    err.code = "FORBIDDEN_PAYROLL_ANALYSIS";
    throw err;
  }

  return employeeId || record.employeeId || null;
}

module.exports = {
  getLatestPayrollSummary,
  getPayrollSummary,
  runSection80CSimulation,
  getProofChecklist,
  getMonthComparison
};

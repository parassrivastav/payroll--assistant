const { getSalarySlipAnalysisById } = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { narratePayroll, buildPayrollNarratorRequest } = require("../../services/llmNarrator/payrollNarrator");
const { resolveRequestEmployee } = require("../../middleware/authMiddleware");
const { logAudit } = require("../../services/audit/auditLogger");

async function narratePayrollFromBody(req, res, next) {
  try {
    const { finance, question, history, analysis } = req.body || {};
    const dryRun = isTruthy(req.query?.dryRun) || isTruthy(req.body?.dryRun);
    const employeeId = resolveRequestEmployee(req);

    if (dryRun) {
      return res.json({
        dryRun: true,
        observability: {
          llmRequest: buildPayrollNarratorRequest({ finance, question, history, analysis })
        }
      });
    }

    logAudit({
      user: req.user,
      employeeId,
      action: "chat_query",
      metadata: { mode: "body", questionLength: String(question || "").length }
    });

    const result = await narratePayroll({ finance, question, history, analysis });

    res.json({
      answer: result.narration.answer,
      narration: result.narration,
      llm: {
        model: result.model,
        usage: result.usage
      }
    });
  } catch (err) {
    next(err);
  }
}

async function narratePayrollFromStoredAnalysis(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { question, history } = req.body || {};
    const dryRun = isTruthy(req.query?.dryRun) || isTruthy(req.body?.dryRun);

    if (!id) {
      const err = new Error("A valid salary slip analysis id is required.");
      err.statusCode = 400;
      err.code = "INVALID_ANALYSIS_ID";
      throw err;
    }

    const record = getSalarySlipAnalysisById(id);
    if (!record) {
      const err = new Error(`No salary slip analysis found for id ${id}.`);
      err.statusCode = 404;
      err.code = "ANALYSIS_NOT_FOUND";
      throw err;
    }

    const employeeId = ensureRecordAccess(req, record);

    const finance = record.payload?.finance;
    const analysis = record.payload?.analysis;

    if (dryRun) {
      return res.json({
        dryRun: true,
        id,
        observability: {
          llmRequest: buildPayrollNarratorRequest({ finance, question, history, analysis })
        }
      });
    }

    logAudit({
      user: req.user,
      employeeId,
      action: "chat_query",
      metadata: { analysisId: id, questionLength: String(question || "").length }
    });

    const result = await narratePayroll({ finance, question, history, analysis });

    res.json({
      id,
      answer: result.narration.answer,
      narration: result.narration,
      llm: {
        model: result.model,
        usage: result.usage
      }
    });
  } catch (err) {
    next(err);
  }
}

function ensureRecordAccess(req, record) {
  const requestedEmployeeId = req.query?.employeeId || record.employeeId;
  const employeeId = resolveRequestEmployee({ ...req, query: { ...req.query, employeeId: requestedEmployeeId } });

  if (record.employeeId && record.employeeId !== employeeId && req.user.role !== "PAYROLL_ADMIN") {
    const err = new Error("You do not have access to this salary slip analysis.");
    err.statusCode = 403;
    err.code = "FORBIDDEN_PAYROLL_ANALYSIS";
    throw err;
  }

  return employeeId || record.employeeId || null;
}

function isTruthy(value) {
  return value === true || value === "true";
}

module.exports = {
  narratePayrollFromBody,
  narratePayrollFromStoredAnalysis
};

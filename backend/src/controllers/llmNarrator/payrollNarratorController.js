const { getSalarySlipAnalysisById } = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { narratePayroll, buildPayrollNarratorRequest } = require("../../services/llmNarrator/payrollNarrator");

async function narratePayrollFromBody(req, res, next) {
  try {
    const { finance, question } = req.body || {};
    const dryRun = isTruthy(req.query?.dryRun) || isTruthy(req.body?.dryRun);

    if (dryRun) {
      return res.json({
        dryRun: true,
        observability: {
          llmRequest: buildPayrollNarratorRequest({ finance, question })
        }
      });
    }

    const result = await narratePayroll({ finance, question });

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
    const { question } = req.body || {};
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

    const finance = record.payload?.finance;

    if (dryRun) {
      return res.json({
        dryRun: true,
        id,
        observability: {
          llmRequest: buildPayrollNarratorRequest({ finance, question })
        }
      });
    }

    const result = await narratePayroll({ finance, question });

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

function isTruthy(value) {
  return value === true || value === "true";
}

module.exports = {
  narratePayrollFromBody,
  narratePayrollFromStoredAnalysis
};

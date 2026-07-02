const crypto = require("crypto");
const { extractDocumentTextWithDetails } = require("../../services/salarySlipAnalyzer/documentTextExtractor");
const { maskPii } = require("../../services/salarySlipAnalyzer/piiSanitizer");
const { analyzePayslipText, buildSalarySlipRequest } = require("../../services/salarySlipAnalyzer/salarySlipAnalyzer");
const { saveSalarySlipAnalysis } = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { buildPayrollFinancePayload } = require("../../services/financeLogic/payrollCalculator");

async function analyzeSalarySlip(req, res, next) {
  try {
    const file =
      req.files?.salarySlip?.[0] ||
      req.files?.file?.[0] ||
      null;

    const extraction = await extractDocumentTextWithDetails({
      file,
      text: req.body?.text
    });

    const sanitized = maskPii(extraction.text);
    const includeObservability =
      req.query?.debug === "true" ||
      req.body?.includeObservability === true ||
      req.body?.includeObservability === "true";
    const dryRun =
      req.query?.dryRun === "true" ||
      req.body?.dryRun === true ||
      req.body?.dryRun === "true";

    if (dryRun) {
      return res.json({
        dryRun: true,
        piiMasking: {
          redactions: sanitized.redactions,
          sanitizedCharacterCount: sanitized.text.length
        },
        extraction: {
          method: extraction.method,
          extractedCharacterCount: extraction.text.length
        },
        observability: {
          sanitizedText: sanitized.text,
          llmRequest: buildSalarySlipRequest(sanitized.text)
        }
      });
    }

    const result = await analyzePayslipText(sanitized.text);
    const finance = buildPayrollFinancePayload(result.analysis);
    const persisted = saveSalarySlipAnalysis({
      analysis: result.analysis,
      finance,
      sourceFilenameHash: file?.originalname ? hashValue(file.originalname) : null,
      extraction: {
        method: extraction.method,
        extractedCharacterCount: extraction.text.length
      },
      piiMasking: {
        redactions: sanitized.redactions,
        sanitizedCharacterCount: sanitized.text.length
      },
      llm: {
        model: result.model,
        usage: result.usage
      }
    });

    const response = {
      id: persisted.id,
      analysis: result.analysis,
      finance,
      piiMasking: {
        redactions: sanitized.redactions,
        sanitizedCharacterCount: sanitized.text.length
      },
      extraction: {
        method: extraction.method,
        extractedCharacterCount: extraction.text.length
      },
      llm: {
        model: result.model,
        usage: result.usage
      },
      storage: {
        id: persisted.id,
        createdAt: persisted.createdAt
      }
    };

    if (includeObservability) {
      response.observability = {
        sanitizedText: sanitized.text,
        llmRequest: result.request
      };
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = { analyzeSalarySlip };

const { extractDocumentTextWithDetails } = require("../../services/salarySlipAnalyzer/documentTextExtractor");
const { maskPii } = require("../../services/salarySlipAnalyzer/piiSanitizer");
const { analyzePayslipText, buildSalarySlipRequest } = require("../../services/salarySlipAnalyzer/salarySlipAnalyzer");

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

    const response = {
      analysis: result.analysis,
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

module.exports = { analyzeSalarySlip };

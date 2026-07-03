const crypto = require("crypto");
const { extractDocumentTextWithDetails } = require("../../services/salarySlipAnalyzer/documentTextExtractor");
const { maskPii } = require("../../services/salarySlipAnalyzer/piiSanitizer");
const {
  WRAPPER_EXTRACTION_PROMPT,
  analyzePayslipText,
  buildSalarySlipRequest
} = require("../../services/salarySlipAnalyzer/salarySlipAnalyzer");
const { saveSalarySlipAnalysis } = require("../../services/salarySlipAnalyzer/salarySlipAnalysisRepository");
const { buildPayrollFinancePayload } = require("../../services/financeLogic/payrollCalculator");
const { resolveRequestEmployee } = require("../../middleware/authMiddleware");
const { logAudit } = require("../../services/audit/auditLogger");
const { isOpenAiProvider } = require("../../services/llm/llmProvider");

async function analyzeSalarySlip(req, res, next) {
  try {
    const employeeId = resolveRequestEmployee(req);
    const file =
      req.files?.salarySlip?.[0] ||
      req.files?.file?.[0] ||
      null;
    const directWrapperAttachment = shouldUseDirectWrapperAttachment(file);

    const extraction = directWrapperAttachment
      ? {
          text: "",
          method: file.mimetype === "application/pdf" ? "wrapper_pdf_base64" : "wrapper_image_base64"
        }
      : await extractDocumentTextWithDetails({
          file,
          text: req.body?.text
        });

    const sanitized = directWrapperAttachment
      ? { text: "", redactions: {} }
      : maskPii(extraction.text);
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
          llmRequest: isOpenAiProvider()
            ? buildSalarySlipRequest(sanitized.text)
            : buildWrapperDryRunRequest(file, sanitized.text)
        }
      });
    }

    const result = await analyzePayslipText(sanitized.text, buildWrapperAttachment(file, directWrapperAttachment));
    const finance = buildPayrollFinancePayload(result.analysis);
    const persisted = saveSalarySlipAnalysis({
      employeeId,
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

    logAudit({
      user: req.user,
      employeeId,
      action: "payslip_upload",
      metadata: {
        analysisId: persisted.id,
        extractionMethod: extraction.method,
        hasFile: Boolean(file),
        fileType: file?.mimetype || null
      }
    });

    const response = {
      id: persisted.id,
      employeeId,
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

function shouldUseDirectWrapperAttachment(file) {
  return !isOpenAiProvider() && file && (
    file.mimetype === "application/pdf" ||
    allowedWrapperImageTypes().has(file.mimetype)
  );
}

function buildWrapperAttachment(file, enabled) {
  if (!enabled) return {};

  if (file.mimetype === "application/pdf") {
    return { pdfBase64: file.buffer.toString("base64") };
  }

  return {
    imageBase64: file.buffer.toString("base64"),
    imageMediaType: file.mimetype
  };
}

function buildWrapperDryRunRequest(file, sanitizedText = "") {
  const hasBinaryAttachment = file && (
    file.mimetype === "application/pdf" ||
    allowedWrapperImageTypes().has(file.mimetype)
  );

  return {
    provider: "company-llm-wrapper",
    prompt: hasBinaryAttachment
      ? WRAPPER_EXTRACTION_PROMPT
      : `${WRAPPER_EXTRACTION_PROMPT}\n\nPayslip text:\n${sanitizedText}`,
    metadata: {
      client: "payroll-ai-agent",
      flow: "payslip-extraction"
    },
    hasPdfBase64: file?.mimetype === "application/pdf",
    hasImageBase64: Boolean(file && allowedWrapperImageTypes().has(file.mimetype)),
    imageMediaType: allowedWrapperImageTypes().has(file?.mimetype) ? file.mimetype : null
  };
}

function allowedWrapperImageTypes() {
  return new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
}

module.exports = { analyzeSalarySlip };

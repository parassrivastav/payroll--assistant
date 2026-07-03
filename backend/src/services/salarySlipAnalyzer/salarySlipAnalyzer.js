const { env } = require("../../config/env");
const { buildSalarySlipPrompt } = require("../../prompts/salarySlipAnalyzer/salarySlipPrompt");
const { payslipSchema } = require("../../schemas/salarySlipAnalyzer/payslipSchema");
const { isOpenAiProvider, queryLLM } = require("../llm/llmProvider");

const WRAPPER_EXTRACTION_PROMPT = `
Extract payroll fields from this payslip. Return valid JSON only.
Do not include markdown.
Do not guess.
If a field is missing, return null.

Fields:
month,
basic_salary,
hra,
lta,
special_allowance,
provident_fund,
professional_tax,
income_tax_tds,
reimbursements,
gross_pay,
net_pay,
year_to_date.gross_pay,
year_to_date.tds,
year_to_date.pf
`.trim();

async function analyzePayslipText(sanitizedText, attachment = {}) {
  const request = buildSalarySlipRequest(sanitizedText);
  const llmResult = isOpenAiProvider()
    ? await queryLLM({ openAiRequest: request })
    : await queryLLM({
        prompt: buildWrapperExtractionPrompt(sanitizedText, attachment),
        pdfBase64: attachment.pdfBase64,
        imageBase64: attachment.imageBase64,
        imageMediaType: attachment.imageMediaType,
        metadata: {
          flow: "payslip-extraction"
        }
      });

  return {
    analysis: isOpenAiProvider()
      ? JSON.parse(llmResult.content)
      : normalizeWrapperPayslipJson(parseJsonOnly(llmResult.content)),
    usage: llmResult.usage || null,
    model: llmResult.model,
    request: llmResult.request
  };
}

function buildSalarySlipRequest(sanitizedText) {
  const messages = buildSalarySlipPrompt(sanitizedText);

  return {
    model: env.openAiModel,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "salary_slip_analysis",
        strict: true,
        schema: payslipSchema
      }
    }
  };
}

function buildWrapperExtractionPrompt(sanitizedText, attachment = {}) {
  if (attachment.pdfBase64 || attachment.imageBase64) {
    return WRAPPER_EXTRACTION_PROMPT;
  }

  return `${WRAPPER_EXTRACTION_PROMPT}\n\nPayslip text:\n${sanitizedText}`;
}

function normalizeWrapperPayslipJson(payload) {
  return {
    doc_type: "payslip",
    date: null,
    pay_period: payload.month ?? null,
    basic: money(payload.basic_salary),
    hra: money(payload.hra),
    lta: money(payload.lta),
    special_allowance: money(payload.special_allowance),
    provident_fund: money(payload.provident_fund),
    professional_tax: money(payload.professional_tax),
    income_tax_tds: money(payload.income_tax_tds),
    reimbursements: money(payload.reimbursements),
    gross_pay: money(payload.gross_pay),
    net_pay: money(payload.net_pay),
    year_to_date: {
      basic: money(null),
      hra: money(null),
      lta: money(null),
      special_allowance: money(null),
      provident_fund: money(payload.year_to_date?.pf),
      professional_tax: money(null),
      income_tax_tds: money(payload.year_to_date?.tds),
      reimbursements: money(null),
      gross_pay: money(payload.year_to_date?.gross_pay),
      net_pay: money(null)
    }
  };
}

function money(value) {
  return {
    amount: typeof value === "number" ? value : null,
    currency: typeof value === "number" ? "INR" : null
  };
}

function parseJsonOnly(content) {
  try {
    return JSON.parse(content);
  } catch (_err) {
    const match = String(content || "").match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw _err;
  }
}

module.exports = {
  WRAPPER_EXTRACTION_PROMPT,
  analyzePayslipText,
  buildSalarySlipRequest,
  normalizeWrapperPayslipJson
};

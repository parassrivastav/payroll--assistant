const { env } = require("../config/env");
const { buildSalarySlipPrompt } = require("../prompts/salarySlipPrompt");
const { payslipSchema } = require("../schemas/payslipSchema");
const { getOpenAiClient } = require("./openaiClient");

async function analyzePayslipText(sanitizedText) {
  const client = getOpenAiClient();
  const request = buildSalarySlipRequest(sanitizedText);

  const completion = await client.chat.completions.create(request);

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("OpenAI returned an empty salary slip analysis.");
    err.statusCode = 502;
    err.code = "EMPTY_LLM_RESPONSE";
    throw err;
  }

  return {
    analysis: JSON.parse(content),
    usage: completion.usage || null,
    model: completion.model || request.model,
    request
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

module.exports = { analyzePayslipText, buildSalarySlipRequest };

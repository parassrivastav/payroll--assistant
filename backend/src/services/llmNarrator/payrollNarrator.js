const { env } = require("../../config/env");
const { buildPayrollNarratorPrompt } = require("../../prompts/llmNarrator/payrollNarratorPrompt");
const { payrollNarratorSchema } = require("../../schemas/llmNarrator/payrollNarratorSchema");
const { getOpenAiClient } = require("../salarySlipAnalyzer/openaiClient");

async function narratePayroll({ finance, question, history }) {
  validateNarrationInput({ finance, question });

  const client = getOpenAiClient();
  const request = buildPayrollNarratorRequest({ finance, question, history });
  const completion = await client.chat.completions.create(request);
  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    const err = new Error("OpenAI returned an empty payroll narration.");
    err.statusCode = 502;
    err.code = "EMPTY_NARRATOR_RESPONSE";
    throw err;
  }

  return {
    narration: JSON.parse(content),
    usage: completion.usage || null,
    model: completion.model || request.model,
    request
  };
}

function buildPayrollNarratorRequest({ finance, question, history = [] }) {
  return {
    model: env.openAiModel,
    messages: buildPayrollNarratorPrompt({ finance, question, history }),
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "payroll_narration",
        strict: true,
        schema: payrollNarratorSchema
      }
    }
  };
}

function validateNarrationInput({ finance, question }) {
  if (!finance || typeof finance !== "object") {
    const err = new Error("finance object is required.");
    err.statusCode = 400;
    err.code = "FINANCE_REQUIRED";
    throw err;
  }

  if (!finance.payroll || !finance.calculated) {
    const err = new Error("finance.payroll and finance.calculated are required.");
    err.statusCode = 400;
    err.code = "INVALID_FINANCE_PAYLOAD";
    throw err;
  }

  if (typeof question !== "string" || !question.trim()) {
    const err = new Error("question is required.");
    err.statusCode = 400;
    err.code = "QUESTION_REQUIRED";
    throw err;
  }
}

module.exports = {
  narratePayroll,
  buildPayrollNarratorRequest
};

const { env } = require("../../config/env");
const { buildPayrollNarratorPrompt } = require("../../prompts/llmNarrator/payrollNarratorPrompt");
const { payrollNarratorSchema } = require("../../schemas/llmNarrator/payrollNarratorSchema");
const { buildSourceReference } = require("../financeLogic/payrollCalculator");
const { isOpenAiProvider, queryLLM } = require("../llm/llmProvider");
const { buildNarrationFallback } = require("./narrationFallback");

async function narratePayroll({ finance, question, history, analysis }) {
  validateNarrationInput({ finance, question });

  const request = buildPayrollNarratorRequest({ finance, question, history, analysis });
  let llmResult;
  try {
    llmResult = isOpenAiProvider()
      ? await queryLLM({ openAiRequest: request })
      : await queryLLM({
          prompt: buildNarratorWrapperPrompt(request.messages),
          metadata: {
            flow: "payroll-narration"
          }
        });
  } catch (err) {
    return {
      narration: buildNarrationFallback({ finance: withSourceReference(finance, analysis), question }),
      usage: null,
      model: "deterministic-fallback",
      request,
      fallbackReason: err.code || err.message
    };
  }

  if (!llmResult.content) {
    const err = new Error("LLM provider returned an empty payroll narration.");
    err.statusCode = 502;
    err.code = "EMPTY_NARRATOR_RESPONSE";
    throw err;
  }

  return {
    narration: isOpenAiProvider() ? JSON.parse(llmResult.content) : normalizeNarratorWrapperContent(llmResult.content),
    usage: llmResult.usage || null,
    model: llmResult.model || request.model,
    request: llmResult.request
  };
}

function buildPayrollNarratorRequest({ finance, question, history = [], analysis }) {
  const groundedFinance = withSourceReference(finance, analysis);

  return {
    model: env.openAiModel,
    messages: buildPayrollNarratorPrompt({ finance: groundedFinance, question, history }),
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

function buildNarratorWrapperPrompt(messages) {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

function normalizeNarratorWrapperContent(content) {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.answer === "string") {
      return { answer: parsed.answer };
    }
  } catch (_err) {
    // Wrapper narration can be plain text.
  }

  return { answer: String(content || "").trim() };
}

function withSourceReference(finance, analysis) {
  if (finance?.source_reference) {
    return finance;
  }

  return {
    ...finance,
    source_reference: buildSourceReference(finance?.payroll || {}, finance?.calculated || {}, analysis || {})
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
  buildPayrollNarratorRequest,
  buildNarratorWrapperPrompt,
  withSourceReference
};

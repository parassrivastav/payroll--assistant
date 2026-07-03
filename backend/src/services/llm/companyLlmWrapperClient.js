const { randomUUID } = require("crypto");
const { env } = require("../../config/env");

async function queryCompanyWrapper({
  prompt,
  pdfBase64,
  imageBase64,
  imageMediaType,
  metadata = {}
}) {
  if (!env.llmWrapperApiToken) {
    const err = new Error("LLM_WRAPPER_API_TOKEN is required when USE_OPENAI=false.");
    err.statusCode = 500;
    err.code = "LLM_WRAPPER_TOKEN_MISSING";
    throw err;
  }

  const requestBody = {
    prompt,
    metadata: {
      client: "payroll-ai-agent",
      traceId: randomUUID(),
      ...metadata
    }
  };

  if (pdfBase64) {
    requestBody.pdfBase64 = pdfBase64;
  }

  if (imageBase64) {
    requestBody.imageBase64 = imageBase64;
    requestBody.imageMediaType = imageMediaType;
  }

  const response = await fetch(`${env.llmWrapperBaseUrl.replace(/\/$/, "")}/llm/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.llmWrapperApiToken}`
    },
    body: JSON.stringify(requestBody)
  });

  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }));

  if (!response.ok) {
    const err = new Error(payload.error?.message || payload.message || `LLM wrapper request failed with status ${response.status}.`);
    err.statusCode = 502;
    err.code = "LLM_WRAPPER_REQUEST_FAILED";
    throw err;
  }

  return {
    content: normalizeWrapperText(payload),
    usage: null,
    model: "company-llm-wrapper",
    request: redactWrapperRequest(requestBody)
  };
}

function normalizeWrapperText(payload) {
  if (typeof payload === "string") return payload;
  if (typeof payload.text === "string") return payload.text;
  if (typeof payload.response === "string") return payload.response;
  if (typeof payload.result === "string") return payload.result;
  if (typeof payload.answer === "string") return payload.answer;
  if (typeof payload.output === "string") return payload.output;
  if (payload.data && typeof payload.data.text === "string") return payload.data.text;

  return JSON.stringify(payload);
}

function redactWrapperRequest(requestBody) {
  return {
    prompt: requestBody.prompt,
    metadata: requestBody.metadata,
    hasPdfBase64: Boolean(requestBody.pdfBase64),
    hasImageBase64: Boolean(requestBody.imageBase64),
    imageMediaType: requestBody.imageMediaType || null
  };
}

module.exports = { queryCompanyWrapper };

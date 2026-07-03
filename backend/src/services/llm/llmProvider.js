const { env } = require("../../config/env");
const { getOpenAiClient } = require("../salarySlipAnalyzer/openaiClient");
const { queryCompanyWrapper } = require("./companyLlmWrapperClient");

async function queryLLM({
  prompt,
  messages,
  response_format,
  pdfBase64,
  imageBase64,
  imageMediaType,
  metadata,
  openAiRequest
}) {
  if (env.useOpenAi) {
    return queryOpenAi({ messages, response_format, openAiRequest });
  }

  return queryCompanyWrapper({
    prompt,
    pdfBase64,
    imageBase64,
    imageMediaType,
    metadata
  });
}

async function queryOpenAi({ messages, response_format, openAiRequest }) {
  const request = openAiRequest || {
    model: env.openAiModel,
    messages,
    response_format
  };
  const completion = await getOpenAiClient().chat.completions.create(request);
  const content = completion.choices?.[0]?.message?.content;

  if (!content) {
    const err = new Error("OpenAI returned an empty LLM response.");
    err.statusCode = 502;
    err.code = "EMPTY_LLM_RESPONSE";
    throw err;
  }

  return {
    content,
    usage: completion.usage || null,
    model: completion.model || request.model,
    request
  };
}

function isOpenAiProvider() {
  return env.useOpenAi;
}

module.exports = {
  queryLLM,
  isOpenAiProvider
};

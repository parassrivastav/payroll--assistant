const OpenAI = require("openai");
const { env } = require("../config/env");

let client;

function getOpenAiClient() {
  if (!env.openAiApiKey || env.openAiApiKey === "replace_with_your_openai_api_key") {
    const err = new Error("OPENAI_API_KEY is not configured.");
    err.statusCode = 500;
    err.code = "OPENAI_API_KEY_MISSING";
    throw err;
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.openAiApiKey });
  }

  return client;
}

module.exports = { getOpenAiClient };

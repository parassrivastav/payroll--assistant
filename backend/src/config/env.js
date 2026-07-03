require("dotenv").config();

const env = {
  port: Number(process.env.PORT || 4000),
  useOpenAi: process.env.USE_OPENAI !== "false",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  llmWrapperBaseUrl: process.env.LLM_WRAPPER_BASE_URL || "https://llm-wrapper-741152993481.asia-south1.run.app",
  llmWrapperApiToken: process.env.LLM_WRAPPER_API_TOKEN,
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  sqliteDbPath: process.env.SQLITE_DB_PATH || "data/payroll-assistant.sqlite"
};

module.exports = { env };

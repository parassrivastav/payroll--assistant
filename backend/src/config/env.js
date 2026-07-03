require("dotenv").config();

const env = {
  port: Number(process.env.PORT || 4000),
  useOpenAi: process.env.USE_OPENAI !== "false",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  llmWrapperBaseUrl: process.env.LLM_WRAPPER_BASE_URL || "https://llm-wrapper-741152993481.asia-south1.run.app",
  llmWrapperApiToken: process.env.LLM_WRAPPER_API_TOKEN,
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  sqliteDbPath: process.env.SQLITE_DB_PATH || "data/payroll-assistant.sqlite",
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
  uploadRateLimitMax: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 20),
  chatRateLimitMax: Number(process.env.CHAT_RATE_LIMIT_MAX || 60),
  warmOcrOnStartup: process.env.WARM_OCR_ON_STARTUP === "true"
};

module.exports = { env };

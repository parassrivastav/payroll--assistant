require("dotenv").config();

const env = {
  port: Number(process.env.PORT || 4000),
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10)
};

module.exports = { env };

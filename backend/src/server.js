const app = require("./app");
const { env } = require("./config/env");
const { warmupOcrWorker } = require("./services/salarySlipAnalyzer/ocrService");

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);

  if (env.warmOcrOnStartup) {
    warmupOcrWorker()
      .then(() => console.log("OCR worker warmed."))
      .catch((err) => console.warn("OCR worker warmup failed:", err.message));
  }
});

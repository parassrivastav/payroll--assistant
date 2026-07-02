const fs = require("fs/promises");
const path = require("path");
const { extractDocumentTextWithDetails } = require("../src/services/documentTextExtractor");
const { shutdownOcrWorker } = require("../src/services/ocrService");
const { maskPii } = require("../src/services/piiSanitizer");
const { analyzePayslipText, buildSalarySlipRequest } = require("../src/services/salarySlipAnalyzer");

const DEFAULT_DIR = path.resolve(__dirname, "../../salary-slips");

async function main() {
  const targetPath = path.resolve(process.argv[2] || DEFAULT_DIR);
  const files = await resolveFiles(targetPath);

  if (!files.length) {
    throw new Error(`No supported salary slip files found at ${targetPath}`);
  }

  for (const filePath of files) {
    await runOne(filePath);
  }
}

async function resolveFiles(targetPath) {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    return [targetPath];
  }

  const entries = await fs.readdir(targetPath);
  return entries
    .filter((entry) => /\.(pdf|docx|txt|png|jpe?g|webp)$/i.test(entry))
    .sort()
    .map((entry) => path.join(targetPath, entry));
}

async function runOne(filePath) {
  const file = await toUploadFile(filePath);

  console.log("\n============================================================");
  console.log(`STEP 1 - Document selected: ${safeFileLabel(filePath)}`);
  console.log(`MIME type: ${file.mimetype}`);
  console.log(`Size: ${file.buffer.length} bytes`);

  const extraction = await extractDocumentTextWithDetails({ file });
  console.log("\nSTEP 2 - Text extraction");
  console.log(`Extraction method: ${extraction.method}`);
  console.log(`Extracted characters: ${extraction.text.length}`);
  console.log("Raw text is intentionally not printed.");

  const sanitized = maskPii(extraction.text);
  console.log("\nSTEP 3 - PII masking");
  console.log(`Sanitized characters: ${sanitized.text.length}`);
  console.log("Redactions:");
  console.log(JSON.stringify(sanitized.redactions, null, 2));
  console.log("\nSanitized document text sent to prompt:");
  console.log(sanitized.text);

  const request = buildSalarySlipRequest(sanitized.text);
  console.log("\nSTEP 4 - Prompt and structured response contract sent to LLM");
  console.log(JSON.stringify({
    model: request.model,
    messages: request.messages,
    response_format: request.response_format
  }, null, 2));

  console.log("\nSTEP 5 - LLM structured response");
  const result = await analyzePayslipText(sanitized.text);
  console.log(JSON.stringify({
    model: result.model,
    usage: result.usage,
    analysis: result.analysis
  }, null, 2));
}

function safeFileLabel(filePath) {
  return `[REDACTED_FILENAME]${path.extname(filePath).toLowerCase()}`;
}

async function toUploadFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return {
    buffer,
    originalname: path.basename(filePath),
    mimetype: mimeTypeFor(filePath)
  };
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".txt") return "text/plain";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownOcrWorker();
  });

const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { ocrImageBuffer } = require("./ocrService");

const execFileAsync = promisify(execFile);
const MIN_PDF_TEXT_CHARS = 40;

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

async function extractDocumentText({ file, text }) {
  const result = await extractDocumentTextWithDetails({ file, text });
  return result.text;
}

async function extractDocumentTextWithDetails({ file, text }) {
  if (typeof text === "string" && text.trim()) {
    return {
      text: normalizeText(text),
      method: "json_text"
    };
  }

  if (!file) {
    const err = new Error("Upload a salary slip file or send JSON with a non-empty text field.");
    err.statusCode = 400;
    err.code = "MISSING_DOCUMENT";
    throw err;
  }

  const mimetype = normalizeMimeType(file);

  if (!SUPPORTED_MIME_TYPES.has(mimetype)) {
    const err = new Error("Unsupported salary slip format. Upload PDF, DOCX, TXT, PNG, JPG, or WEBP so text can be sanitized before LLM analysis.");
    err.statusCode = 415;
    err.code = "UNSUPPORTED_DOCUMENT_TYPE";
    throw err;
  }

  if (mimetype === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    const parsedText = softNormalizeText(parsed.text);

    if (parsedText.length >= MIN_PDF_TEXT_CHARS) {
      return {
        text: parsedText,
        method: "pdf_text_layer"
      };
    }

    return {
      text: normalizeText(await ocrPdfBuffer(file.buffer)),
      method: "pdf_ocr"
    };
  }

  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const parsed = await mammoth.extractRawText({ buffer: file.buffer });
    return {
      text: normalizeText(parsed.value),
      method: "docx_text"
    };
  }

  if (mimetype.startsWith("image/")) {
    return {
      text: normalizeText(await ocrImageBuffer(file.buffer)),
      method: "image_ocr"
    };
  }

  return {
    text: normalizeText(file.buffer.toString("utf8")),
    method: "txt_text"
  };
}

function normalizeMimeType(file) {
  if (SUPPORTED_MIME_TYPES.has(file.mimetype)) {
    return file.mimetype;
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".txt") return "text/plain";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";

  return file.mimetype;
}

function normalizeText(text) {
  const normalized = softNormalizeText(text);

  if (!normalized) {
    const err = new Error("Could not extract readable text from the salary slip.");
    err.statusCode = 422;
    err.code = "EMPTY_DOCUMENT_TEXT";
    throw err;
  }

  return normalized;
}

function softNormalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function ocrPdfBuffer(buffer) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "salary-slip-ocr-"));
  const pdfPath = path.join(tempDir, "input.pdf");
  const outputPrefix = path.join(tempDir, "page");

  try {
    await fs.writeFile(pdfPath, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "220", pdfPath, outputPrefix]);
    const pageFiles = (await fs.readdir(tempDir))
      .filter((fileName) => /^page-\d+\.png$/.test(fileName))
      .sort()
      .map((fileName) => path.join(tempDir, fileName));

    if (!pageFiles.length) {
      return "";
    }

    const pageTexts = [];
    for (const pageFile of pageFiles) {
      const pageBuffer = await fs.readFile(pageFile);
      pageTexts.push(await ocrImageBuffer(pageBuffer));
    }

    return pageTexts.join("\n\n");
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

module.exports = { extractDocumentText, extractDocumentTextWithDetails };

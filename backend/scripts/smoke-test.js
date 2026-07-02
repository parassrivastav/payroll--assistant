const { maskPii } = require("../src/services/salarySlipAnalyzer/piiSanitizer");
const { buildSalarySlipPrompt } = require("../src/prompts/salarySlipAnalyzer/salarySlipPrompt");

const sample = `
Employee Name: Priya Sharma
PAN: ABCDE1234F
UAN: 123456789012
Email: priya@example.com
Pay Date: June 1 2024
Basic Salary 100000
HRA 2000
Special Allowance 12000
PF 1800
Professional Tax 200
TDS 5000
Gross Pay 114000
Net Pay 107000
`;

const sanitized = maskPii(sample);
const prompt = buildSalarySlipPrompt(sanitized.text);

if (sanitized.text.includes("Priya") || sanitized.text.includes("ABCDE1234F")) {
  throw new Error("PII sanitizer smoke test failed.");
}

if (!prompt[0].content || !prompt[1].content.includes("Sanitized salary slip text")) {
  throw new Error("Prompt builder smoke test failed.");
}

console.log("Smoke test passed.");
console.log(JSON.stringify({ redactions: sanitized.redactions }, null, 2));

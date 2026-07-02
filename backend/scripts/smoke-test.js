const { maskPii } = require("../src/services/salarySlipAnalyzer/piiSanitizer");
const { buildSalarySlipPrompt } = require("../src/prompts/salarySlipAnalyzer/salarySlipPrompt");
const { buildPayrollFinancePayload } = require("../src/services/financeLogic/payrollCalculator");

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

const finance = buildPayrollFinancePayload({
  pay_period: "June 2026",
  date: null,
  basic: { amount: 50000, currency: "INR" },
  hra: { amount: 20000, currency: "INR" },
  lta: { amount: null, currency: null },
  special_allowance: { amount: 20000, currency: "INR" },
  provident_fund: { amount: 6000, currency: "INR" },
  professional_tax: { amount: null, currency: null },
  income_tax_tds: { amount: 3500, currency: "INR" },
  reimbursements: { amount: 0, currency: "INR" },
  gross_pay: { amount: 90000, currency: "INR" },
  net_pay: { amount: 80500, currency: "INR" }
});

if (finance.calculated.total_deductions !== 9500 || finance.calculated.calculated_net !== 80500) {
  throw new Error("Finance logic smoke test failed.");
}

console.log("Smoke test passed.");
console.log(JSON.stringify({ redactions: sanitized.redactions }, null, 2));

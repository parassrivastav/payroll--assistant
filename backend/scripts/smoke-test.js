const { maskPii } = require("../src/services/salarySlipAnalyzer/piiSanitizer");
const { buildSalarySlipPrompt } = require("../src/prompts/salarySlipAnalyzer/salarySlipPrompt");
const { buildPayrollFinancePayload } = require("../src/services/financeLogic/payrollCalculator");
const { buildPayrollNarratorRequest } = require("../src/services/llmNarrator/payrollNarrator");
const { normalizeWrapperPayslipJson } = require("../src/services/salarySlipAnalyzer/salarySlipAnalyzer");
const { simulateSection80C } = require("../src/services/financeLogic/section80CSimulator");
const { getInvestmentProofChecklist } = require("../src/services/financeLogic/investmentProofChecklist");
const { buildMonthComparison } = require("../src/services/financeLogic/monthComparisonService");

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
const wrapperAnalysis = normalizeWrapperPayslipJson({
  month: "June 2026",
  basic_salary: 50000,
  hra: 20000,
  year_to_date: { gross_pay: 540000, tds: 21000, pf: 36000 }
});

if (sanitized.text.includes("Priya") || sanitized.text.includes("ABCDE1234F")) {
  throw new Error("PII sanitizer smoke test failed.");
}

if (!prompt[0].content || !prompt[1].content.includes("Sanitized salary slip text")) {
  throw new Error("Prompt builder smoke test failed.");
}

if (
  wrapperAnalysis.pay_period !== "June 2026" ||
  wrapperAnalysis.basic.amount !== 50000 ||
  wrapperAnalysis.year_to_date.income_tax_tds.amount !== 21000
) {
  throw new Error("Wrapper payslip normalization smoke test failed.");
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

if (
  finance.source_reference.hra.source !== "Payslip → Earnings → HRA" ||
  finance.source_reference.professional_tax.source !== null
) {
  throw new Error("Payroll source reference smoke test failed.");
}

const narratorRequest = buildPayrollNarratorRequest({
  finance,
  question: "Why is my net salary lower?"
});

if (
  narratorRequest.messages.length !== 2 ||
  narratorRequest.response_format.type !== "json_schema" ||
  !narratorRequest.messages[0].content.includes("Never invent a source") ||
  !narratorRequest.messages[1].content.includes("SOURCE REFERENCE JSON") ||
  !narratorRequest.messages[1].content.includes("Payslip → Earnings → HRA")
) {
  throw new Error("Payroll narrator smoke test failed.");
}

const taxSimulation = simulateSection80C({
  additionalInvestment: 50000,
  alreadyDeclared80C: 120000
});

if (taxSimulation.result.eligible_extra_80c !== 30000 || taxSimulation.result.estimated_tax_saving !== 6000) {
  throw new Error("80C simulator smoke test failed.");
}

const proofChecklist = getInvestmentProofChecklist();

if (proofChecklist.summary.missing_count !== 2 || !proofChecklist.summary.missing_items.includes("ELSS")) {
  throw new Error("Proof checklist smoke test failed.");
}

const monthComparison = buildMonthComparison([]);

if (
  monthComparison.source !== "mock" ||
  monthComparison.differences.gross_pay.difference.amount !== -3000 ||
  monthComparison.differences.income_tax_tds.difference.amount !== 1000 ||
  monthComparison.differences.reimbursements.difference.amount !== -3000
) {
  throw new Error("Month comparison smoke test failed.");
}

console.log("Smoke test passed.");
console.log(JSON.stringify({ redactions: sanitized.redactions }, null, 2));

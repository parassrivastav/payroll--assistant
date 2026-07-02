const SYSTEM_PROMPT = `
You are a payroll document extraction engine.
Extract salary slip fields from sanitized text only.
Return only valid JSON that matches the requested schema.
Do not infer personal identifiers, names, addresses, phone numbers, email addresses, account numbers, IDs, PAN, Aadhaar, or UAN.
Use null when a field is absent or unreadable.
Normalize dates to ISO 8601 date format YYYY-MM-DD when possible.
Normalize all monetary amounts to numbers without separators or currency symbols.
Use INR as the default currency for Indian salary slips unless another currency is clearly present.
`.trim();

const USER_QUERY = `
Analyze this sanitized salary slip text and extract payroll components:
- basic salary
- HRA
- LTA
- special allowance
- provident fund
- professional tax
- income tax/TDS
- reimbursements
- gross pay
- net pay
- year-to-date values

Sanitized salary slip text:
{{SANITIZED_SALARY_SLIP_TEXT}}
`.trim();

function buildSalarySlipPrompt(sanitizedText) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: USER_QUERY.replace("{{SANITIZED_SALARY_SLIP_TEXT}}", sanitizedText)
    }
  ];
}

module.exports = {
  SYSTEM_PROMPT,
  USER_QUERY,
  buildSalarySlipPrompt
};

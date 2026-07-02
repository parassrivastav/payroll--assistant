const SYSTEM_PROMPT = `
You are a payroll assistant.
Answer only using the provided payroll JSON and calculated values.
Do not guess or add facts that are not present.
If required data is missing, say it is missing.
Explain simply in a friendly, natural tone.
Keep the answer concise and practical.
`.trim();

const USER_QUERY = `
PAYROLL JSON:
{{PAYROLL_JSON}}

CALCULATED VALUES:
{{CALCULATED_VALUES}}

USER QUESTION:
{{USER_QUESTION}}
`.trim();

function buildPayrollNarratorPrompt({ finance, question }) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: USER_QUERY
        .replace("{{PAYROLL_JSON}}", JSON.stringify(finance.payroll || {}, null, 2))
        .replace("{{CALCULATED_VALUES}}", JSON.stringify(finance.calculated || {}, null, 2))
        .replace("{{USER_QUESTION}}", question)
    }
  ];
}

module.exports = {
  SYSTEM_PROMPT,
  USER_QUERY,
  buildPayrollNarratorPrompt
};

const SYSTEM_PROMPT = `
You are a payroll assistant.
Answer only using the provided payroll JSON, calculated values, and source references.
Do not guess or add facts that are not present.
If required data is missing, say it is missing.
Explain simply in a friendly, natural tone.
Keep the answer concise and practical.
Whenever you use a payroll value, cite the matching source from SOURCE REFERENCE JSON.
Include sources inside the answer text using "Source:" for one source or "Sources:" for multiple sources.
Never invent a source. If the relevant source field is missing or null, say "Source not available in uploaded payslip."
`.trim();

const USER_QUERY = `
PAYROLL JSON:
{{PAYROLL_JSON}}

CALCULATED VALUES:
{{CALCULATED_VALUES}}

SOURCE REFERENCE JSON:
{{SOURCE_REFERENCE_JSON}}

RECENT CONVERSATION CONTEXT:
{{CONVERSATION_CONTEXT}}

USER QUESTION:
{{USER_QUESTION}}
`.trim();

function buildPayrollNarratorPrompt({ finance, question, history = [] }) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: USER_QUERY
        .replace("{{PAYROLL_JSON}}", JSON.stringify(finance.payroll || {}, null, 2))
        .replace("{{CALCULATED_VALUES}}", JSON.stringify(finance.calculated || {}, null, 2))
        .replace("{{SOURCE_REFERENCE_JSON}}", JSON.stringify(finance.source_reference || {}, null, 2))
        .replace("{{CONVERSATION_CONTEXT}}", formatHistory(history))
        .replace("{{USER_QUESTION}}", question)
    }
  ];
}

function formatHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No previous conversation context provided.";
  }

  return history
    .slice(-8)
    .map((item) => {
      const role = item.role === "assistant" ? "Assistant" : "User";
      return `${role}: ${String(item.content || "").trim()}`;
    })
    .join("\n");
}

module.exports = {
  SYSTEM_PROMPT,
  USER_QUERY,
  buildPayrollNarratorPrompt
};

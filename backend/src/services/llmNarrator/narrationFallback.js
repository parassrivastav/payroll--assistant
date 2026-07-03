function buildNarrationFallback({ finance, question }) {
  const payroll = finance?.payroll || {};
  const calculated = finance?.calculated || {};
  const sourceReference = finance?.source_reference || {};
  const lowerQuestion = String(question || "").toLowerCase();
  const lines = [];
  const sources = new Set();

  if (lowerQuestion.includes("net")) {
    lines.push(`Net pay is ${formatMoney(payroll.net, payroll.currency)}.`);
    addSource(sources, sourceReference.net_pay);
  }

  if (lowerQuestion.includes("gross")) {
    lines.push(`Gross pay is ${formatMoney(payroll.gross, payroll.currency)}.`);
    addSource(sources, sourceReference.gross_pay);
  }

  if (lowerQuestion.includes("deduction") || lowerQuestion.includes("lower") || lowerQuestion.includes("why")) {
    lines.push(`Total deductions are ${formatMoney(calculated.total_deductions, payroll.currency)}.`);
    addSource(sources, sourceReference.total_deductions);
  }

  if (!lines.length) {
    lines.push("I could not reach the LLM, but the saved payroll summary is still available.");
    if (typeof payroll.gross === "number") lines.push(`Gross pay: ${formatMoney(payroll.gross, payroll.currency)}.`);
    if (typeof payroll.net === "number") lines.push(`Net pay: ${formatMoney(payroll.net, payroll.currency)}.`);
    addSource(sources, sourceReference.gross_pay);
    addSource(sources, sourceReference.net_pay);
  }

  const sourceLines = [...sources].filter(Boolean);
  const sourceBlock = sourceLines.length
    ? `\n\nSources:\n${sourceLines.map((source) => `- ${source}`).join("\n")}`
    : "\n\nSource not available in uploaded payslip.";

  return {
    answer: `${lines.join(" ")}${sourceBlock}`,
    fallback: true
  };
}

function addSource(sources, reference) {
  if (reference?.source) {
    sources.add(reference.source);
  }
}

function formatMoney(value, currency = "INR") {
  if (typeof value !== "number") return "not available";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  }).format(value);
}

module.exports = { buildNarrationFallback };

const MOCK_PROOF_ITEMS = [
  {
    key: "ppf",
    label: "PPF",
    declared_amount: 50000,
    proof_status: "submitted"
  },
  {
    key: "elss",
    label: "ELSS",
    declared_amount: 40000,
    proof_status: "missing"
  },
  {
    key: "hra_rent_receipts",
    label: "HRA rent receipts",
    declared_amount: 120000,
    proof_status: "missing"
  }
];

function getInvestmentProofChecklist() {
  const items = MOCK_PROOF_ITEMS.map((item) => ({ ...item }));
  const missingItems = items.filter((item) => item.proof_status === "missing");

  return {
    items,
    summary: {
      total_items: items.length,
      submitted_count: items.length - missingItems.length,
      missing_count: missingItems.length,
      missing_items: missingItems.map((item) => item.label),
      missing_proof_summary: missingItems.length
        ? `Missing proofs: ${missingItems.map((item) => item.label).join(", ")}.`
        : "All mock proof items are submitted."
    },
    note: "This is a mocked proof checklist for demo purposes."
  };
}

module.exports = { getInvestmentProofChecklist };

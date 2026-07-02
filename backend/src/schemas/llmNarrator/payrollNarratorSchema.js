const payrollNarratorSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: {
      type: "string",
      description: "Simple natural-language answer based only on the provided payroll JSON."
    }
  },
  required: ["answer"]
};

module.exports = { payrollNarratorSchema };

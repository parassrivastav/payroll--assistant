# Assumptions And Limitations

## Assumptions

- Section 80C limit is `₹150000`.
- Assumed tax rate is `20%`.
- Proof checklist items are mocked.
- Month comparison uses latest two uploaded payrolls, otherwise deterministic May/June mock payrolls.
- Auth uses fake bearer tokens for assignment evaluation.

## Limitations

- Mocked OCR/extraction may be used.
- Simplified tax logic only.
- Not production payroll or tax compliance.
- Not production-grade encryption or security certification.
- Real PDF/image PII redaction would need a stronger OCR/PDF redaction pipeline.
- LLM extraction quality depends on readable text/OCR quality.
- Audit logging is in-memory and intended for tests/demo only.

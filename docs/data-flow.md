# Data Flow

## Main Flow

`upload → sanitize → extract → validate → calculate → narrate`

1. User logs in and sends a payslip.
2. Backend reads text from the uploaded document or request text.
3. PII sanitizer masks common PII before LLM extraction.
4. LLM returns structured payslip JSON.
5. Backend stores the JSON payload in SQLite.
6. Finance logic creates flat payroll JSON and calculated values.
7. Summary endpoints expose structured salary information and validation warnings.
8. Narrator receives payroll JSON, calculation JSON, source reference JSON, and the user question.

## Source References

Each payroll field can include a source reference such as:

```json
{
  "hra": {
    "value": 20000,
    "source": "Payslip → Earnings → HRA"
  }
}
```

The narrator must cite these source values and say `Source not available in uploaded payslip.` when no source exists.

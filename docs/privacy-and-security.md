# Privacy And Security

## Authentication

Authentication is simulated for assignment purposes. `/auth/login` returns fake bearer tokens for:

- `emp_001`
- `emp_002`
- `admin_001`

Protected endpoints require:

```http
Authorization: Bearer <token>
```

## Ownership

Employees can access only their own payroll data. If `emp_001` requests `emp_002` payroll data, the backend returns `403`. The mock payroll admin can access employee summaries in this demo.

## PII Handling

The sanitizer masks common PII before sending text to the extraction LLM. Audit logs intentionally avoid raw payslip text, base64 data, PAN, bank details, and unnecessary PII.

## CORS, Rate Limits, And Validation

- CORS uses `CORS_ALLOWED_ORIGINS` instead of allowing every browser origin.
- General, login, upload, and chat rate limits protect the API from accidental abuse.
- Chat questions are validated for string type, required content, and maximum length.

## Limitations

This is not production-grade security. Real PDF/image PII redaction would require stronger OCR, coordinate-aware PDF/image redaction, encryption controls, secrets management, and security review.

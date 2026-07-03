# Payroll Assistant

Payroll Assistant is an assignment-ready demo with a Node/Express backend and a simple React dashboard. It lets an employee upload a payslip, extracts structured payroll data, performs deterministic finance calculations, and answers payroll questions through a grounded LLM narrator.

## Assignment Objective

Demonstrate an end-to-end payroll assistant flow:

- Upload payslip documents.
- Sanitize PII before LLM extraction.
- Extract structured payroll JSON.
- Validate and calculate salary values in backend code.
- Answer payroll questions using only provided payroll data.
- Provide simple auth, ownership checks, audit logs, tax simulation, proof checklist, and month comparison.

## Architecture Overview

- `frontend/`: React dashboard for upload, salary summary, breakdown, month comparison, chat, 80C simulator, and proof checklist.
- `backend/`: Express API with modules for salary slip analysis, finance logic, LLM narration, mock auth, and audit logging.
- `backend/src/prompts`: LLM prompts for extraction and narration.
- `backend/src/services/financeLogic`: deterministic calculations and summaries.
- `backend/data`: local SQLite JSON document storage, ignored by git.

## Data Flow

`upload → sanitize → extract → validate → calculate → narrate`

1. User logs in as a mock employee and uploads a payslip.
2. Backend extracts text from PDF/DOCX/TXT/image inputs.
3. PII sanitizer masks common PII before LLM extraction.
4. LLM extraction returns structured payslip JSON.
5. Backend stores extracted JSON locally and builds flat payroll finance JSON.
6. Backend calculates totals, deductions, validation warnings, comparisons, and 80C results deterministically.
7. LLM narrator receives payroll JSON, calculation JSON, and source reference JSON to answer user questions.

## Structured Payroll Data

The analyzer output contains payslip fields such as basic salary, HRA, LTA, special allowance, reimbursements, PF, professional tax, TDS, gross pay, net pay, and YTD values. The finance layer converts those values into a flatter payroll JSON and calculated values for UI and narration.

Uploaded payslip data is stored as JSON in SQLite for local demo use. Raw extracted payslip text is not stored in audit logs.

## LLM Usage

The LLM is used only for:

- Payroll extraction from sanitized payslip text.
- Natural-language narration from already extracted payroll JSON.

The narrator prompt includes:

- `payroll_json`
- `calculation_json`
- `source_reference_json`

The narrator is instructed to cite available source fields and never invent sources.

## LLM Provider Switch

The backend supports two LLM providers through one provider abstraction:

- OpenAI flow, enabled by default.
- Company LLM wrapper, enabled when `USE_OPENAI=false`.

Default behavior is:

```env
USE_OPENAI=true
```

OpenAI setup:

```env
USE_OPENAI=true
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.5
```

Company wrapper setup:

```env
USE_OPENAI=false
LLM_WRAPPER_BASE_URL=https://llm-wrapper-741152993481.asia-south1.run.app
LLM_WRAPPER_API_TOKEN=your_wrapper_token
```

When `USE_OPENAI=false`, the app sends narration as text prompts to the wrapper. For payslip extraction, PDF and image uploads are sent as raw base64 attachments without a `data:...;base64,` prefix.

Wrapper text payload:

```json
{
  "prompt": "Hello",
  "metadata": {
    "client": "payroll-ai-agent",
    "traceId": "uuid",
    "flow": "payroll-narration"
  }
}
```

Wrapper PDF payload:

```json
{
  "prompt": "Summarize this document.",
  "pdfBase64": "RAW_BASE64_PDF_WITHOUT_DATA_PREFIX",
  "metadata": {
    "client": "payroll-ai-agent",
    "traceId": "uuid",
    "flow": "payslip-extraction"
  }
}
```

Wrapper image payload:

```json
{
  "prompt": "What is in this image?",
  "imageBase64": "RAW_BASE64_IMAGE_WITHOUT_DATA_PREFIX",
  "imageMediaType": "image/png",
  "metadata": {
    "client": "payroll-ai-agent",
    "traceId": "uuid",
    "flow": "payslip-extraction"
  }
}
```

Allowed wrapper image media types are `image/jpeg`, `image/png`, `image/gif`, and `image/webp`. If `USE_OPENAI=false` and `LLM_WRAPPER_API_TOKEN` is missing, the backend returns a clear configuration error and does not silently fall back to OpenAI.

## Deterministic Backend Calculations

Gross/net checks, total earnings, total deductions, calculated net pay, month comparison, 80C simulation, and proof checklist summaries are all computed in backend code. This keeps business logic repeatable and easy to test.

## Authentication and Ownership

Auth is intentionally simulated. Login returns a fake bearer token.

Mock users:

- `emp_001` as `EMPLOYEE`
- `emp_002` as `EMPLOYEE`
- `admin_001` as `PAYROLL_ADMIN`

Protected requests use:

```http
Authorization: Bearer mock-token-emp_001
```

Employees can access only their own payroll, upload, chat, tax, checklist, and document-derived data. A payroll admin can access employee summaries in this demo.

## Audit Logging

Audit logs are kept in a lightweight in-memory array for demo/testing. Logged actions include login, payslip upload, payroll summary view, chat query, tax simulation, and proof checklist view.

Audit entries include timestamp, user id, role, employee id, action, and minimal metadata. They intentionally avoid raw payslip content, base64 data, PAN, bank account details, and full extracted salary slip text.

## Mocked Data

When uploaded history is unavailable, the app uses deterministic mock payroll data for summary and May/June month comparison. The proof checklist is also mocked with PPF, ELSS, and HRA rent receipts.

## Simplified Tax Assumptions

The Section 80C simulator is intentionally simplified:

- 80C limit: `₹150000`
- Assumed tax rate: `20%`
- Eligible extra 80C: `min(additional investment, remaining 80C limit)`
- Estimated tax saving: `eligible extra 80C * 20%`
- This is not tax advice.

## Setup

Backend:

```bash
cd backend
npm install
cp .env.example .env
# set OPENAI_API_KEY or LLM_WRAPPER_API_TOKEN in .env depending on USE_OPENAI
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Tests:

```bash
cd backend
npm test
npm run smoke
```

Frontend build check:

```bash
cd frontend
npm run build
```

## API Usage Examples

Login:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"emp_001"}'
```

Upload payslip text:

```bash
curl -X POST http://localhost:4000/upload-doc/salary-slip \
  -H "Authorization: Bearer mock-token-emp_001" \
  -H "Content-Type: application/json" \
  -d '{"text":"Basic Salary 50000 HRA 20000 Gross Pay 90000 Net Pay 80500"}'
```

Get summary:

```bash
curl http://localhost:4000/payroll/summary \
  -H "Authorization: Bearer mock-token-emp_001"
```

Ask narrator:

```bash
curl -X POST http://localhost:4000/payroll/1/narrate \
  -H "Authorization: Bearer mock-token-emp_001" \
  -H "Content-Type: application/json" \
  -d '{"question":"Why is my net salary lower?"}'
```

Run 80C simulation:

```bash
curl -X POST http://localhost:4000/tax/80c/simulate \
  -H "Authorization: Bearer mock-token-emp_001" \
  -H "Content-Type: application/json" \
  -d '{"alreadyDeclared80C":120000,"additionalInvestment":50000}'
```

## UI Demo Flow

1. Start backend and frontend.
2. Use the mock login selector.
3. Upload a payslip from the chat composer.
4. Review salary summary, breakdown, YTD values, and validation warnings.
5. Review month comparison.
6. Ask a payroll question in chat.
7. Run the 80C simulator.
8. Review the proof checklist.

## Known Limitations

- Mocked OCR/extraction may be used in demo/test paths.
- Tax logic is simplified and not tax advice.
- This is not production payroll or tax compliance software.
- This is not production-grade encryption or security certification.
- Real PDF/image PII redaction would need a stronger OCR/PDF redaction pipeline.
- Auth uses fake bearer tokens, not production JWT/session security.
- Audit logging is in-memory for assignment simplicity.

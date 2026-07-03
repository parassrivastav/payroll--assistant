# Payroll Assistant

Simple payroll assistant demo with a Node/Express backend and React dashboard.

## Features

- Upload payslips as PDF, DOCX, TXT, PNG, JPG, JPEG, or WEBP.
- Extract text locally and OCR image/scanned documents.
- Redact common PII before sending payroll text to the LLM.
- Extract structured payslip JSON with OpenAI structured output.
- Convert extracted payroll JSON into a flat finance payload with calculations.
- Store complete analysis payloads locally as JSON documents in SQLite.
- Ask AI payroll questions from the simplified finance JSON.
- React dashboard with salary cards, salary breakdown, YTD values, chat, tax simulator, and proof checklist.
- Run a simplified Section 80C tax-saving simulator.
- View a mocked investment proof checklist.

## Backend

```bash
cd backend
npm install
cp .env.example .env
# set OPENAI_API_KEY in .env
npm start
```

Backend runs on `http://localhost:4000` by default.

### Backend Endpoints

- `GET /health`
- `POST /upload-doc/salary-slip`
  - multipart fields: `salarySlip` or `file`
  - returns structured `analysis`, flat `finance`, extraction metadata, storage id
- `GET /payroll/:id/summary`
  - returns saved payroll JSON, calculated values, salary breakdown, YTD values
- `POST /payroll/narrate`
  - body: `{ "finance": { "payroll": {}, "calculated": {} }, "question": "...", "history": [] }`
- `POST /payroll/:id/narrate`
  - body: `{ "question": "...", "history": [] }`
- `POST /tax/80c/simulate`
  - body: `{ "alreadyDeclared80C": 80000, "additionalInvestment": 50000 }`
- `GET /investment-proofs/checklist`

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

If the backend runs somewhere else:

```bash
VITE_API_BASE_URL=http://localhost:4000 npm run dev
```

## Simplified Tax Assumptions

The Section 80C simulator is intentionally simplified:

- 80C limit is assumed to be `₹150000`.
- Tax rate is assumed to be `20%`.
- Eligible extra 80C is `min(additional investment, remaining 80C limit)`.
- Estimated tax saving is `eligible extra 80C * 20%`.
- This is a demo assumption and not tax advice.

## Mocked Proof Checklist

The proof checklist is mocked for demo purposes. It includes:

- PPF
- ELSS
- HRA rent receipts

Each item is marked as `submitted` or `missing`, and the backend returns a missing proof summary.

## Demo Flow

1. Start the backend.
2. Start the frontend.
3. Upload a salary slip from the chat composer.
4. Review salary summary cards and salary breakdown table.
5. Ask a payroll question in chat.
6. Run the 80C simulator.
7. Review the investment proof checklist.

The analyzer and finance calculator run only when a new payslip is uploaded. Follow-up chat questions use the saved payroll analysis id and recent chat context.

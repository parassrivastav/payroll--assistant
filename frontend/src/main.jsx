import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  Calculator,
  CheckCircle2,
  FileImage,
  FileText,
  Image,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Upload,
  User,
  X,
  XCircle
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function App() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      type: "text",
      content: "Upload a salary slip, then ask me anything about your payroll."
    }
  ]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [analysisState, setAnalysisState] = useState(null);
  const [summary, setSummary] = useState(null);
  const [proofChecklist, setProofChecklist] = useState(null);
  const [taxInputs, setTaxInputs] = useState({ alreadyDeclared80C: 80000, additionalInvestment: 50000 });
  const [taxResult, setTaxResult] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProofChecklist();
  }, []);

  const canSend = useMemo(() => {
    return !isBusy && (Boolean(file) || input.trim().length > 0);
  }, [file, input, isBusy]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSend) return;

    const question = input.trim();
    const selectedFile = file;

    setInput("");
    setFile(null);

    if (selectedFile) {
      await analyzeSlipAndMaybeAsk(selectedFile, question);
      return;
    }

    await askFollowUp(question);
  }

  async function analyzeSlipAndMaybeAsk(selectedFile, question) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        type: "upload",
        content: question || "Analyze this salary slip.",
        fileName: selectedFile.name
      }
    ]);
    setIsBusy(true);
    setStatus("Analyzing salary slip");

    try {
      const formData = new FormData();
      formData.append("salarySlip", selectedFile);

      const response = await fetch(`${API_BASE_URL}/upload-doc/salary-slip`, {
        method: "POST",
        body: formData
      });

      const payload = await parseJsonResponse(response);
      const nextState = {
        id: payload.id,
        finance: payload.finance,
        analysis: payload.analysis,
        extraction: payload.extraction,
        storage: payload.storage
      };
      setAnalysisState(nextState);
      setSummary(await fetchPayrollSummary(payload.id, payload));

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "analysis",
          content: "I analyzed the salary slip and prepared the payroll dashboard.",
          data: payload
        }
      ]);

      if (question) {
        await askFollowUp(question, {
          explicitId: payload.id,
          explicitFinance: payload.finance,
          skipUserMessage: true
        });
      }
    } catch (error) {
      appendError(error);
    } finally {
      setIsBusy(false);
      setStatus("Ready");
    }
  }

  async function fetchPayrollSummary(id, fallbackPayload) {
    try {
      const response = await fetch(`${API_BASE_URL}/payroll/${id}/summary`);
      return await parseJsonResponse(response);
    } catch (_error) {
      return fallbackPayload
        ? {
            id: fallbackPayload.id,
            payroll_json: fallbackPayload.finance?.payroll,
            calculated_values: fallbackPayload.finance?.calculated,
            salary_breakdown: fallbackPayload.analysis,
            year_to_date: fallbackPayload.analysis?.year_to_date,
            extraction: fallbackPayload.extraction
          }
        : null;
    }
  }

  async function loadProofChecklist() {
    try {
      const response = await fetch(`${API_BASE_URL}/investment-proofs/checklist`);
      setProofChecklist(await parseJsonResponse(response));
    } catch (error) {
      setProofChecklist({
        items: [],
        summary: { missing_proof_summary: error.message, missing_count: 0, submitted_count: 0 }
      });
    }
  }

  async function runTaxSimulation(event) {
    event.preventDefault();
    setStatus("Running 80C simulator");

    try {
      const response = await fetch(`${API_BASE_URL}/tax/80c/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alreadyDeclared80C: taxInputs.alreadyDeclared80C,
          additionalInvestment: taxInputs.additionalInvestment
        })
      });
      setTaxResult(await parseJsonResponse(response));
    } catch (error) {
      appendError(error);
    } finally {
      setStatus("Ready");
    }
  }

  async function askFollowUp(
    question,
    {
      explicitId = analysisState?.id,
      explicitFinance = analysisState?.finance,
      skipUserMessage = false
    } = {}
  ) {
    if (!question) return;

    if (!explicitId && !explicitFinance) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "text",
          content: "Please upload a salary slip first so I have payroll data to answer from."
        }
      ]);
      return;
    }

    if (!skipUserMessage) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          type: "text",
          content: question
        }
      ]);
    }

    setIsBusy(true);
    setStatus("Asking payroll assistant");

    try {
      const history = buildHistory();
      const endpoint = explicitId
        ? `${API_BASE_URL}/payroll/${explicitId}/narrate`
        : `${API_BASE_URL}/payroll/narrate`;
      const body = explicitId
        ? { question, history }
        : { finance: explicitFinance, question, history };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const payload = await parseJsonResponse(response);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "text",
          content: payload.answer
        }
      ]);
    } catch (error) {
      appendError(error);
    } finally {
      setIsBusy(false);
      setStatus("Ready");
    }
  }

  function buildHistory() {
    return messages
      .filter((message) => message.type === "text" && message.content)
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: message.content
      }));
  }

  function appendError(error) {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error",
        content: error.message || "Something went wrong."
      }
    ]);
  }

  const finance = analysisState?.finance || {
    payroll: summary?.payroll_json,
    calculated: summary?.calculated_values
  };

  return (
    <main className="app-shell">
      <section className="dashboard">
        <header className="topbar">
          <div className="brand-row">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <h1>Payroll Assistant</h1>
              <p>{status}</p>
            </div>
          </div>
          <div className="status-pill">
            {isBusy ? <Loader2 className="spin" size={15} /> : <Bot size={15} />}
            <span>{isBusy ? "Working" : "Online"}</span>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="left-stack">
            <SalaryCards finance={finance} />
            <SalaryBreakdown summary={summary} finance={finance} />
            <TaxSimulator
              taxInputs={taxInputs}
              setTaxInputs={setTaxInputs}
              taxResult={taxResult}
              runTaxSimulation={runTaxSimulation}
            />
            <ProofChecklist proofChecklist={proofChecklist} />
          </div>

          <section className="chat-panel">
            <div className="chat-header">
              <div>
                <h2>AI Payroll Chat</h2>
                <p>
                  {analysisState?.id
                    ? `Using saved analysis #${analysisState.id}`
                    : "Upload a salary slip to begin"}
                </p>
              </div>
              <Upload size={20} />
            </div>

            <div className="messages" aria-live="polite">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isBusy && (
                <div className="message assistant">
                  <div className="avatar"><Bot size={16} /></div>
                  <div className="bubble typing">
                    <Loader2 className="spin" size={16} />
                    <span>Thinking through payroll numbers</span>
                  </div>
                </div>
              )}
            </div>

            <form className="composer" onSubmit={handleSubmit}>
              {file && (
                <div className="attachment-chip">
                  {file.type.startsWith("image/") ? <Image size={15} /> : <FileText size={15} />}
                  <span>{file.name}</span>
                  <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="composer-row">
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Attach salary slip"
                  title="Attach salary slip"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={19} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Attach image"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileImage size={19} />
                </button>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask payroll question"
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event);
                    }
                  }}
                />
                <button className="send-button" type="submit" disabled={!canSend} aria-label="Send">
                  {isBusy ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}

function SalaryCards({ finance }) {
  const payroll = finance?.payroll || {};
  const calculated = finance?.calculated || {};
  const cards = [
    ["Gross pay", formatMoney(payroll.gross, payroll.currency)],
    ["Net pay", formatMoney(payroll.net, payroll.currency)],
    ["Total deductions", formatMoney(calculated.total_deductions, payroll.currency)],
    ["Calculated net", formatMoney(calculated.calculated_net, payroll.currency)]
  ];

  return (
    <section className="panel">
      <PanelTitle title="Salary Summary" subtitle={payroll.month || "Upload a payslip to populate values"} />
      <div className="value-grid">
        {cards.map(([label, value]) => (
          <div className="value-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function SalaryBreakdown({ summary, finance }) {
  const payroll = finance?.payroll || {};
  const breakdown = summary?.salary_breakdown || {};
  const ytd = summary?.year_to_date || {};
  const rows = [
    ["Basic salary", payroll.basic],
    ["HRA", payroll.hra],
    ["LTA", payroll.lta],
    ["Special allowance", payroll.special_allowance],
    ["Reimbursements", payroll.reimbursements],
    ["PF", payroll.pf],
    ["Professional tax", payroll.professional_tax],
    ["TDS", payroll.tds],
    ["Gross pay", payroll.gross],
    ["Net pay", payroll.net]
  ];

  return (
    <section className="panel">
      <PanelTitle
        title="Salary Breakdown"
        subtitle={summary?.extraction?.method ? `Extracted via ${summary.extraction.method}` : "Waiting for payslip"}
      />
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{formatMoney(value, payroll.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ytd-block">
        <h3>YTD Values</h3>
        {Object.keys(ytd).length ? (
          <div className="ytd-grid">
            {Object.entries(ytd).map(([key, value]) => (
              <div key={key}>
                <span>{prettyLabel(key)}</span>
                <strong>{formatMoney(value?.amount, value?.currency || payroll.currency)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>No YTD values found in this payslip.</p>
        )}
      </div>
      {breakdown.net_pay && (
        <p className="muted-note">Raw extracted net pay: {formatMoney(breakdown.net_pay.amount, breakdown.net_pay.currency)}</p>
      )}
    </section>
  );
}

function TaxSimulator({ taxInputs, setTaxInputs, taxResult, runTaxSimulation }) {
  return (
    <section className="panel">
      <PanelTitle title="80C Tax-Saving Simulator" subtitle="Simplified assumption, not tax advice" />
      <form className="tax-form" onSubmit={runTaxSimulation}>
        <label>
          Already declared 80C
          <input
            type="number"
            min="0"
            value={taxInputs.alreadyDeclared80C}
            onChange={(event) => setTaxInputs((current) => ({ ...current, alreadyDeclared80C: event.target.value }))}
          />
        </label>
        <label>
          Additional 80C investment
          <input
            type="number"
            min="0"
            value={taxInputs.additionalInvestment}
            onChange={(event) => setTaxInputs((current) => ({ ...current, additionalInvestment: event.target.value }))}
          />
        </label>
        <button type="submit" className="secondary-button">
          <Calculator size={16} />
          Run simulator
        </button>
      </form>
      {taxResult && (
        <div className="tax-result">
          <div>
            <span>Eligible extra 80C</span>
            <strong>{formatMoney(taxResult.result.eligible_extra_80c)}</strong>
          </div>
          <div>
            <span>Estimated tax saving</span>
            <strong>{formatMoney(taxResult.result.estimated_tax_saving)}</strong>
          </div>
          <ol>
            {taxResult.explanation.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p>{taxResult.assumptions.disclaimer}</p>
        </div>
      )}
    </section>
  );
}

function ProofChecklist({ proofChecklist }) {
  const items = proofChecklist?.items || [];
  return (
    <section className="panel">
      <PanelTitle title="Investment Proof Checklist" subtitle={proofChecklist?.note || "Mock proof items"} />
      <div className="proof-list">
        {items.map((item) => (
          <div className="proof-item" key={item.key}>
            {item.proof_status === "submitted" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <strong>{item.label}</strong>
              <span>{formatMoney(item.declared_amount)} declared</span>
            </div>
            <em className={item.proof_status}>{item.proof_status}</em>
          </div>
        ))}
      </div>
      <p className="missing-summary">{proofChecklist?.summary?.missing_proof_summary || "Loading proof checklist..."}</p>
    </section>
  );
}

function PanelTitle({ title, subtitle }) {
  return (
    <div className="panel-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`message ${isUser ? "user" : "assistant"}`}>
      <div className="avatar">{isUser ? <User size={16} /> : <Bot size={16} />}</div>
      <div className={`bubble ${message.type === "error" ? "error" : ""}`}>
        {message.fileName && <div className="file-line"><Paperclip size={14} /> {message.fileName}</div>}
        <p>{message.content}</p>
        {message.type === "analysis" && <MiniAnalysis data={message.data} />}
      </div>
    </div>
  );
}

function MiniAnalysis({ data }) {
  return (
    <div className="mini-analysis">
      <span>Net {formatMoney(data.finance?.payroll?.net, data.finance?.payroll?.currency)}</span>
      <span>Gross {formatMoney(data.finance?.payroll?.gross, data.finance?.payroll?.currency)}</span>
      <span>{data.finance?.payroll?.month || "Pay period missing"}</span>
    </div>
  );
}

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || "Request failed.");
  }
  return payload;
}

function formatMoney(value, currency = "INR") {
  if (typeof value !== "number") return "Missing";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function prettyLabel(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

createRoot(document.getElementById("root")).render(<App />);

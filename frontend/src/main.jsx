import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  FileImage,
  FileText,
  Image,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  User,
  X
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
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const fileInputRef = useRef(null);

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
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      type: "upload",
      content: question || "Analyze this salary slip.",
      fileName: selectedFile.name
    };

    setMessages((current) => [...current, userMessage]);
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
      setAnalysisState({
        id: payload.id,
        finance: payload.finance,
        analysis: payload.analysis,
        extraction: payload.extraction,
        storage: payload.storage
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "analysis",
          content: "I analyzed the salary slip and prepared the payroll summary.",
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

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="summary-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <h1>Payroll Assistant</h1>
              <p>{status}</p>
            </div>
          </div>

          <PayrollTable finance={analysisState?.finance} extraction={analysisState?.extraction} />
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div>
              <h2>Payroll Chat</h2>
              <p>
                {analysisState?.id
                  ? `Using saved analysis #${analysisState.id}`
                  : "Waiting for a salary slip"}
              </p>
            </div>
            <div className="status-pill">
              {isBusy ? <Loader2 className="spin" size={15} /> : <Bot size={15} />}
              <span>{isBusy ? "Working" : "Online"}</span>
            </div>
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
    </main>
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

function PayrollTable({ finance, extraction }) {
  if (!finance) {
    return (
      <div className="empty-summary">
        <FileText size={28} />
        <p>Attach a salary slip to populate payroll fields and calculations.</p>
      </div>
    );
  }

  const rows = [
    ["Month", finance.payroll.month || "Missing"],
    ["Basic", formatMoney(finance.payroll.basic, finance.payroll.currency)],
    ["HRA", formatMoney(finance.payroll.hra, finance.payroll.currency)],
    ["Special allowance", formatMoney(finance.payroll.special_allowance, finance.payroll.currency)],
    ["PF", formatMoney(finance.payroll.pf, finance.payroll.currency)],
    ["TDS", formatMoney(finance.payroll.tds, finance.payroll.currency)],
    ["Gross", formatMoney(finance.payroll.gross, finance.payroll.currency)],
    ["Net", formatMoney(finance.payroll.net, finance.payroll.currency)],
    ["Deductions", formatMoney(finance.calculated.total_deductions, finance.payroll.currency)],
    ["Calculated net", formatMoney(finance.calculated.calculated_net, finance.payroll.currency)]
  ];

  return (
    <div className="summary-content">
      <div className="summary-meta">
        <span>{extraction?.method || "analyzed"}</span>
        <span>{finance.calculated.net_formula}</span>
      </div>
      <table>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="difference-row">
        <span>Net difference</span>
        <strong>{formatMoney(finance.calculated.net_difference, finance.payroll.currency)}</strong>
      </div>
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

createRoot(document.getElementById("root")).render(<App />);

import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DocumentArrowDownIcon, MicrophoneIcon, PaperAirplaneIcon, SparklesIcon, SpeakerWaveIcon, StopIcon } from "@heroicons/react/24/outline";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { getStoredSession } from "@/lib/auth/authService";

type ChartData = { type: "bar" | "line"; title: string; data: Array<Record<string, string | number>>; xKey: string; yKey: string };
type Download = { format: string; filename: string; mime: string; content_base64: string; summary: string };
type Citation = { source: string; text: string };
type Message = { role: "user" | "assistant"; content: string; chart?: ChartData; citations?: Citation[]; download?: Download };
type SpeechResult = ArrayLike<{ transcript: string }>;
type SpeechEvent = { results: ArrayLike<SpeechResult> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
const speechApi = typeof window === "undefined"
  ? undefined
  : (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
    ?? (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

function downloadFile(payload: Download) {
  const binary = atob(payload.content_base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: payload.mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I'm FinSight AI.\n\nI can answer questions about your real financial data after you upload a bank statement.\n\nGo to Statements and upload a CSV, PDF, or Excel file first.",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const snapshot = useFinanceStore();
  const hasData = snapshot.transactions.length > 0;
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state;
  const analyzeAfterImport = typeof locationState === "object"
    && locationState !== null
    && "analyzeAfterImport" in locationState
    && locationState.analyzeAfterImport === true;
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const autoAnalyzeStartedRef = useRef(false);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
  useEffect(() => () => { abortRef.current?.abort(); window.speechSynthesis?.cancel(); recognitionRef.current?.stop(); }, []);

  function toggleVoice() {
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    if (!speechApi) { setStatus("Voice input is unavailable in this browser."); return; }
    const recognition = new speechApi();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.onresult = (event) => setInput(Array.from(event.results).map((result) => result[0].transcript).join(""));
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  async function send(forcedText?: string) {
    const text = forcedText ?? input.trim();
    if (!text || busy) return;
    setMessages((items) => [...items, { role: "user", content: text }, { role: "assistant", content: "" }]);
    if (!forcedText) setInput("");
    setBusy(true); setStatus(forcedText ? "Analyzing your uploaded data…" : "Thinking…");
    const controller = new AbortController(); abortRef.current = controller;
    let answer = "";
    let chart: ChartData | undefined;
    let citations: Citation[] | undefined;
    let download: Download | undefined;
    const update = () => setMessages((items) => { const next = [...items]; next[next.length - 1] = { role: "assistant", content: answer, chart, citations, download }; return next; });
    try {
      const session = getStoredSession();
      if (!session) throw new Error("Your session expired. Sign in again to use the assistant.");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        let detail = `The assistant backend returned ${response.status}.`;
        try {
          const payload = await response.json() as { detail?: unknown };
          if (typeof payload.detail === "string") detail = payload.detail;
        } catch {
          detail = `The assistant backend returned ${response.status}.`;
        }
        throw new Error(detail);
      }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n"); buffer = frames.pop() ?? "";
        for (const frame of frames) {
          let event = "message"; let data = "";
          for (const line of frame.split("\n")) { if (line.startsWith("event: ")) event = line.slice(7); if (line.startsWith("data: ")) data += line.slice(6); }
          if (!data) continue;
          const payload = JSON.parse(data);
          if (event === "token") { answer += payload.content ?? ""; update(); }
          if (event === "tool") setStatus(`Using ${String(payload.name).replace(/_/g, " ")}…`);
          if (event === "chart") { chart = payload; update(); }
          if (event === "citations") { citations = payload; update(); }
          if (event === "download") { download = payload; update(); }
          if (event === "error") { answer = `⚠ ${payload.message}`; update(); }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        answer = error instanceof Error && error.message.startsWith("An uploaded transaction")
          ? error.message
          : `I couldn’t reach the assistant backend. ${String(error)}\n\nStart the FastAPI server on port 8000 and configure backend/.env.`;
        update();
      }
    } finally { setBusy(false); setStatus(""); abortRef.current = null; }
  }

  useEffect(() => {
    const handleAnalyze = () => {
      if (autoAnalyzeStartedRef.current) return;
      autoAnalyzeStartedRef.current = true;
      navigate(location.pathname, { replace: true, state: null });
      void send("I just uploaded a bank statement. Please calculate my total income, total expenses, and biggest spending category from my uploaded transactions.");
    };

    window.addEventListener("finsight:analyze", handleAnalyze);
    if (analyzeAfterImport) {
      window.dispatchEvent(new CustomEvent("finsight:analyze"));
    }

    return () => window.removeEventListener("finsight:analyze", handleAnalyze);
  }, [analyzeAfterImport, location.pathname, navigate]);

  function readAloud(text: string, index: number) {
    if (!window.speechSynthesis) return;
    if (speaking === index) { window.speechSynthesis.cancel(); setSpeaking(null); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-IN";
    utterance.onstart = () => setSpeaking(index); utterance.onend = () => setSpeaking(null); window.speechSynthesis.speak(utterance);
  }

  return <section className="mx-auto flex h-[min(78vh,850px)] min-h-[540px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <header className="flex items-center gap-3 border-b border-border px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-primary text-white"><SparklesIcon className="h-5 w-5" /></span><div><h1 className="text-base font-semibold">FinSight AI Co-Pilot</h1><p className="text-xs text-ink-muted">Your financial data is sent to Groq with each question</p></div></header>
    {!hasData
      ? <div className="border-b border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-ink-muted"><strong className="text-ink">No data uploaded yet.</strong>{" "}The AI will answer general knowledge questions until you upload a statement. <a href="/app/statements" className="font-medium text-accent-secondary underline">Upload now →</a></div>
      : <div className="border-b border-success/30 bg-success/5 px-4 py-2 text-xs text-success">Connected to your financial data</div>}
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><article className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm sm:max-w-[84%] ${message.role === "user" ? "rounded-br-sm bg-accent-primary text-white" : "rounded-tl-sm bg-surface-secondary text-ink"}`}>
        <p className="whitespace-pre-wrap">{message.content || "…"}</p>
        {message.chart && message.chart.data.length > 0 && <div className="mt-4 h-56 w-full min-w-[280px] rounded-xl bg-white p-3"><p className="mb-2 text-xs font-semibold text-ink-muted">{message.chart.title}</p><ResponsiveContainer width="100%" height="88%">{message.chart.type === "line" ? <LineChart data={message.chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={message.chart.xKey} fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line dataKey={message.chart.yKey} stroke="#d97745" strokeWidth={2} /></LineChart> : <BarChart data={message.chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={message.chart.xKey} fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey={message.chart.yKey} fill="#d97745" radius={[4, 4, 0, 0]} /></BarChart>}</ResponsiveContainer></div>}
        {message.citations?.map((citation, i) => <div key={i} className="mt-3 border-t border-border pt-2 text-xs text-ink-muted"><p className="font-semibold">Source: {citation.source}</p><p className="mt-1">{citation.text}</p></div>)}
        {message.download && <button onClick={() => downloadFile(message.download!)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-accent-secondary shadow-sm"><DocumentArrowDownIcon className="h-4 w-4" /> Download {message.download.format.toUpperCase()} · {message.download.summary}</button>}
        {message.role === "assistant" && message.content && <button onClick={() => readAloud(message.content, index)} className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted"><SpeakerWaveIcon className="h-3.5 w-3.5" />{speaking === index ? "Stop" : "Listen"}</button>}
      </article></div>)}
      {status && <p className="text-xs text-ink-muted" role="status">{status}</p>}<div ref={bottomRef} />
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-border bg-surface p-3 sm:p-4">
      <button type="button" onClick={toggleVoice} aria-label={recording ? "Stop recording" : "Voice input"} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border ${recording ? "animate-pulse bg-error text-white" : "text-ink-muted hover:bg-surface-secondary"}`}><MicrophoneIcon className="h-5 w-5" /></button>
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={recording ? "Listening…" : "Ask about spending, budgets, or goals…"} disabled={busy} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-primary" />
      {busy ? <button type="button" aria-label="Stop response" onClick={() => abortRef.current?.abort()} className="grid h-10 w-10 place-items-center rounded-xl bg-error text-white"><StopIcon className="h-5 w-5" /></button> : <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-xl bg-accent-primary text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button>}
    </form>
  </section>;
}

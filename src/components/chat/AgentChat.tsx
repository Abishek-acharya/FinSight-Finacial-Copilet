import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowDownTrayIcon, DocumentArrowDownIcon, GlobeAltIcon, MicrophoneIcon, PaperAirplaneIcon, SparklesIcon, SpeakerWaveIcon, StopIcon } from "@heroicons/react/24/outline";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { getStoredSession } from "@/lib/auth/authService";

type ChartData = { type: "bar" | "line"; title: string; data: Array<Record<string, string | number>>; xKey: string; yKey: string };
type Download = { format: string; filename: string; mime: string; content_base64: string; summary: string };
type Citation = { source: string; text: string };
type UiHint =
  | { type: "metrics"; data: Array<{ label: string; value: string; color: string }> }
  | { type: "table"; data: Array<{ date: string; merchant: string; amount: string }> }
  | { type: "progress"; data: Array<{ label: string; spent: number; limit: number; utilization: number; status: "over" | "warning" | "ok" }> };
type Message = { role: "user" | "assistant"; content: string; chart?: ChartData; citations?: Citation[]; download?: Download; ui?: UiHint; tools?: string[] };
type SpeechResult = ArrayLike<{ transcript: string }>;
type SpeechEvent = { results: ArrayLike<SpeechResult>; resultIndex?: number };
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

// ── Indian language configuration ──────────────────────────────────────────
type LangCode = "en-IN" | "hi-IN" | "bn-IN" | "gu-IN" | "kn-IN" | "mr-IN" | "pa-IN" | "ta-IN" | "te-IN" | "ml-IN" | "or-IN" | "ur-IN";

interface LangMeta {
  label: string;
  nativeName: string;
  /** Greeting spoken when Voice Mode activates */
  greeting: string;
  /** Greeting spoken when switching TO this language mid-session */
  switchGreeting: string;
  /** Rupee replacement word for TTS text cleaning */
  rupeeWord: string;
  /** Preferred voice name substrings (checked in order) */
  voiceHints: string[];
  /** Edge-TTS voice (used by backend /api/voice/speak) */
  edgeVoice: string;
}

const LANG_META: Record<LangCode, LangMeta> = {
  "en-IN": {
    label: "English",
    nativeName: "English",
    greeting: "Hello! I'm your FinSight assistant. I'd be happy to help you with your finances today. What would you like to know?",
    switchGreeting: "Switched to English. How can I help you with your finances?",
    rupeeWord: "rupees",
    voiceHints: ["Google UK English Female", "Neerja", "Heera", "Raveena"],
    edgeVoice: "en-IN-NeerjaNeural",
  },
  "hi-IN": {
    label: "Hindi",
    nativeName: "हिन्दी",
    greeting: "Namaste! Main aapka FinSight assistant hoon. Main aapki kya madad kar sakta hoon?",
    switchGreeting: "Ab main aapse Hindi mein baat karunga. Bataiye, kya jaanna hai?",
    rupeeWord: "rupaye",
    voiceHints: ["Google हिन्दी", "Google Hindi", "Kalpana", "Neerja"],
    edgeVoice: "hi-IN-SwaraNeural",
  },
  "bn-IN": {
    label: "Bengali",
    nativeName: "বাংলা",
    greeting: "Namaskar! Ami apnar FinSight assistant. Apnar finance nie ki janben?",
    switchGreeting: "Ekhon ami Banglay bolbo. Apnar ki janbar ache?",
    rupeeWord: "taka",
    voiceHints: ["Tanishaa", "bn-IN"],
    edgeVoice: "bn-IN-TanishaaNeural",
  },
  "gu-IN": {
    label: "Gujarati",
    nativeName: "ગુજરાતી",
    greeting: "Kem cho! Hoon tamaro FinSight assistant chhun. Tamne kya madad kari shakaay?",
    switchGreeting: "Hu hu Gujarati ma vaato karis. Tamne shu jaanvu chhe?",
    rupeeWord: "rupiya",
    voiceHints: ["Dhwani", "gu-IN"],
    edgeVoice: "gu-IN-DhwaniNeural",
  },
  "kn-IN": {
    label: "Kannada",
    nativeName: "ಕನ್ನಡ",
    greeting: "Namaskara! Naanu nimma FinSight assistant. Nimma finances bagge yenu tiliyabeku?",
    switchGreeting: "Iga naanu Kannadadalli mathanaduve. Nimma prashne yenu?",
    rupeeWord: "rupai",
    voiceHints: ["Sapna", "kn-IN"],
    edgeVoice: "kn-IN-SapnaNeural",
  },
  "mr-IN": {
    label: "Marathi",
    nativeName: "मराठी",
    greeting: "Namaskar! Mi tumcha FinSight assistant aahe. Tumhala finance baabat kaay jaanaychay?",
    switchGreeting: "Aata mi Marathi madhye bolnar aahe. Tumhala kaay vicharayache aahe?",
    rupeeWord: "rupaye",
    voiceHints: ["Aarohi", "mr-IN"],
    edgeVoice: "mr-IN-AarohiNeural",
  },
  "pa-IN": {
    label: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    greeting: "Sat Sri Akal! Main taada FinSight assistant haan. Tussi finance baare ki jaanna chahunde ho?",
    switchGreeting: "Hune main Punjabi vich gall karda haan. Ki jaanna chahunde ho?",
    rupeeWord: "rupaye",
    voiceHints: ["Ojas", "pa-IN"],
    edgeVoice: "pa-IN-OjasNeural",
  },
  "ta-IN": {
    label: "Tamil",
    nativeName: "தமிழ்",
    greeting: "Vanakkam! Naan ungal FinSight assistant. Ungal finance pathi enna theriyanum?",
    switchGreeting: "Ippo naan Tamilil pesuvein. Ungalukku enna janikkanum?",
    rupeeWord: "ரூபாய்",
    voiceHints: ["Pallavi", "ta-IN"],
    edgeVoice: "ta-IN-PallaviNeural",
  },
  "te-IN": {
    label: "Telugu",
    nativeName: "తెలుగు",
    greeting: "Namaskaram! Nenu meeru FinSight assistant. Meeru finance gurinchi emanna telusukovalante?",
    switchGreeting: "Ippudu nenu Telugu lo matladataanu. Meeru emanna adugutaara?",
    rupeeWord: "రూపాయలు",
    voiceHints: ["Shruti", "te-IN"],
    edgeVoice: "te-IN-ShrutiNeural",
  },
  "ml-IN": {
    label: "Malayalam",
    nativeName: "മലയാളം",
    greeting: "Namaskaram! Ente FinSight assistant aanu. Ningalude finance patti enthanu ariyendath?",
    switchGreeting: "Ippo njaan Malayalatthil samsarikkum. Ningalkku enthu ariyanam?",
    rupeeWord: "രൂപ",
    voiceHints: ["Sobhana", "ml-IN"],
    edgeVoice: "ml-IN-SobhanaNeural",
  },
  "or-IN": {
    label: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    greeting: "Namaskar! Mun aapanka FinSight assistant. Aapanka finance bisayare ki jaanibaa?",
    switchGreeting: "Ebebe mun Odiare kathaa hebi. Aapanka ki prasna?",
    rupeeWord: "ଟଙ୍କା",
    voiceHints: ["Subhasini", "or-IN"],
    edgeVoice: "or-IN-SubhasiniNeural",
  },
  "ur-IN": {
    label: "Urdu",
    nativeName: "اردو",
    greeting: "Assalamualaikum! Main aapka FinSight assistant hoon. Aapki finances ke baare mein kya jaanna chahte hain?",
    switchGreeting: "Ab main Urdu mein baat karunga. Aap kya jaanna chahte hain?",
    rupeeWord: "روپے",
    voiceHints: ["Gul", "ur-IN"],
    edgeVoice: "ur-IN-GulNeural",
  },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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

function toolLabel(tool: string) {
  if (tool === "get_spending_summary") return "Querying financial data";
  if (tool === "generate_report") return "Generating your report";
  if (tool === "search_transactions") return "Searching transactions";
  return `Analyzing with ${tool.replace(/_/g, " ")}`;
}

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: `${getGreeting()}! I'm FinSight AI, your personal financial co-pilot.\n\nI can analyze your income, track budgets, forecast spending, or generate a PDF report. What would you like to know?`,
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [language, setLanguage] = useState<LangCode>("en-IN");
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
  const voiceModeRef = useRef(false);
  const languageRef = useRef<LangCode>("en-IN");
  const autoAnalyzeStartedRef = useRef(false);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
  useEffect(() => {
    voiceModeRef.current = voiceMode;
    languageRef.current = language;
  }, [voiceMode, language]);
  useEffect(() => () => { abortRef.current?.abort(); window.speechSynthesis?.cancel(); recognitionRef.current?.stop(); }, []);

  function toggleVoice() {
    window.speechSynthesis?.cancel();
    setSpeaking(null);
    if (recording) { recognitionRef.current?.stop(); setRecording(false); return; }
    if (!speechApi) { setStatus("Voice input is unavailable in this browser."); return; }
    const recognition = new speechApi();
    recognition.lang = languageRef.current;
    recognition.interimResults = true;
    recognition.onresult = (event) => setInput(Array.from(event.results).map((result) => result[0].transcript).join(""));
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  }

  function startVoiceListening() {
    window.speechSynthesis?.cancel();
    setSpeaking(null);
    if (!voiceModeRef.current) return;
    if (!speechApi) {
      setStatus("Voice mode requires Chrome or Edge.");
      voiceModeRef.current = false;
      setVoiceMode(false);
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new speechApi();
    recognition.lang = languageRef.current;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join("");
      setInput(transcript);
      const latest = event.results[event.results.length - 1];
      if (latest && "isFinal" in latest && latest.isFinal) {
        setRecording(false);
        setIsThinking(true);
        window.setTimeout(() => {
          setInput("");
          void send(transcript);
        }, 300);
      }
    };
    recognition.onerror = () => {
      setRecording(false);
      if (voiceModeRef.current) setStatus("I couldn't hear that. Listening again…");
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setIsThinking(false);
  }

  function speakVoiceResponse(text: string) {
    if (!text.trim()) {
      if (voiceModeRef.current) startVoiceListening();
      return;
    }
    if (!window.speechSynthesis) {
      if (voiceModeRef.current) startVoiceListening();
      return;
    }
    window.speechSynthesis.cancel();
    const meta = LANG_META[languageRef.current];
    const cleanText = text
      .replace(/₹\s*([\d,]+(?:\.\d+)?)/g, `$1 ${meta.rupeeWord}`)
      .replace(/[*#_`]/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s*[-–—]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const sentences = cleanText.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean)
      ?? (cleanText ? [cleanText] : []);
    const voices = window.speechSynthesis.getVoices();
    const findVoice = (hints: string[]) => {
      for (const hint of hints) {
        const v = voices.find((voice) => new RegExp(hint, "i").test(voice.name));
        if (v) return v;
      }
      return (
        voices.find((voice) => voice.lang.toLowerCase() === languageRef.current.toLowerCase())
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(languageRef.current.slice(0, 2).toLowerCase()))
        ?? voices[0]
      );
    };
    const preferred = findVoice(meta.voiceHints);
    sentences.forEach((sentence, index) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      if (preferred) utterance.voice = preferred;
      utterance.lang = languageRef.current;
      utterance.rate = languageRef.current === "en-IN" ? 0.92 : 0.86;
      utterance.pitch = 1.02;
      utterance.onstart = () => { setSpeaking(messages.length); setIsThinking(false); };
      utterance.onend = () => {
        if (index === sentences.length - 1) {
          setSpeaking(null);
          if (voiceModeRef.current) window.setTimeout(startVoiceListening, 500);
        }
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  function toggleVoiceMode() {
    if (voiceMode) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      setRecording(false);
      setIsThinking(false);
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      setSpeaking(null);
      return;
    }
    voiceModeRef.current = true;
    setVoiceMode(true);
    speakVoiceResponse(LANG_META[languageRef.current].greeting);
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
    let ui: UiHint | undefined;
    const tools: string[] = [];
    const update = () => setMessages((items) => { const next = [...items]; next[next.length - 1] = { role: "assistant", content: answer, chart, citations, download, ui, tools }; return next; });
    const history = messages.filter((message) => message.content.trim()).slice(-6).map(({ role, content }) => ({ role, content }));
    try {
      const session = getStoredSession();
      if (!session) throw new Error("Your session expired. Sign in again to use the assistant.");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          message: text,
          voice_mode: voiceModeRef.current,
          history,
          language: languageRef.current,
        }),
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
          if (event === "tool") {
            const name = String(payload.name);
            if (!tools.includes(name)) tools.push(name);
            setStatus(`${toolLabel(name)}…`);
            update();
          }
          if (event === "ui") { ui = payload as UiHint; update(); }
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
    } finally {
      setBusy(false); setStatus(""); abortRef.current = null;
      if (voiceModeRef.current && answer.trim()) speakVoiceResponse(answer);
      else setIsThinking(false);
    }
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

  function exportChat() {
    const text = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "FinSight_Chat_History.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function explainChart(chart: ChartData) {
    void send(`Explain the "${chart.title}" chart above in detail, including the largest value, the main trend, and one practical takeaway.`);
  }

  return <section className="mx-auto flex h-[min(78vh,850px)] min-h-[540px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-primary text-white"><SparklesIcon className="h-5 w-5" /></span><div><h1 className="text-base font-semibold">FinSight Command Center</h1><p className="text-xs text-ink-muted">Deterministic commands run locally from your verified financial data</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={exportChat} aria-label="Export chat history" title="Export chat history" className="rounded-full border border-border p-2 text-ink-muted transition-colors hover:bg-surface-secondary hover:text-ink"><ArrowDownTrayIcon className="size-4" /></button><button type="button" onClick={toggleVoiceMode} className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${voiceMode ? "bg-error/10 text-error" : "border border-border bg-surface text-ink hover:bg-surface-secondary"}`}>{voiceMode ? "End voice session" : "Talk to Agent"}</button></div></header>
    {!hasData
      ? <div className="border-b border-warning/30 bg-warning/5 px-4 py-2.5 text-xs text-ink-muted"><strong className="text-ink">No data uploaded yet.</strong>{" "}The AI will answer general knowledge questions until you upload a statement. <a href="/app/statements" className="font-medium text-accent-secondary underline">Upload now →</a></div>
      : <div className="border-b border-success/30 bg-success/5 px-4 py-2 text-xs text-success">Connected to your financial data</div>}
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
      {messages.map((message, index) => <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><article className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm sm:max-w-[84%] ${message.role === "user" ? "rounded-br-sm bg-accent-primary text-white" : "rounded-tl-sm bg-surface-secondary text-ink"}`}>
        {message.tools && message.tools.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{message.tools.map((tool) => <span key={tool} className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-2.5 py-1 text-xs font-medium text-accent-secondary"><span className="size-1.5 animate-pulse rounded-full bg-accent-primary" />{toolLabel(tool)}</span>)}</div>}
        <div className={`max-w-none ${message.role === "assistant" ? "prose prose-sm prose-p:leading-relaxed prose-li:my-1 prose-strong:font-bold prose-strong:text-ink" : "whitespace-pre-wrap"}`}>
          {message.role === "assistant" ? <ReactMarkdown>{message.content || "…"}</ReactMarkdown> : message.content || "…"}
          {busy && message.role === "assistant" && index === messages.length - 1 && <span aria-hidden="true" className="ml-1 inline-block h-4 w-1.5 animate-chat-caret bg-accent-primary align-middle" />}
        </div>
        {message.ui?.type === "metrics" && <div className="mt-3 grid grid-cols-3 gap-2 transition-opacity duration-300">{message.ui.data.map((item, itemIndex) => <div key={`${item.label}-${itemIndex}`} className="rounded-xl border border-border bg-surface p-3 shadow-sm"><p className="text-[10px] uppercase tracking-wider text-ink-muted">{item.label}</p><p className={`mt-1 text-sm font-bold tabular-nums ${item.color}`}>{item.value}</p></div>)}</div>}
        {message.ui?.type === "table" && <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface"><table className="w-full text-xs"><thead className="bg-surface-secondary text-ink-muted"><tr><th className="px-3 py-2 text-left font-medium">Date</th><th className="px-3 py-2 text-left font-medium">Merchant</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr></thead><tbody className="divide-y divide-border">{message.ui.data.map((row, rowIndex) => <tr key={`${row.date}-${row.merchant}-${rowIndex}`} className="transition-colors hover:bg-surface-secondary/50"><td className="px-3 py-2 text-ink-muted">{row.date}</td><td className="px-3 py-2 font-medium text-ink">{row.merchant}</td><td className="px-3 py-2 text-right tabular-nums text-ink">{row.amount}</td></tr>)}</tbody></table></div>}
        {message.ui?.type === "progress" && <div className="mt-3 space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">{message.ui.data.map((item, itemIndex) => <div key={`${item.label}-${itemIndex}`}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-medium text-ink">{item.label}</span><span className="shrink-0 text-ink-muted">₹{item.spent.toLocaleString("en-IN")} / ₹{item.limit.toLocaleString("en-IN")}</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary"><div className={`h-full rounded-full transition-[width] duration-500 ${item.status === "over" ? "bg-error" : item.status === "warning" ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.min(Math.max(item.utilization, 0), 100)}%` }} /></div></div>)}</div>}
        {message.chart && message.chart.data.length > 0 && <div className="mt-4 rounded-xl bg-white p-3"><p className="mb-2 text-xs font-semibold text-ink-muted">{message.chart.title}</p><div className="h-48 min-w-[280px]"><ResponsiveContainer width="100%" height="100%">{message.chart.type === "line" ? <LineChart data={message.chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={message.chart.xKey} fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Line dataKey={message.chart.yKey} stroke="#d97745" strokeWidth={2} /></LineChart> : <BarChart data={message.chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey={message.chart.xKey} fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey={message.chart.yKey} fill="#d97745" radius={[4, 4, 0, 0]} /></BarChart>}</ResponsiveContainer></div><button type="button" onClick={() => explainChart(message.chart!)} disabled={busy} className="mt-2 text-xs font-semibold text-accent-secondary hover:underline disabled:opacity-50">Explain this chart</button></div>}
        {message.citations?.map((citation, i) => <div key={i} className="mt-3 border-t border-border pt-2 text-xs text-ink-muted"><p className="font-semibold">Source: {citation.source}</p><p className="mt-1">{citation.text}</p></div>)}
        {message.download && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3"><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold text-ink"><DocumentArrowDownIcon className="h-4 w-4 shrink-0 text-accent-primary" /> <span className="truncate">{message.download.filename}</span></p><p className="mt-0.5 text-xs text-ink-muted">{message.download.summary} · {message.download.format.toUpperCase()}</p></div><button onClick={() => downloadFile(message.download!)} className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent-secondary">Download</button></div>}
        {message.role === "assistant" && message.content && <button onClick={() => readAloud(message.content, index)} className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted"><SpeakerWaveIcon className="h-3.5 w-3.5" />{speaking === index ? "Stop" : "Listen"}</button>}
      </article></div>)}
      {!messages.some((message) => message.role === "user") && !busy && <div className="mt-6 flex flex-wrap gap-2"><p className="sr-only">Quick actions</p>{["How much did I spend this month?", "Am I over budget?", "Predict next month's spending", "Show any unusual transactions", "What is compound interest?", "Generate my PDF report"].map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)} className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs font-medium text-ink-muted transition-all hover:border-accent-primary/30 hover:bg-accent-primary/10 hover:text-accent-secondary">{prompt}</button>)}</div>}
      {status && <p className="text-xs text-ink-muted" role="status">{status}</p>}<div ref={bottomRef} />
    </div>
    {voiceMode && <div className="mx-3 mb-3 flex flex-col items-center justify-center rounded-2xl border border-border bg-surface-secondary/30 py-6 shadow-inner"><div className="relative flex size-20 items-center justify-center">{(recording || speaking !== null) && <div className={`absolute inset-0 rounded-full animate-ping ${recording ? "bg-accent-primary/20" : "bg-wealth-green/20"}`} />}<button type="button" onClick={toggleVoiceMode} className={`relative z-10 grid size-14 place-items-center rounded-full shadow-lg transition-all ${recording ? "scale-110 bg-accent-primary text-white" : speaking !== null ? "scale-110 bg-wealth-green text-white" : isThinking ? "bg-ink-muted text-white" : "bg-surface text-ink"}`}>{speaking !== null ? <SpeakerWaveIcon className="size-7" /> : <MicrophoneIcon className="size-7" />}</button></div><p className="mt-3 text-sm font-semibold text-ink">{recording ? "Listening…" : isThinking ? "Thinking…" : speaking !== null ? "Speaking…" : "Tap to speak"}</p><button type="button" onClick={() => { const nextLanguage = language === "en-IN" ? "hi-IN" : "en-IN"; languageRef.current = nextLanguage; setLanguage(nextLanguage); window.speechSynthesis?.cancel(); speakVoiceResponse(nextLanguage === "hi-IN" ? "Ab main aapse Hindi mein baat karunga. Bataiye, kya jaanna hai?" : "I have switched back to English. How can I help you?"); }} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-surface"><GlobeAltIcon className="size-3.5" />Switch to {language === "en-IN" ? "Hindi" : "English"}</button></div>}
    <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-border bg-surface p-3 sm:p-4">
      <button type="button" onClick={toggleVoice} aria-label={recording ? "Stop recording" : "Voice input"} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border ${recording ? "animate-pulse bg-error text-white" : "text-ink-muted hover:bg-surface-secondary"}`}><MicrophoneIcon className="h-5 w-5" /></button>
      <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={recording ? "Listening…" : "Ask about spending, budgets, or goals…"} disabled={busy} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-primary" />
      {busy ? <button type="button" aria-label="Stop response" onClick={() => abortRef.current?.abort()} className="grid h-10 w-10 place-items-center rounded-xl bg-error text-white"><StopIcon className="h-5 w-5" /></button> : <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid h-10 w-10 place-items-center rounded-xl bg-accent-primary text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button>}
    </form>
  </section>;
}

"use client";

import { useState, useRef, useEffect } from "react";

interface LogLine {
  id: number;
  type: "input" | "output" | "error" | "system" | "success";
  text: string;
  ts: string;
}

function timestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

// DirectClient routes by name if UUID isn't found — use the character name
const AGENT_ID = "PRISM%20Orchestrator";

async function sendToAgent(text: string): Promise<string> {
  const agentUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001").replace("ws://", "http://");
  try {
    const res = await fetch(`${agentUrl}/${AGENT_ID}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, userId: "ui-terminal", roomId: "terminal" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data.map((d: any) => d.text).join("\n") : data.text ?? JSON.stringify(data);
  } catch {
    return `[Agent offline] Command received: "${text}"\nStart the agent with: bun run dev:agent`;
  }
}

const HELP_TEXT = `
Available commands:
  prism create "<question>"   — Deploy a new prediction market on Solana
  prism search <query>        — Search PMXT markets (Polymarket + Kalshi)
  prism oracle <topic>        — Run Switchboard NLP consensus for a topic
  prism status                — Show active markets and agent health
  clear                       — Clear terminal
  help                        — Show this message
`.trim();

export default function TerminalUI() {
  const [lines, setLines] = useState<LogLine[]>([]);

  useEffect(() => {
    setLines([
      { id: 0, type: "system", text: "PRISM Terminal v1 ", ts: timestamp() },
      { id: 1, type: "system", text: 'Type "help" for available commands.', ts: timestamp() },
    ]);
  }, []);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [processing, setProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  let idCounter = useRef(2);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const addLine = (type: LogLine["type"], text: string) => {
    setLines((prev) => [
      ...prev,
      { id: idCounter.current++, type, text, ts: timestamp() },
    ]);
  };

  const handleSubmit = async () => {
    const cmd = input.trim();
    if (!cmd) return;

    addLine("input", `$ ${cmd}`);
    setHistory((h) => [cmd, ...h]);
    setHistoryIdx(-1);
    setInput("");

    if (cmd === "clear") {
      setLines([]);
      return;
    }
    if (cmd === "help") {
      addLine("output", HELP_TEXT);
      return;
    }
    if (cmd === "prism status") {
      setProcessing(true);
      addLine("system", "Checking system status...");
      try {
        const agentUrl = (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001").replace("ws://", "http://");
        const backendUrl = "http://localhost:5001";
        const rpcUrl = "https://api.devnet.solana.com";

        const [agentRes, backendRes, rpcRes] = await Promise.allSettled([
          fetch(`${agentUrl}/health`, { signal: AbortSignal.timeout(2000) }),
          fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(2000) }),
          fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" }),
            signal: AbortSignal.timeout(3000),
          }),
        ]);

        const agentOk = agentRes.status === "fulfilled" && agentRes.value.ok;
        const backendOk = backendRes.status === "fulfilled" && backendRes.value.ok;
        const slotData = rpcRes.status === "fulfilled" ? await rpcRes.value.json().catch(() => null) : null;
        const slot = slotData?.result;

        setLines((prev) => prev.filter((l) => l.text !== "Checking system status..."));
        addLine("success", [
          `[PRISM] System status:`,
          `• ElizaOS agent   ${agentOk ? "ONLINE  :3001" : "OFFLINE — bun run dev:agent"}`,
          `• MiroFish backend ${backendOk ? "ONLINE  :5001" : "OFFLINE — cd backend && venv311/Scripts/python.exe run.py"}`,
          `• Solana devnet   ${slot ? `ONLINE  slot #${slot.toLocaleString()}` : "UNREACHABLE"}`,
        ].join("\n"));
      } catch {
        addLine("error", "[PRISM] Status check failed");
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    addLine("system", "Processing...");
    try {
      const response = await sendToAgent(cmd);
      setLines((prev) => prev.filter((l) => l.text !== "Processing..."));
      addLine("output", response);
    } catch (err: any) {
      addLine("error", `Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "ArrowUp") {
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setInput(history[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : history[idx] ?? "");
    }
  };

  const colorClass = (type: LogLine["type"]) => {
    switch (type) {
      case "input":   return "text-prism-cyan";
      case "error":   return "text-prism-red";
      case "system":  return "text-prism-dim";
      case "success": return "text-prism-green glow-green";
      default:        return "text-[#c8d0e8]";
    }
  };

  return (
    <div
      className="flex flex-col h-full card m-4 overflow-hidden cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1a2e] bg-[#0f0f1a]">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3366]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88]" />
        </div>
        <span className="text-prism-dim text-xs ml-2">prism-terminal — devnet</span>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-3">
            <span className="text-prism-dim shrink-0 select-none">{line.ts}</span>
            <span className={`whitespace-pre-wrap break-all ${colorClass(line.type)}`}>
              {line.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="border-t border-[#1a1a2e] px-4 py-3 flex items-center gap-2">
        <span className="text-prism-green shrink-0 glow-green">◈</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={processing}
          placeholder={processing ? "processing..." : "prism create ..."}
          className="flex-1 bg-transparent outline-none text-prism-cyan placeholder-prism-dim text-xs caret-[#00ff88]"
          autoComplete="off"
          spellCheck={false}
        />
        {processing && <span className="cursor" />}
      </div>
    </div>
  );
}

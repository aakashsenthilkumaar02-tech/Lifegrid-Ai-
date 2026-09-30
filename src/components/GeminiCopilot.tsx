/**
 * LIFEGRID AI — Prototype 0.2 Gemini Tactical Copilot
 * Server-backed function-calling assistant for disaster cascade mitigation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ScenarioSession } from '../types/lifegrid';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  CheckCircle,
  Terminal,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface GeminiCopilotProps {
  session: ScenarioSession;
  onRefreshSession: () => Promise<void>;
}

export const GeminiCopilot: React.FC<GeminiCopilotProps> = ({
  session,
  onRefreshSession,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_welcome',
      role: 'assistant',
      content: `LIFEGRID AI Command Copilot initialized. I have real-time visibility into all 5 infrastructure sectors, continuous cascade pressure propagation, and the GeoJSON storm surge envelope. Ask for strategic recommendations or command me to deploy resources and advance simulation steps.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeterministic, setIsDeterministic] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickPrompts = [
    'Recommend optimal microgrid placement to stop cascade',
    'Advance simulation 2 steps to test multi-hop propagation',
    'Query critical node status and failure thresholds',
    'Explain cross-sector water and hospital dependencies',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionId: session.id,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error (${res.status})`);
      }

      const data = await res.json();
      setIsDeterministic(data.isDeterministicFallback);

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Action processed.',
        timestamp: new Date().toLocaleTimeString(),
        toolInvocations: data.toolCalls || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If tools mutated the session, refresh scenario state
      if (data.toolCalls && data.toolCalls.length > 0) {
        await onRefreshSession();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `Command execution error: ${err.message}. Please check connection.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col h-[560px] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 pb-2.5 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
              GEMINI 3.8 FLASH // FUNCTION-CALLING AGENT
            </div>
            <h4 className="font-bold text-sm text-white">Autonomous Crisis Copilot</h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            {isDeterministic === false
              ? 'Gemini 3.8 Flash'
              : isDeterministic === true
              ? 'Deterministic Demo Mode'
              : 'Auto-Detect'}
          </span>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-400 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Function Tool Calls Executed */}
              {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-[10px]">
                  <div className="text-cyan-400 font-bold flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Tool Invocations Executed:
                  </div>
                  {msg.toolInvocations.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 p-2 rounded border border-slate-800 space-y-1 text-slate-300"
                    >
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="font-bold">{t.toolName}</span>
                        <CheckCircle className="w-3 h-3" />
                      </div>
                      <div className="text-slate-400 truncate">
                        Args: {JSON.stringify(t.args)}
                      </div>
                      {t.result && (
                        <div className="text-cyan-300">
                          Result: {JSON.stringify(t.result)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`text-[9px] mt-1 text-right font-mono ${
                  msg.role === 'user' ? 'text-cyan-950/70' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-center text-xs text-slate-400 italic font-mono pl-8">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            Gemini evaluating cascade graph & tool invocations...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="py-2 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(qp)}
            className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-300 text-slate-400 whitespace-nowrap transition"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="pt-2 border-t border-slate-800 flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Command copilot (e.g. Deploy microgrid to coastal sub, advance step)..."
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};

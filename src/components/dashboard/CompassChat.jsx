import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from 'react-markdown';
import { Send, Compass, Loader2, Sparkles, Activity, Plus, History, X, Trash2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_CHIPS = [
  { label: 'למה לקוחות לא סוגרים?', icon: '🔍' },
  { label: 'מה המוצר הכי מבוקש?', icon: '🏆' },
  { label: 'ניתוח ROI שבועי', icon: '📊' },
  { label: 'מה נקודות החיכוך העיקריות?', icon: '⚡' },
  { label: 'תן לי שורה תחתונה', icon: '💡' },
];

const SYSTEM_PROMPT = `You are 'The Compass of Knowledge (מצפן הידע)', a world-class Business Consultant and Data Analyst. Your goal is to analyze the provided ChatSessions, Leads, and conversations and extracted Facts to give the business owner strategic advice.
• Focus: Identify revenue leaks, high-converting patterns, common customer friction points, and untapped opportunities.
• Tone: Direct, professional, insightful, and action-oriented. Use 'Business-Hebrew'.
• Structure: Start with a 'Bottom Line' (שורה תחתונה), followed by deep insights, and end with 3 specific 'Action Items' (פעולות לביצוע).
• Constraint: Do not just repeat data. Interpret it. If 20 people asked about price and 0 bought, tell them their pricing strategy or value proposition needs fixing.`;

const STORAGE_KEY = (tenantId) => `compass_chats_${tenantId}`;

function loadChats(tenantId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(tenantId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveChats(tenantId, chats) {
  localStorage.setItem(STORAGE_KEY(tenantId), JSON.stringify(chats));
}

export default function CompassChat({ tenantId, leads = [], sessions = [] }) {
  const [chats, setChats] = useState(() => loadChats(tenantId));
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dynamicChips, setDynamicChips] = useState([]);
  const [chipsLoading, setChipsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  // Persist chats to localStorage whenever they change
  useEffect(() => {
    saveChats(tenantId, chats);
  }, [chats, tenantId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clear dynamic chips when switching chats or starting new
  useEffect(() => {
    setDynamicChips([]);
  }, [activeChatId]);

  const generateDynamicChips = useCallback(async (conversationMessages) => {
    if (!conversationMessages.length) return;
    setChipsLoading(true);
    try {
      const lastAssistant = [...conversationMessages].reverse().find(m => m.role === 'assistant')?.content || '';
      const recentHistory = conversationMessages.slice(-4).map(m =>
        `${m.role === 'user' ? 'בעל העסק' : 'המצפן'}: ${m.content?.slice(0, 200)}`
      ).join('\n');

      const statsSnippet = `לידים: ${leads.length}, חדשים: ${leads.filter(l=>l.status==='new').length}, אבודים: ${leads.filter(l=>l.status==='lost').length}, המרות: ${leads.filter(l=>l.status==='converted').length}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You generate follow-up suggestion chips for a business intelligence chat called "מצפן הידע" (Knowledge Compass).

Context - last exchange:
${recentHistory}

Business stats: ${statsSnippet}

Generate EXACTLY 4 short follow-up questions (3-6 words each) in Hebrew that a business owner would naturally want to ask NEXT based on what was just discussed.
Rules:
- Make them specific and actionable, not generic
- They should drill deeper or pivot to related business insights
- Each should feel like a natural "what about...?" follow-up
- Use business Hebrew, concise

Return exactly 4 suggestions.`,
        response_json_schema: {
          type: "object",
          properties: { suggestions: { type: "array", items: { type: "string" } } },
          required: ["suggestions"]
        }
      });
      setDynamicChips(result?.suggestions?.slice(0, 4) || []);
    } catch (err) {
      console.error('Error generating compass chips:', err);
      setDynamicChips([]);
    } finally {
      setChipsLoading(false);
    }
  }, [leads]);

  const createNewChat = useCallback(() => {
    const newChat = {
      id: Date.now().toString(),
      title: 'שיחה חדשה',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setShowHistory(false);
  }, []);

  const deleteChat = useCallback((chatId, e) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
  }, [activeChatId]);

  const updateChatMessages = useCallback((chatId, newMessages, title) => {
    setChats(prev => prev.map(c => 
      c.id === chatId 
        ? { ...c, messages: newMessages, ...(title ? { title } : {}) }
        : c
    ));
  }, []);

  const buildContext = () => {
    const leadSummaries = leads.slice(0, 80).map(l => ({
      name: l.customer_name, status: l.status, sentiment: l.sentiment,
      intent_score: l.intent_score, inquiry: l.inquiry_reason,
      summary: l.summary, action: l.ai_suggested_action,
      urgency: l.urgency_level, competitor: l.competitor_detected, facts: l.facts_json,
    }));
    const sessionSummaries = sessions.slice(0, 50).map(s => ({
      customer: s.customer_name, status: s.status,
      inquiry: s.inquiry_reason, collected: s.collected_details,
    }));
    const statsBlock = {
      total_leads: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      contacted: leads.filter(l => l.status === 'contacted').length,
      converted: leads.filter(l => l.status === 'converted').length,
      lost: leads.filter(l => l.status === 'lost').length,
      avg_intent: leads.length ? Math.round(leads.reduce((s, l) => s + (l.intent_score || 0), 0) / leads.length) : 0,
      positive_sentiment: leads.filter(l => l.sentiment === 'positive').length,
      negative_sentiment: leads.filter(l => l.sentiment === 'negative').length,
      competitor_mentions: leads.filter(l => l.competitor_detected).length,
      active_sessions: sessions.filter(s => s.status === 'active').length,
    };
    return JSON.stringify({ stats: statsBlock, leads: leadSummaries, sessions: sessionSummaries }, null, 0);
  };

  const handleSend = async (text) => {
    const question = text || input.trim();
    if (!question || isLoading) return;

    // Auto-create a chat if none is active
    let chatId = activeChatId;
    if (!chatId) {
      const newChat = {
        id: Date.now().toString(),
        title: question.slice(0, 40),
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      chatId = newChat.id;
    }

    const currentMessages = chats.find(c => c.id === chatId)?.messages || [];
    const newMessages = [...currentMessages, { role: 'user', content: question }];
    
    // Set title from first user message
    const isFirst = currentMessages.length === 0;
    updateChatMessages(chatId, newMessages, isFirst ? question.slice(0, 40) : null);
    
    setInput('');
    setIsLoading(true);
    setPulseActive(true);

    const context = buildContext();
    const conversationHistory = newMessages.slice(-6).map(m =>
      `${m.role === 'user' ? 'שאלת הבעלים' : 'המצפן'}:\n${m.content}`
    ).join('\n\n');

    const prompt = `${SYSTEM_PROMPT}

=== נתוני העסק (${leads.length} לידים, ${sessions.length} שיחות) ===
${context}

=== היסטוריית שיחה ===
${conversationHistory}

=== שאלה נוכחית ===
${question}

ענה בעברית. היה ישיר וקצר לעניין. השתמש במבנה: שורה תחתונה -> תובנות -> פעולות לביצוע.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const finalMessages = [...newMessages, { role: 'assistant', content: result }];
      updateChatMessages(chatId, finalMessages);
      generateDynamicChips(finalMessages);
    } catch (err) {
      const finalMessages = [...newMessages, { role: 'assistant', content: '❌ שגיאה בניתוח. נסה שוב.' }];
      updateChatMessages(chatId, finalMessages);
    } finally {
      setIsLoading(false);
      setPulseActive(false);
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 shadow-2xl overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              מצפן הידע
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-400 truncate">יועץ עסקי AI · מנתח {leads.length} לידים ו-{sessions.length} שיחות</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AnimatePresence>
            {pulseActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="text-xs text-indigo-300">מנתח...</span>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-9 w-9"
          >
            <History className="w-4.5 h-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={createNewChat}
            className="text-slate-400 hover:text-white hover:bg-white/10 h-9 w-9"
          >
            <Plus className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-white/10 overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-3 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 font-medium">היסטוריית שיחות</span>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="h-6 w-6 text-slate-500 hover:text-white hover:bg-white/10">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              {chats.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">אין שיחות קודמות</p>
              ) : (
                <div className="space-y-1">
                  {chats.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => { setActiveChatId(chat.id); setShowHistory(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-right transition-all group ${
                        chat.id === activeChatId
                          ? 'bg-indigo-500/20 border border-indigo-500/30 text-white'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{chat.title}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(chat.createdAt)} · {chat.messages.length} הודעות</p>
                      </div>
                      <button
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div ref={scrollRef} className="h-[420px] overflow-y-auto px-4 sm:px-6 py-4 space-y-4 scroll-smooth">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
              <Compass className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">שאל את המצפן</p>
              <p className="text-slate-400 text-sm max-w-md">שאל כל שאלה עסקית — המצפן ינתח את הלידים, השיחות והנתונים שלך ויחזיר תובנות אסטרטגיות.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {INITIAL_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(chip.label)}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-white transition-all duration-200 flex items-center gap-1.5"
                >
                  <span>{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            {msg.role === 'user' ? (
              <div className="max-w-[85%] px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-full w-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">המצפן</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-slate-200 prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-indigo-300 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-indigo-200 [&_strong]:text-white [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:my-1 [&_ol]:my-1 [&_hr]:border-white/10 [&_hr]:my-3">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Compass className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(j => (
                <motion.div key={j} className="w-2 h-2 rounded-full bg-indigo-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">מנתח את הנתונים שלך...</span>
          </motion.div>
        )}
      </div>

      {/* Dynamic suggestion chips after messages */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 sm:px-6 pb-2">
          {chipsLoading ? (
            <div className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              <span className="text-[10px] text-slate-500">מייצר הצעות...</span>
            </div>
          ) : dynamicChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {dynamicChips.map((chip, i) => (
                <motion.button
                  key={`dyn-${i}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleSend(chip)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 hover:text-white transition-all"
                >
                  {chip}
                </motion.button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Input */}
      <div className="px-4 sm:px-6 py-4 border-t border-white/10">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="שאל את המצפן שאלה עסקית..."
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 text-right"
            disabled={isLoading}
            dir="rtl"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 px-4"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
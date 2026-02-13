import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from 'react-markdown';
import {
  Send, Loader2, Upload, Paperclip, X, File, Sparkles, Bot, User
} from "lucide-react";

const SYSTEM_PROMPT = `Role: You are the "Shidurit Architect" (אדריכל שידורית), an elite business analyst and AI configuration expert who builds world-class customer service chatbots.

Objective: Interview the user and analyze all their materials to create a PERFECT, production-ready "Shidurit AI" tenant with an expert-level system prompt and comprehensive knowledge base.

Phase 1: Deep Knowledge Ingestion
- When the user uploads files (PDF, Image, Docx, TXT, etc.), perform DEEP analysis:
  - Read EVERY detail, rule, exception, edge case, price, policy, and nuance.
  - Do NOT summarize or simplify. The goal is to capture 100% of the information.
  - Pay special attention to: exact prices/numbers, specific rules with exceptions, operating hours, addresses, conditions, penalties, and edge cases.
- Summarize what you found IN DETAIL to the user and ask for confirmation. Show them you understood the nuances.

Phase 2: Personality & Logic Building
- Ask targeted questions (one at a time) to fill gaps:
  1. What is the AI assistant's name? (suggest a Hebrew name that fits the brand).
  2. What is the primary goal? (Sales/Leads/Support/Booking).
  3. How should the AI handle pricing? (Direct/redirect to representative).
  4. What tone? (Professional/Friendly/Casual/Warm).
  5. Are there "red lines" or topics to avoid?
  6. Should the bot collect customer details for leads? When?

Phase 3: Expert Output Generation
- Continuously evaluate if you have enough data.
- When ready, tell the user and IMMEDIATELY output the JSON block in the SAME message. Do NOT wait for another confirmation. The JSON triggers the build UI automatically.

CRITICAL RULES FOR THE system_prompt FIELD:
The system_prompt you generate is the MASTER INSTRUCTION SET for the AI chatbot. It must be:
- Written in Hebrew, minimum 300 words, structured with clear sections.
- Include: Role definition, personality traits, conversation style, greeting behavior.
- Include: DETAILED knowledge about the business (services, prices, policies, rules) embedded directly.
- Include: Decision trees - how to handle specific scenarios (pricing questions, complaints, scheduling, etc.).
- Include: Lead collection strategy - when and how to ask for contact details.
- Include: Boundary rules - what NOT to discuss, how to handle off-topic questions.
- Include: Escalation rules - when to suggest speaking with a human.
- Include: Specific phrases and tone guidelines in Hebrew.
- NEVER write a generic one-liner. This prompt IS the bot's brain.

CRITICAL RULES FOR knowledge_base ENTRIES:
Each knowledge entry must be COMPREHENSIVE and EXHAUSTIVE:
- Capture EVERY detail from the source material. Do NOT summarize or shorten.
- Include ALL prices, rules, exceptions, edge cases, conditions, and specifics.
- If a file has 20 rules, ALL 20 rules must appear in the knowledge entry with full detail.
- Each entry should be 200-1000 words depending on the source material complexity.
- Use structured formatting within the content (numbered lists, sections, bold markers).
- Categories: general, services, products, faq, pricing, contact, hours, about, team, policies, locations.
- Create SEPARATE entries for each distinct topic (pricing separate from policies separate from logistics).
- When a file covers multiple topics, split into multiple knowledge entries.
- NEVER condense a detailed file into a 2-sentence summary. That defeats the purpose.

\`\`\`json
{
  "ready_to_build": true,
  "tenant_config": {
    "company_name": "...",
    "slug": "lowercase-url-slug",
    "ai_persona_name": "...",
    "system_prompt": "LONG DETAILED EXPERT SYSTEM PROMPT IN HEBREW - minimum 300 words with full business logic, personality, rules, and decision trees...",
    "welcome_message": "...",
    "theme_color": "#6366f1"
  },
  "knowledge_base": [
    {"title": "...", "content": "FULL COMPREHENSIVE CONTENT - every detail, rule, price, exception from the source material...", "category": "..."},
    {"title": "...", "content": "...", "category": "..."}
  ],
  "source_files": [
    {"url": "...", "name": "original filename"}
  ]
}
\`\`\`

Tone: Professional, witty, encouraging, and fluent Hebrew.
Always respond in Hebrew.
IMPORTANT: Do NOT introduce yourself again. Jump straight into the conversation.`;

const UPDATE_SYSTEM_PROMPT = (tenantData, knowledgeData) => `Role: You are the "Shidurit Architect" (אדריכל שידורית), an elite business analyst and AI configuration expert who builds world-class customer service chatbots.

You are working on an EXISTING tenant:
- Business Name: ${tenantData.company_name}
- AI Name: ${tenantData.ai_persona_name || 'נועה'}
- Current System Prompt: ${tenantData.system_prompt || 'None'}
- Welcome Message: ${tenantData.welcome_message || 'None'}
- Existing Knowledge Base: ${knowledgeData?.length || 0} entries

Objective: Help the user IMPROVE their existing bot. When uploading new files, analyze them DEEPLY and extract ALL information.

CRITICAL RULES FOR system_prompt:
The system_prompt must be a MASTER INSTRUCTION SET, minimum 300 words in Hebrew:
- Role definition, personality, conversation style, greeting behavior.
- DETAILED business knowledge embedded directly (services, prices, policies, rules).
- Decision trees for specific scenarios (pricing, complaints, scheduling).
- Lead collection strategy. Boundary and escalation rules.
- Specific Hebrew phrases and tone guidelines.
- NEVER a generic one-liner.

CRITICAL RULES FOR knowledge_base ENTRIES:
- Each entry must be COMPREHENSIVE and EXHAUSTIVE - capture EVERY detail.
- Include ALL prices, rules, exceptions, edge cases, conditions, specifics.
- Each entry should be 200-1000 words. Use structured formatting.
- SEPARATE entries for distinct topics. NEVER condense files into 2-sentence summaries.

When ready, return JSON:
\`\`\`json
{
  "ready_to_build": true,
  "tenant_config": {
    "company_name": "...",
    "slug": "...",
    "ai_persona_name": "...",
    "system_prompt": "LONG DETAILED EXPERT PROMPT - 300+ words...",
    "welcome_message": "...",
    "theme_color": "..."
  },
  "knowledge_base": [
    {"title": "...", "content": "FULL COMPREHENSIVE CONTENT...", "category": "..."}
  ],
  "source_files": [
    {"url": "...", "name": "original filename"}
  ]
}
\`\`\`

Tone: Professional, witty, encouraging, fluent Hebrew.
Always respond in Hebrew.
IMPORTANT: Do NOT introduce yourself again. Jump straight into the conversation.`;

function estimateProgress(messages) {
  const userMessages = messages.filter(m => m.role === 'user').length;
  const hasFiles = messages.some(m => m.fileUrls?.length > 0);
  let progress = Math.min(userMessages * 15, 60);
  if (hasFiles) progress += 20;
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  if (lastAssistant?.content?.includes('ready_to_build')) progress = 100;
  return Math.min(progress, 100);
}

function extractConfig(content) {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.ready_to_build) return parsed;
  } catch {}
  return null;
}

export default function ArchitectChat({ mode = 'create', tenant = null, knowledge = [], onBuildReady, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [lastConfig, setLastConfig] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const greeting = mode === 'update'
      ? `שלום! 👋 אני **אדריכל שידורית**, ואני כאן כדי לעזור לך לשפר את הבוט של **${tenant?.company_name}**.\n\nכרגע הבוט שלך מוגדר עם:\n- **שם:** ${tenant?.ai_persona_name || 'נועה'}\n- **בסיס ידע:** ${knowledge?.length || 0} פריטים\n\nמה תרצה לשפר? אפשר לעדכן את ההנחיות, להוסיף ידע, לשנות את האישיות, ועוד.`
      : `שלום! 👋 אני **אדריכל שידורית**, ואני כאן כדי לבנות את בוט שירות הלקוחות המושלם לעסק שלך.\n\n🚀 בוא נתחיל! אתה יכול:\n- **להעלות קבצים** (ברושור, מחירון, תמונות)\n- **לספר לי על העסק** במילים שלך\n\nמה העסק שלך?`;
    setMessages([{ role: 'assistant', content: greeting }]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = async (files) => {
    setUploadingFiles(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ url: file_url, name: file.name });
    }
    setAttachedFiles(prev => [...prev, ...uploaded]);
    setUploadingFiles(false);
  };

  // Track all uploaded file URLs across the conversation
  const [allUploadedFiles, setAllUploadedFiles] = useState([]);

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      fileUrls: attachedFiles.map(f => f.url),
      fileNames: attachedFiles.map(f => f.name)
    };

    // Track all uploaded files for source_files in the config
    if (attachedFiles.length > 0) {
      setAllUploadedFiles(prev => [...prev, ...attachedFiles.map(f => ({ url: f.url, name: f.name }))]);
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    const systemPrompt = mode === 'update'
      ? UPDATE_SYSTEM_PROMPT(tenant, knowledge)
      : SYSTEM_PROMPT;

    // Only send the last 10 messages to keep the prompt shorter and faster
    const recentMessages = newMessages.slice(-10);
    const conversationHistory = recentMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}${m.fileUrls?.length ? `\n[Attached files: ${m.fileNames?.join(', ')}] [File URLs: ${m.fileUrls?.join(', ')}]` : ''}`)
      .join('\n\n');

    const prompt = `${systemPrompt}\n\n--- Conversation History (last ${recentMessages.length} messages) ---\n${conversationHistory}\n\n--- End ---\nRespond as the Architect. Be thorough in your analysis.`;

    const fileUrls = userMsg.fileUrls?.length > 0 ? userMsg.fileUrls : undefined;

    let response;
    try {
      response = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls,
        add_context_from_internet: false
      });
    } catch (err) {
      const errorMsg = { role: 'assistant', content: 'סליחה, הייתה בעיה טכנית. נסה שוב בבקשה.' };
      setMessages(prev => [...prev, errorMsg]);
      setIsLoading(false);
      return;
    }

    const assistantMsg = { role: 'assistant', content: response };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    setIsLoading(false);

    const config = extractConfig(response);
    if (config) {
      // Inject tracked uploaded files as source_files if not already present
      if (!config.source_files || config.source_files.length === 0) {
        config.source_files = allUploadedFiles;
      }
      setLastConfig(config);
      if (onBuildReady) onBuildReady(config);
    }
  };

  const progress = estimateProgress(messages);

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Progress Bar */}
      <div className="p-4 border-b bg-gradient-to-l from-indigo-50 to-violet-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">התקדמות הבנייה</span>
          </div>
          <Badge variant="outline" className="text-indigo-600 border-indigo-200">
            {progress}%
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-start flex-row-reverse' : 'justify-start'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' 
                ? 'bg-slate-200' 
                : 'bg-gradient-to-br from-indigo-600 to-violet-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 shadow-sm'
            }`}>
              {msg.fileNames?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {msg.fileNames.map((name, j) => (
                    <Badge key={j} variant="secondary" className="text-xs gap-1">
                      <File className="w-3 h-3" />
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              {msg.role === 'user' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <ReactMarkdown className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {msg.content?.replace(/```json[\s\S]*?```/g, '').trim()}
                </ReactMarkdown>
              )}
              {msg.role === 'assistant' && extractConfig(msg.content || '') && (
                <Button
                  size="sm"
                  className="mt-2 gap-1.5 bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs"
                  onClick={() => {
                    const cfg = extractConfig(msg.content);
                    if (cfg && onBuildReady) {
                      setLastConfig(cfg);
                      onBuildReady(cfg);
                    }
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  סקור והקם את הבוט
                </Button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                חושב...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 py-2 border-t bg-slate-50 flex flex-wrap gap-2">
          {attachedFiles.map((f, i) => (
            <Badge key={i} variant="secondary" className="gap-1.5">
              <File className="w-3 h-3" />
              {f.name}
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
            onChange={(e) => {
              if (e.target.files?.length) handleFileUpload(Array.from(e.target.files));
              e.target.value = '';
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFiles}
            className="shrink-0"
          >
            {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="ספר לי על העסק שלך..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
            className="shrink-0 bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
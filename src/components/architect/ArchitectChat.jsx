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

const SYSTEM_PROMPT = `Role: You are the "Shidurit Architect" (אדריכל שידורית), an elite business analyst and AI configuration expert.
Model: Gemini 3 Flash.

Objective: Interview the user to gather all necessary data to create a perfect "Shidurit AI" tenant.

Phase 1: Knowledge Ingestion
- Analyze any uploaded files (PDF, Image, Docx).
- Extract: Business name, core services, target audience, and unique brand voice.
- Summarize what you found to the user and ask for confirmation.

Phase 2: Personality & Logic Building
- Ask targeted questions (one at a time) to fill gaps:
  1. What is the AI's name? (e.g., "Noa").
  2. What is the primary goal? (Sales/Leads/Support).
  3. How should the AI handle pricing questions? (Direct answer or "representative will call").
  4. Are there specific "red lines" or taboo topics?

Phase 3: Readiness & Output
- Continuously evaluate if you have enough data to fill the 'Tenant' and 'KnowledgeEntry' schemas.
- When you feel you have enough info (business name, services, AI persona name, goal, and basic knowledge), tell the user you're ready and IMMEDIATELY output the JSON block below in the SAME message. Do NOT wait for another confirmation. Do NOT say "shall I build it?" without the JSON. The JSON triggers the build UI automatically.
- CRITICAL: You MUST include the \`\`\`json ... \`\`\` block in your message when ready. Without it, nothing happens. Always include it once you have enough data.

\`\`\`json
{
  "ready_to_build": true,
  "tenant_config": {
    "company_name": "...",
    "slug": "lowercase-url-slug",
    "ai_persona_name": "...",
    "system_prompt": "A detailed system prompt in Hebrew for the AI bot...",
    "welcome_message": "...",
    "theme_color": "#6366f1"
  },
  "knowledge_base": [
    {"title": "...", "content": "...", "category": "..."}
  ]
}
\`\`\`

Tone: Professional, witty, encouraging, and fluent Hebrew.
Always respond in Hebrew.
IMPORTANT: Do NOT introduce yourself again - the user has already seen your introduction in the UI. Jump straight into the conversation.`;

const UPDATE_SYSTEM_PROMPT = (tenantData, knowledgeData) => `Role: You are the "Shidurit Architect" (אדריכל שידורית), an elite business analyst and AI configuration expert.

You are working on an EXISTING tenant that already has configuration:
- Business Name: ${tenantData.company_name}
- AI Name: ${tenantData.ai_persona_name || 'נועה'}
- Current System Prompt: ${tenantData.system_prompt || 'None'}
- Welcome Message: ${tenantData.welcome_message || 'None'}
- Existing Knowledge Base: ${knowledgeData?.length || 0} entries

Objective: Help the user IMPROVE their existing bot configuration. You can suggest improvements to the system prompt, welcome message, add knowledge entries, or change settings.

When you have improvements ready, return a structured JSON wrapped in \`\`\`json ... \`\`\`:
\`\`\`json
{
  "ready_to_build": true,
  "tenant_config": {
    "company_name": "...",
    "slug": "...",
    "ai_persona_name": "...",
    "system_prompt": "...",
    "welcome_message": "...",
    "theme_color": "..."
  },
  "knowledge_base": [
    {"title": "...", "content": "...", "category": "..."}
  ]
}
\`\`\`

Tone: Professional, witty, encouraging, and fluent Hebrew.
Always respond in Hebrew.
IMPORTANT: Do NOT introduce yourself again - the user has already seen your introduction in the UI. Jump straight into the conversation.`;

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

  const handleSend = async () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      fileUrls: attachedFiles.map(f => f.url),
      fileNames: attachedFiles.map(f => f.name)
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    const systemPrompt = mode === 'update'
      ? UPDATE_SYSTEM_PROMPT(tenant, knowledge)
      : SYSTEM_PROMPT;

    const conversationHistory = newMessages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}${m.fileUrls?.length ? `\n[Attached files: ${m.fileNames?.join(', ')}]` : ''}`)
      .join('\n\n');

    const prompt = `${systemPrompt}\n\n--- Conversation History ---\n${conversationHistory}\n\n--- End ---\nRespond as the Architect:`;

    const fileUrls = userMsg.fileUrls?.length > 0 ? userMsg.fileUrls : undefined;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      add_context_from_internet: false
    });

    const assistantMsg = { role: 'assistant', content: response };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    setIsLoading(false);

    const config = extractConfig(response);
    if (config && onBuildReady) {
      onBuildReady(config);
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
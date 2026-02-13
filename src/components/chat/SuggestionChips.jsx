import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Phone, Clock, Info, CalendarCheck, MessageSquare, HelpCircle } from 'lucide-react';

const publicApi = async (payload) => {
  try {
    const { base44 } = await import('@/api/base44Client');
    const response = await base44.functions.invoke('publicChat', payload);
    return response.data;
  } catch (sdkErr) {
    const res = await fetch(`/functions/publicChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

const FIXED_ACTIONS = [
  { label: 'יצירת קשר', icon: Phone },
  { label: 'מידע על שירותים', icon: Info },
  { label: 'שעות פעילות', icon: Clock },
  { label: 'קביעת תור', icon: CalendarCheck },
  { label: 'שאלות נפוצות', icon: HelpCircle },
];

export default function SuggestionChips({ tenantId, messages, onSelect, themeColor, disabled, onOpenDetailsModal, detailsSubmitted }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const isFirstInteraction = messages.filter(m => m.role === 'user').length === 0;

  useEffect(() => {
    if (!tenantId || hasGenerated) return;
    generateTopics();
  }, [tenantId]);

  // Regenerate topics after each AI response (not first)
  useEffect(() => {
    if (!tenantId || isFirstInteraction) return;
    generateTopics();
  }, [messages.length]);

  const generateTopics = async () => {
    setLoading(true);
    try {
      const knowledgeRes = await publicApi({ action: 'getKnowledge', tenant_id: tenantId });
      const knowledge = knowledgeRes.entries || [];
      if (knowledge.length === 0) {
        setTopics(['מה אתם מציעים?', 'כמה זה עולה?', 'איפה אתם נמצאים?', 'ספרו לי עליכם', 'יש מבצעים?']);
        setLoading(false);
        setHasGenerated(true);
        return;
      }

      const knowledgeSummary = knowledge.map(k => `- ${k.title} (${k.category}): ${k.content?.slice(0, 100) || ''}`).join('\n');

      const conversationContext = messages.length > 0
        ? messages.map(m => `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`).join('\n')
        : '';

      const prompt = isFirstInteraction
        ? `You are generating "popular topic" buttons for a customer chat. These appear BEFORE the customer asks anything.

Business knowledge base:
${knowledgeSummary}

Generate EXACTLY 6 short topic suggestions (2-5 words each) in Hebrew.
These should be the most relevant and interesting topics a customer would want to ask about THIS SPECIFIC business, based on its knowledge base.
Make them sound like natural questions or topics, not formal.
Examples: "התמחויות זמינות", "שירותים לרופאים", "מיקומי מרפאות", "מחירון טיפולים", "פורטל רופאים", "שירותים למטופלים"

Return exactly 6 suggestions.`
        : `Generate follow-up topic suggestions for an ongoing customer chat.

Business knowledge:
${knowledgeSummary}

Conversation so far:
${conversationContext}

Generate EXACTLY 6 short follow-up topics (2-5 words each) in Hebrew.
These should be natural next questions based on what was discussed.
Don't repeat topics already covered in the conversation.

Return exactly 6 suggestions.`;

      const llmRes = await publicApi({
        action: 'invokeLLM',
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Array of exactly 6 short topic texts in Hebrew"
            }
          },
          required: ["suggestions"]
        }
      });

      setTopics(llmRes.result?.suggestions?.slice(0, 6) || []);
      setHasGenerated(true);
    } catch (err) {
      console.error('Error generating topics:', err);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  // Show details chip logic
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
  const detailsKeywords = [
    'שמך', 'שם מלא', 'מספר טלפון', 'טלפון שלך', 'פרטים', 'פרטי התקשרות',
    'ליצור קשר', 'להשאיר פרטים', 'לחזור אליך', 'פרטי קשר', 'לקבוע תור',
    'נחזור אליך', 'ניצור קשר', 'מוזמן להשאיר', 'מוזמנת להשאיר',
  ];
  const isAskingForDetails = detailsKeywords.some(kw => lastAssistantMessage.includes(kw));
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const showDetailsChip = !detailsSubmitted && (isAskingForDetails || userMessageCount >= 2);

  const handleChipClick = (text) => {
    onSelect(text);
  };

  const chipBaseStyle = {
    borderColor: `${themeColor}30`,
    color: themeColor === '#ffffff' || themeColor === '#fff' ? '#334155' : themeColor,
  };

  return (
    <div className="py-2 space-y-3">
      {/* Row 1: Fixed quick actions */}
      <div>
        <div className="flex flex-wrap justify-center gap-2">
          {showDetailsChip && (
            <button
              onClick={() => onOpenDetailsModal?.()}
              disabled={disabled}
              className="text-sm px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap disabled:opacity-50 font-medium"
              style={{ borderColor: themeColor, color: 'white', backgroundColor: themeColor }}
            >
              📋 השאר פרטים
            </button>
          )}
          {FIXED_ACTIONS.map((action, i) => (
            <button
              key={`action-${i}`}
              onClick={() => handleChipClick(action.label)}
              disabled={disabled}
              className="text-sm px-3.5 py-2 rounded-full border transition-all whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5 hover:shadow-md bg-white/80 backdrop-blur-sm"
              style={chipBaseStyle}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: AI-generated popular topics */}
      <div>
        <p className="text-center text-xs text-slate-400 mb-2">נושאים פופולריים</p>
        {loading && !hasGenerated ? (
          <div className="flex justify-center py-1">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {topics.map((topic, i) => (
              <motion.button
                key={`topic-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleChipClick(topic)}
                disabled={disabled}
                className="text-sm px-3.5 py-2 rounded-full border transition-all whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5 hover:shadow-md bg-white/80 backdrop-blur-sm"
                style={chipBaseStyle}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {topic}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
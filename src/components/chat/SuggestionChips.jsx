import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function SuggestionChips({ tenantId, messages, onSelect, themeColor, disabled, onOpenDetailsModal }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);

  useEffect(() => {
    if (!tenantId) return;
    generateSuggestions();
  }, [tenantId, messages.length]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const knowledgeRes = await publicApi({ action: 'getKnowledge', tenant_id: tenantId });
      const knowledge = knowledgeRes.entries || [];
      
      if (knowledge.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const knowledgeSummary = knowledge.map(k => `- ${k.title} (${k.category}): ${k.content?.slice(0, 80) || ''}`).join('\n');

      const fullConversation = messages.map(m => 
        `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
      ).join('\n');

      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';

      const isFirstInteraction = messages.filter(m => m.role === 'user').length === 0;

      const llmRes = await publicApi({
        action: 'invokeLLM',
        prompt: isFirstInteraction 
          ? `You are generating suggestion chips for a customer chat interface in Hebrew.

Business name: "${knowledgeSummary.split('\n')[0]}"

This is the FIRST interaction - the customer just opened the chat.

Generate EXACTLY 10 short suggestion chips (2-4 words each) in Hebrew.
These should be the most BASIC and GENERIC questions ANY customer would ask ANY business. 
Do NOT use business-specific terminology or jargon. Keep it extremely simple.

Use suggestions like these (pick 10, adapt the wording to sound natural):
- מה אתם מציעים?
- כמה זה עולה?
- מתי אתם פתוחים?
- איפה אתם נמצאים?
- אפשר לקבוע תור?
- יש מבצעים?
- ספרו לי עליכם
- איך יוצרים קשר?
- מה התהליך?
- יש הדגמה?

Rules:
1. MAXIMUM 4 words per suggestion.
2. Use everyday Hebrew, no technical terms.
3. Think like someone who knows NOTHING about the business and just wants basics.
4. Do NOT mention specific product names, features, or services by name.

Return exactly 10 suggestions.`
          : `You are generating suggestion chips for a customer chat interface in Hebrew.

The business has knowledge about these topics:
${knowledgeSummary}

Full conversation so far:
${fullConversation}

Last assistant message: "${lastAssistantMsg}"

Rules:
1. Generate EXACTLY 10 suggestions.
2. ONLY suggest things the business has knowledge about.
3. Each suggestion should be 2-6 words in Hebrew.
4. Make them sound natural, like a real customer would say or ask.
5. The first 3-4 should be direct follow-ups to what was just discussed (proactive, flowing naturally from the last assistant message).
6. The next 3-4 should explore related but different topics from the knowledge base.
7. The last 2-3 should be general actions like asking for pricing, contact info, scheduling, etc.
8. Never repeat something the customer already asked.
9. Make each suggestion distinct - no duplicates or near-duplicates.
10. Order them by relevance to the current conversation flow.

Return exactly 10 suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Array of exactly 10 short suggestion texts in Hebrew"
            }
          },
          required: ["suggestions"]
        }
      });
      const result = llmRes.result;

      setSuggestions(result.suggestions?.slice(0, 12) || []);
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </div>
    );
  }

  // Show "Leave Details" chip: always after 2+ user messages, or if AI is asking for details
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
  const detailsKeywords = [
    'שמך', 'שם מלא', 'מספר טלפון', 'טלפון שלך', 'פרטים', 'פרטי התקשרות',
    'תאריך', 'שעה נוח', 'ליצור קשר', 'ספר לי מה שמך', 'אנא ספר', 'שתף אותי',
    'אימייל', 'בפרטים', 'להשאיר פרטים', 'לחזור אליך', 'מספר הטלפון', 'פרטי קשר',
    'השאר פרטים', 'שלח לי פרטים', 'פרטים נוספים', 'זקוקה ל', 'זקוק ל',
    'לקבוע תור', 'קביעת תור', 'תור עם', 'נציג', 'נחזור אליך', 'ניצור קשר',
    'השאירו פרטים', 'מוזמן להשאיר', 'מוזמנת להשאיר', 'אשמח לקבל', 'צריך את',
    'צריכה את', 'שם ומספר', 'שלח פרטים', 'למסור פרטים', 'תשאיר', 'תשאירי',
    'אפשר לעזור', 'לתאם', 'לזמן', 'ליצור איתך קשר'
  ];
  const isAskingForDetails = detailsKeywords.some(kw => lastAssistantMessage.includes(kw));
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const showDetailsChip = isAskingForDetails || userMessageCount >= 2;

  if (suggestions.length === 0 && !showDetailsChip) return null;

  const midpoint = Math.ceil(suggestions.length / 2);
  const row1 = suggestions.slice(0, midpoint);
  const row2 = suggestions.slice(midpoint);

  const ChipButton = ({ text, index }) => (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => {
        onSelect(text);
        setSuggestions([]);
      }}
      disabled={disabled}
      className="text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap disabled:opacity-50 flex-shrink-0"
      style={{ 
        borderColor: `${themeColor}40`,
        color: themeColor,
        backgroundColor: `${themeColor}08`
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}18`; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}08`; }}
    >
      {text}
    </motion.button>
  );

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    if (e.target === row1Ref.current && row2Ref.current) {
      row2Ref.current.scrollLeft = scrollLeft;
    } else if (e.target === row2Ref.current && row1Ref.current) {
      row1Ref.current.scrollLeft = scrollLeft;
    }
  };

  const DetailsChip = () => (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onOpenDetailsModal?.()}
      disabled={disabled}
      className="text-sm px-4 py-1.5 rounded-full border-2 transition-colors whitespace-nowrap disabled:opacity-50 flex-shrink-0 font-medium"
      style={{
        borderColor: themeColor,
        color: 'white',
        backgroundColor: themeColor,
      }}
    >
      📋 השאר פרטים
    </motion.button>
  );

  return (
    <div className="py-2">
      <style>{`
        .chips-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .chips-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .chips-scrollbar::-webkit-scrollbar-thumb {
          background: ${themeColor}40;
          border-radius: 4px;
        }
        .chips-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${themeColor}70;
        }
        @media (max-width: 768px) {
          .chips-scrollbar::-webkit-scrollbar {
            height: 0;
          }
          .chips-scrollbar {
            scrollbar-width: none !important;
          }
        }
      `}</style>
      <div className="flex items-center gap-1">
        {suggestions.length > 0 && row2.length > 0 && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-slate-100 transition-colors z-10"
            style={{ color: themeColor }}
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div ref={row1Ref} onScroll={handleScroll} className="flex gap-2 overflow-x-auto pb-1.5 chips-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: `${themeColor}40 transparent` }}>
            {showDetailsChip && <DetailsChip />}
            {row1.map((text, i) => <ChipButton key={`r1-${i}`} text={text} index={i} />)}
          </div>
          {!collapsed && row2.length > 0 && (
            <div ref={row2Ref} onScroll={handleScroll} className="flex gap-2 overflow-x-auto pb-1.5 chips-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: `${themeColor}40 transparent` }}>
              {row2.map((text, i) => <ChipButton key={`r2-${i}`} text={text} index={i + midpoint} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
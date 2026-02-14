import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Phone, Clock, Info, CalendarCheck, HelpCircle, ChevronDown, ChevronUp, Grid3X3 } from 'lucide-react';

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
  const [initialTopics, setInitialTopics] = useState([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFixedActions, setShowFixedActions] = useState(false);
  const [expandedChips, setExpandedChips] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const prevMsgCountRef = useRef(0);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const isFirstInteraction = userMessageCount === 0;

  // Generate initial topics once on mount
  useEffect(() => {
    if (!tenantId) return;
    generateInitialTopics();
  }, [tenantId]);

  // Generate follow-up suggestions after conversation progresses
  useEffect(() => {
    if (!tenantId || isFirstInteraction) return;
    // Only regenerate when message count actually changes
    if (messages.length !== prevMsgCountRef.current) {
      prevMsgCountRef.current = messages.length;
      generateFollowUps();
    }
  }, [messages.length]);

  const generateInitialTopics = async () => {
    setLoading(true);
    try {
      const knowledgeRes = await publicApi({ action: 'getKnowledge', tenant_id: tenantId });
      const knowledge = knowledgeRes.entries || [];
      if (knowledge.length === 0) {
        setInitialTopics(['מה אתם מציעים?', 'כמה זה עולה?', 'איפה אתם נמצאים?', 'ספרו לי עליכם', 'יש מבצעים?']);
        setLoading(false);
        return;
      }
      const knowledgeSummary = knowledge.map(k => `- ${k.title} (${k.category}): ${k.content?.slice(0, 100) || ''}`).join('\n');
      const llmRes = await publicApi({
        action: 'invokeLLM',
        prompt: `You are generating "popular topic" buttons for a customer chat. These appear BEFORE the customer asks anything.

Business knowledge base:
${knowledgeSummary}

Generate EXACTLY 6 short topic suggestions (2-5 words each) in Hebrew.
These should be the most relevant and interesting topics a customer would want to ask about THIS SPECIFIC business, based on its knowledge base.
Make them sound like natural questions or topics, not formal.

Return exactly 6 suggestions.`,
        response_json_schema: {
          type: "object",
          properties: { suggestions: { type: "array", items: { type: "string" } } },
          required: ["suggestions"]
        }
      });
      setInitialTopics(llmRes.result?.suggestions?.slice(0, 6) || []);
    } catch (err) {
      console.error('Error generating initial topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUps = async () => {
    setLoading(true);
    try {
      const knowledgeRes = await publicApi({ action: 'getKnowledge', tenant_id: tenantId });
      const knowledge = knowledgeRes.entries || [];
      const knowledgeSummary = knowledge.map(k => `- ${k.title} (${k.category}): ${k.content?.slice(0, 80) || ''}`).join('\n');
      const fullConversation = messages.map(m => `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`).join('\n');
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';

      const llmRes = await publicApi({
        action: 'invokeLLM',
        prompt: `You are generating suggestion chips for a customer chat interface in Hebrew.

The business has knowledge about these topics:
${knowledgeSummary}

Full conversation so far:
${fullConversation}

Last assistant message: "${lastAssistantMsg}"

Rules:
1. Generate EXACTLY 10 suggestions.
2. Suggestions should sound like things a REAL CUSTOMER would naturally say.
3. GOOD examples: "אני רוצה לקבוע תור", "כמה עולה טיפול?", "איזה רופא מומלץ?"
4. BAD examples: "מהם זמני ההמתנה?", "למה כדאי לבחור בכם?" — these sound robotic.
5. The first 4-5 should be ACTIONABLE follow-ups directly related to what was just discussed.
6. The next 3-4 should explore other relevant topics.
7. The last 1-2 should be action-oriented: booking, pricing, contact info.
8. Each suggestion should be 3-7 words in natural spoken Hebrew.
9. Never repeat something the customer already asked.

Return exactly 10 suggestions.`,
        response_json_schema: {
          type: "object",
          properties: { suggestions: { type: "array", items: { type: "string" } } },
          required: ["suggestions"]
        }
      });
      setFollowUpSuggestions(llmRes.result?.suggestions?.slice(0, 10) || []);
    } catch (err) {
      console.error('Error generating follow-ups:', err);
      setFollowUpSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Details chip logic
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
  const detailsKeywords = [
    'שמך', 'שם מלא', 'מספר טלפון', 'טלפון שלך', 'פרטים', 'פרטי התקשרות',
    'ליצור קשר', 'להשאיר פרטים', 'לחזור אליך', 'פרטי קשר', 'לקבוע תור',
    'נחזור אליך', 'ניצור קשר', 'מוזמן להשאיר', 'מוזמנת להשאיר',
  ];
  const isAskingForDetails = detailsKeywords.some(kw => lastAssistantMessage.includes(kw));
  const showDetailsChip = !detailsSubmitted && !isFirstInteraction && (isAskingForDetails || userMessageCount >= 2);

  const chipBaseStyle = {
    borderColor: `${themeColor}30`,
    color: themeColor === '#ffffff' || themeColor === '#fff' ? '#334155' : themeColor,
  };

  const handleChipClick = (text) => {
    onSelect(text);
    setShowFixedActions(false);
    setFollowUpSuggestions([]);
  };

  // ==========================================
  // BEFORE first user message: show initial view
  // ==========================================
  if (isFirstInteraction) {
    return (
      <div className="py-2 space-y-3">
        {/* Fixed quick actions */}
        <div className="flex flex-wrap justify-center gap-2">
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

        {/* Popular topics */}
        <div>
          <p className="text-center text-xs text-slate-400 mb-2">נושאים פופולריים</p>
          {loading ? (
            <div className="flex justify-center py-1">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {initialTopics.map((topic, i) => (
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
                  {topic}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // AFTER first user message: show follow-up suggestions
  // ==========================================
  const midpoint = Math.ceil(followUpSuggestions.length / 2);
  const row1 = followUpSuggestions.slice(0, midpoint);
  const row2 = followUpSuggestions.slice(midpoint);

  return (
    <div className="py-2 space-y-2">
      {/* Toggle button for fixed actions */}
      <div className="flex items-center justify-center gap-2">
        {showDetailsChip && (
          <button
            onClick={() => onOpenDetailsModal?.()}
            disabled={disabled}
            className="text-sm px-4 py-1.5 rounded-full border-2 transition-all whitespace-nowrap disabled:opacity-50 font-medium"
            style={{ borderColor: themeColor, color: 'white', backgroundColor: themeColor }}
          >
            📋 השאר פרטים
          </button>
        )}
        <button
          onClick={() => setShowFixedActions(!showFixedActions)}
          className="text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 hover:shadow-sm"
          style={{ borderColor: `${themeColor}30`, color: `${themeColor}90` }}
        >
          <Grid3X3 className="w-3 h-3" />
          פעולות מהירות
          {showFixedActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {/* Toggle to hide/show entire suggestions panel */}
        <button
          onClick={() => setPanelVisible(!panelVisible)}
          className="text-[10px] px-2 py-1 rounded-full flex items-center gap-0.5 transition-all"
          style={{ color: `${themeColor}90` }}
        >
          {panelVisible ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {panelVisible ? 'סגור הצעות' : 'פתח הצעות'}
        </button>
      </div>

      {/* Collapsible fixed actions */}
      {panelVisible && showFixedActions && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex flex-wrap justify-center gap-2 overflow-hidden"
        >
          {FIXED_ACTIONS.map((action, i) => (
            <button
              key={`action-${i}`}
              onClick={() => handleChipClick(action.label)}
              disabled={disabled}
              className="text-sm px-3.5 py-1.5 rounded-full border transition-all whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5 hover:shadow-md bg-white/80 backdrop-blur-sm"
              style={chipBaseStyle}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Follow-up suggestion chips */}
      {!panelVisible ? null : loading ? (
        <div className="flex justify-center py-1">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        </div>
      ) : followUpSuggestions.length > 0 && (
        <div>
          {/* Collapse/Expand toggle */}
          <div className="flex justify-center mb-1.5">
            <button
              onClick={() => setExpandedChips(!expandedChips)}
              className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-all"
              style={{ color: `${themeColor}90` }}
            >
              {expandedChips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expandedChips ? 'צמצם הצעות' : 'הרחב הצעות'}
            </button>
          </div>
          <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${themeColor}40 transparent` }}>
            <div className="flex gap-2 w-max">
              {row1.map((text, i) => (
                <button
                  key={`s1-${i}`}
                  onClick={() => handleChipClick(text)}
                  disabled={disabled}
                  className="text-sm px-3 py-1.5 rounded-full border-[1.5px] transition-all whitespace-nowrap disabled:opacity-50 flex-shrink-0 shadow-sm hover:shadow-md"
                  style={{ borderColor: `${themeColor}50`, color: themeColor, backgroundColor: `${themeColor}10` }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = `${themeColor}70`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}10`; e.currentTarget.style.borderColor = `${themeColor}50`; }}
                >
                  {text}
                </button>
              ))}
            </div>
            {expandedChips && row2.length > 0 && (
              <div className="flex gap-2 w-max mt-1.5">
                {row2.map((text, i) => (
                  <button
                    key={`s2-${i}`}
                    onClick={() => handleChipClick(text)}
                    disabled={disabled}
                    className="text-sm px-3 py-1.5 rounded-full border-[1.5px] transition-all whitespace-nowrap disabled:opacity-50 flex-shrink-0 shadow-sm hover:shadow-md"
                    style={{ borderColor: `${themeColor}50`, color: themeColor, backgroundColor: `${themeColor}10` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}20`; e.currentTarget.style.borderColor = `${themeColor}70`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${themeColor}10`; e.currentTarget.style.borderColor = `${themeColor}50`; }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
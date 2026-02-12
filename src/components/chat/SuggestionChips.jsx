import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function SuggestionChips({ tenantId, messages, onSelect, themeColor, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);

  useEffect(() => {
    if (!tenantId) return;
    generateSuggestions();
  }, [tenantId, messages.length]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const knowledge = await base44.entities.KnowledgeEntry.filter({ tenant_id: tenantId, is_active: true });
      
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

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are generating suggestion chips for a customer chat interface in Hebrew.

The business has knowledge about these topics:
${knowledgeSummary}

Full conversation so far:
${fullConversation || 'No messages yet - this is the start of the conversation.'}

Last assistant message: "${lastAssistantMsg}"

Rules:
1. Generate EXACTLY 10 suggestions.
2. ONLY suggest things the business has knowledge about.
3. Each suggestion should be 2-6 words in Hebrew.
4. Make them sound natural, like a real customer would say or ask.
5. If the conversation just started, suggest broad topics covering different areas of the business knowledge.
6. If the conversation is ongoing:
   - The first 3-4 should be direct follow-ups to what was just discussed (proactive, flowing naturally from the last assistant message).
   - The next 3-4 should explore related but different topics from the knowledge base.
   - The last 2-3 should be general actions like asking for pricing, contact info, scheduling, etc.
7. Never repeat something the customer already asked.
8. Make each suggestion distinct - no duplicates or near-duplicates.
9. Order them by relevance to the current conversation flow.

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

  if (suggestions.length === 0) return null;

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

  return (
    <div className="space-y-1.5 py-2">
      <div ref={row1Ref} onScroll={handleScroll} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {row1.map((text, i) => <ChipButton key={`r1-${i}`} text={text} index={i} />)}
      </div>
      <div ref={row2Ref} onScroll={handleScroll} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {row2.map((text, i) => <ChipButton key={`r2-${i}`} text={text} index={i + midpoint} />)}
      </div>
    </div>
  );
}
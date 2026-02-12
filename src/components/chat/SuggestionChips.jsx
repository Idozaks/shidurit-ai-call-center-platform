import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function SuggestionChips({ tenantId, messages, onSelect, themeColor, disabled }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    generateSuggestions();
  }, [tenantId, messages.length]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      // Fetch knowledge entries for context
      const knowledge = await base44.entities.KnowledgeEntry.filter({ tenant_id: tenantId, is_active: true });
      
      if (knowledge.length === 0) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      // Build knowledge summary (titles + categories only to keep prompt small)
      const knowledgeSummary = knowledge.map(k => `- ${k.title} (${k.category})`).join('\n');

      const recentMessages = messages.slice(-4).map(m => 
        `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are generating 3 short suggestion chips for a customer chat interface in Hebrew.

The business has knowledge about ONLY these topics:
${knowledgeSummary}

Recent conversation:
${recentMessages || 'No messages yet - this is the start of the conversation.'}

Rules:
1. ONLY suggest things the business actually has knowledge about based on the topics above.
2. Make suggestions that naturally continue the conversation flow.
3. Each suggestion should be 2-5 words in Hebrew.
4. If conversation just started, suggest broad relevant topics from the knowledge base.
5. If conversation is ongoing, suggest logical follow-up questions based on what was discussed AND what knowledge is available.
6. Never suggest something outside the knowledge topics listed above.
7. Make them sound natural, like a real customer would ask.

Return exactly 3 suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Array of 3 short suggestion texts in Hebrew"
            }
          },
          required: ["suggestions"]
        }
      });

      setSuggestions(result.suggestions?.slice(0, 3) || []);
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

  return (
    <div className="flex flex-wrap gap-2 px-1 py-2 justify-end">
      <AnimatePresence>
        {suggestions.map((text, i) => (
          <motion.button
            key={`${messages.length}-${i}`}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => {
              onSelect(text);
              setSuggestions([]);
            }}
            disabled={disabled}
            className="text-sm px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap disabled:opacity-50"
            style={{ 
              borderColor: `${themeColor}40`,
              color: themeColor,
              backgroundColor: `${themeColor}08`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${themeColor}18`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${themeColor}08`;
            }}
          >
            {text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
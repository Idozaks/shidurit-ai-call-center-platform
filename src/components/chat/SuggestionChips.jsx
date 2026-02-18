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
  const [showFixedActions, setShowFixedActions] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const isFirstInteraction = userMessageCount === 0;

  // Details chip logic
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
  const detailsKeywords = [
    'שמך', 'שם מלא', 'מספר טלפון', 'טלפון שלך', 'פרטים', 'פרטי התקשרות',
    'ליצור קשר', 'להשאיר פרטים', 'לחזור אליך', 'פרטי קשר', 'לקבוע תור',
    'נחזור אליך', 'ניצור קשר', 'מוזמן להשאיר', 'מוזמנת להשאיר',
  ];
  const isAskingForDetails = detailsKeywords.some(kw => lastAssistantMessage.includes(kw));
  const showDetailsChip = !detailsSubmitted && !isFirstInteraction && (isAskingForDetails || userMessageCount >= 2);

  const handleChipClick = (text) => {
    onSelect(text);
    setShowFixedActions(false);
  };

  if (isFirstInteraction) {
    return null;
  }

  return (
    <div className="py-1 space-y-1">
      {/* Master drawer toggle */}
      <div className="flex justify-center">
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 transition-all"
          style={{ color: `${themeColor}90` }}
        >
          {drawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {drawerOpen ? 'הסתר הצעות' : 'הצג הצעות'}
        </button>
      </div>

      {drawerOpen && (
        <div className="space-y-2">
          {/* Toggle button for fixed actions */}
          <div className="flex items-center justify-center gap-2">
            {showDetailsChip && (
              <button
                onClick={() => onOpenDetailsModal?.()}
                disabled={disabled}
                className="text-sm px-4 py-1.5 rounded-full border-2 transition-all whitespace-nowrap disabled:opacity-50 font-medium"
                style={{ borderColor: '#0099cc', color: 'white', background: 'linear-gradient(135deg, #0099cc, #0077b3)' }}
              >
                📋 השאר פרטים
              </button>
            )}
            <button
              onClick={() => setShowFixedActions(!showFixedActions)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/50 transition-all flex items-center gap-1 hover:shadow-sm"
              style={{ background: 'rgba(255,255,255,0.5)', color: '#0077b3' }}
            >
              <Grid3X3 className="w-3 h-3" />
              פעולות מהירות
              {showFixedActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Collapsible fixed actions */}
          {showFixedActions && (
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
                  className="text-sm px-3.5 py-1.5 rounded-full border border-white/50 transition-all whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5 hover:shadow-lg shadow-sm"
                  style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)', color: '#0077b3' }}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}


        </div>
      )}
    </div>
  );
}
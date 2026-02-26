import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Info, CalendarCheck, ChevronDown, ChevronUp, Grid3X3, UserPlus } from 'lucide-react';

export const INITIAL_SUGGESTIONS = [
  { label: 'מידע על שירותים', icon: Info },
  { label: 'קביעת תור', icon: CalendarCheck },
  { label: 'יצירת קשר', icon: Phone },
  { label: 'הצטרפות לפורטל ROFIM', icon: UserPlus },
];

export const PREDEFINED_RESPONSES = {
  'מידע על שירותים': `פורטל בריאות מתקדם לזימון תורים מאפשר לך למצוא ולתאם תורים לרופאים מומחים בצורה מהירה, נוחה ופשוטה. ניתן לחפש רופא לפי הליך רפואי, תחום מומחיות או סוג טיפול.\n\nהמערכת נותנת מענה לחברי קופות החולים, מבוטחי ביטוחים משלימים, וגם ללקוחות פרטיים. הפורטל מאפשר הזמנת תור ראשון זמין לכל הצרכים הרפואיים שלך.`,
};

export default function SuggestionChips({ tenantId, messages, onSelect, themeColor, disabled, onOpenDetailsModal, detailsSubmitted }) {
  const [open, setOpen] = useState(false);

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
    setOpen(false);
  };

  if (isFirstInteraction) {
    return null;
  }

  return (
    <div className="py-1 space-y-1">
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
          onClick={() => setOpen(!open)}
          className="text-xs px-3 py-1.5 rounded-full border border-white/50 transition-all flex items-center gap-1 hover:shadow-sm"
          style={{ background: 'rgba(255,255,255,0.5)', color: '#0077b3' }}
        >
          <Grid3X3 className="w-3 h-3" />
          הצעות
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="flex flex-wrap justify-center gap-2 overflow-hidden"
        >
          {INITIAL_SUGGESTIONS.map((action, i) => (
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
  );
}
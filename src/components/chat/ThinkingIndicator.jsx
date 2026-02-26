import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Brain, Search, MessageSquare, FileText } from "lucide-react";

const STEP_ICONS = {
  analyzing: Brain,
  searching: Search,
  generating_synonyms: FileText,
  building_response: MessageSquare,
  default: Sparkles,
};

export default function ThinkingIndicator({ status }) {
  if (!status) return null;

  const IconComponent = STEP_ICONS[status.step] || STEP_ICONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      <Avatar className="w-10 h-10">
        <AvatarFallback style={{ background: 'linear-gradient(135deg, #0099cc, #0077b3)', color: 'white' }}>
          <Sparkles className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
      <div
        className="rounded-2xl rounded-tr-sm px-4 py-3 shadow-md border border-white/50"
        style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <IconComponent className="w-4 h-4 text-sky-600" />
          </motion.div>
          <AnimatePresence mode="wait">
            <motion.span
              key={status.text}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-slate-600 font-medium"
            >
              {status.text}
            </motion.span>
          </AnimatePresence>
          <div className="flex gap-1 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
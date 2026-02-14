import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Phone, Calendar, MapPin, Stethoscope } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function DetailsInputModal({ open, onClose, onSubmit, themeColor }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parts = [];
    if (name.trim()) parts.push(`שמי ${name.trim()}`);
    if (phone.trim()) parts.push(`מספר הטלפון שלי ${phone.trim()}`);
    if (preferredTime.trim()) parts.push(`שעה נוחה: ${preferredTime.trim()}`);
    if (city.trim()) parts.push(`עיר: ${city.trim()}`);
    if (specialty.trim()) parts.push(`התמחות רפואית: ${specialty.trim()}`);
    if (parts.length > 0) {
      onSubmit(parts.join(', '));
      setName('');
      setPhone('');
      setPreferredTime('');
      setCity('');
      setSpecialty('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            dir="rtl"
          >
            <div 
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: themeColor }}
            >
              <span className="text-white font-medium text-sm">השאר פרטים</span>
              <button onClick={onClose} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3" /> שם מלא
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> מספר טלפון
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="050-0000000"
                  type="tel"
                  inputMode="tel"
                  className="h-10"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> מועד נוח לתור (אופציונלי)
                </Label>
                <Input
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  placeholder="למשל: יום ראשון בבוקר"
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-white gap-2"
                style={{ backgroundColor: themeColor }}
                disabled={!name.trim() && !phone.trim()}
              >
                <Send className="w-4 h-4" />
                שלח פרטים
              </Button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
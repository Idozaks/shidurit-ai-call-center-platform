import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Rocket, Pencil, Building2, Bot, BookOpen, Palette } from "lucide-react";

export default function ConfirmationModal({ open, onOpenChange, config, onConfirm, onEdit, isCreating }) {
  if (!config) return null;

  const { tenant_config, knowledge_base } = config;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-600" />
            הסוכן שלך מוכן להרצה! 🚀
          </DialogTitle>
          <DialogDescription>
            הנה סיכום של מה שהאדריכל בנה עבורך
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">שם העסק</p>
              <p className="font-medium">{tenant_config?.company_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <Bot className="w-5 h-5 text-violet-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">שם הבוט</p>
              <p className="font-medium">{tenant_config?.ai_persona_name || 'נועה'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <Palette className="w-5 h-5 text-pink-600 shrink-0" />
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-500">צבע מותג</p>
              <div className="w-5 h-5 rounded" style={{ backgroundColor: tenant_config?.theme_color || '#6366f1' }} />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <BookOpen className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">ידע שהוטמע</p>
              <p className="font-medium">{knowledge_base?.length || 0} פריטים</p>
            </div>
          </div>

          {tenant_config?.welcome_message && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <p className="text-xs text-indigo-500 mb-1">הודעת פתיחה</p>
              <p className="text-sm text-indigo-800">{tenant_config.welcome_message}</p>
            </div>
          )}
        </div>

        <Separator className="my-2" />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onEdit}
            disabled={isCreating}
          >
            <Pencil className="w-4 h-4" />
            בצע שינויים
          </Button>
          <Button
            className="flex-1 gap-2 bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            onClick={onConfirm}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <span className="animate-spin">⏳</span>
                מקים...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                הקם את הבוט שלי!
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
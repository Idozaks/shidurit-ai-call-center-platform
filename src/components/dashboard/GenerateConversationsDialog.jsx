import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const CONVERSATION_SCENARIOS = [
  "לקוח מתעניין בשירות בסיסי ושואל על מחירים",
  "לקוח כועס על זמן המתנה ארוך ומאיים לעזוב",
  "לקוח מתלבט בין שני שירותים ומבקש המלצה",
  "לקוח חוזר שמרוצה ורוצה להרחיב שירות",
  "לקוח שואל שאלות טכניות מורכבות",
  "לקוח שמתעניין אבל אין לו תקציב כרגע",
  "לקוח שמשווה מחירים מול מתחרה",
  "לקוח חדש שלא מבין מה השירות בכלל",
  "לקוח שצריך פתרון דחוף עכשיו",
  "לקוח שמתלונן על חוויה קודמת",
  "לקוח שרוצה הנחה או מבצע מיוחד",
  "לקוח שמפנה חבר ושואל על תוכנית הפניות",
  "לקוח שמבקש לבטל שירות קיים",
  "לקוח שמתעניין בשירות פרימיום יקר",
  "לקוח עם מגבלה מיוחדת שצריך התאמה אישית"
];

const HEBREW_NAMES = [
  "יוסי כהן", "מיכל לוי", "אבי גולדשטיין", "רונית בן-דוד", "עידן פרץ",
  "שירה אברהם", "נועם דביר", "תמר רוזנברג", "אלון שמש", "דנה חיימוביץ",
  "גיא פרידמן", "יעל מזרחי", "אורי ברק", "ליאת סגל", "עמית שרון",
  "מורן אלקיים", "רותם הלוי", "נדב כץ", "אסתר בלום", "אייל מור"
];

export default function GenerateConversationsDialog({ tenantId, tenant }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const queryClient = useQueryClient();

  const generate = async () => {
    const num = Math.max(1, Math.min(50, count));
    setGenerating(true);
    setTotal(num);
    setProgress(0);

    const businessContext = `
עסק: ${tenant?.company_name || 'עסק'}
בוט: ${tenant?.ai_persona_name || 'נועה'}
הוראות בוט: ${tenant?.system_prompt || ''}
הודעת פתיחה: ${tenant?.welcome_message || 'שלום!'}
    `.trim();

    for (let i = 0; i < num; i++) {
      const scenario = CONVERSATION_SCENARIOS[i % CONVERSATION_SCENARIOS.length];
      const customerName = HEBREW_NAMES[Math.floor(Math.random() * HEBREW_NAMES.length)];
      const phone = `05${Math.floor(Math.random() * 10)}${Math.floor(1000000 + Math.random() * 9000000)}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `צור שיחת צ'אט סימולטיבית בין לקוח לבוט AI של עסק.

${businessContext}

תרחיש: ${scenario}
שם הלקוח: ${customerName}

צור שיחה מציאותית בעברית של 6-14 הודעות (מתחלפות בין לקוח לבוט).
השיחה צריכה להיות מגוונת, מציאותית, עם רגש ומורכבות.
הבוט צריך להגיב לפי ההוראות של העסק.
כלול גם סיבת פנייה קצרה.`,
        response_json_schema: {
          type: "object",
          properties: {
            inquiry_reason: { type: "string", description: "סיבת פנייה קצרה" },
            messages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant"] },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Create ChatSession
      const session = await base44.entities.ChatSession.create({
        tenant_id: tenantId,
        customer_name: customerName,
        customer_phone: phone,
        inquiry_reason: result.inquiry_reason || scenario,
        mode: 'text',
        status: Math.random() > 0.3 ? 'closed' : 'active'
      });

      // Create ChatMessages
      for (const msg of (result.messages || [])) {
        await base44.entities.ChatMessage.create({
          session_id: session.id,
          role: msg.role,
          content: msg.content
        });
      }

      setProgress(i + 1);
    }

    queryClient.invalidateQueries({ queryKey: ['sessions', tenantId] });
    toast.success(`נוצרו ${num} שיחות סינתטיות בהצלחה!`);
    setGenerating(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wand2 className="w-4 h-4 text-violet-600" />
          ייצור שיחות
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ייצור שיחות סינתטיות</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>כמות שיחות לייצור</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={generating}
            />
            <p className="text-xs text-slate-500">מקסימום 50 שיחות בפעם אחת</p>
          </div>
          
          {generating && (
            <div className="space-y-2">
              <Progress value={(progress / total) * 100} />
              <p className="text-sm text-center text-slate-500">
                מייצר שיחה {progress} מתוך {total}...
              </p>
            </div>
          )}

          <Button
            onClick={generate}
            disabled={generating || count < 1}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> מייצר...</>
            ) : (
              <><Wand2 className="w-4 h-4" /> ייצר {count} שיחות</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
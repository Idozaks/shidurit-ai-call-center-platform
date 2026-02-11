import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, User, Phone } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';

export default function ConvertToLeadsButton({ tenantId, sessions = [], existingLeads = [] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const queryClient = useQueryClient();

  const sessionHasLead = (session) => {
    return existingLeads.some(l =>
      l.customer_phone === session.customer_phone &&
      l.tenant_id === session.tenant_id
    );
  };

  const eligibleSessions = sessions.filter(s => !sessionHasLead(s));

  const toggleSession = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === eligibleSessions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligibleSessions.map(s => s.id)));
    }
  };

  const convertSelected = async () => {
    const sessionsToConvert = eligibleSessions.filter(s => selected.has(s.id));
    if (sessionsToConvert.length === 0) return;

    setConverting(true);
    setTotal(sessionsToConvert.length);
    setProgress(0);

    for (let i = 0; i < sessionsToConvert.length; i++) {
      const session = sessionsToConvert[i];
      const msgs = await base44.entities.ChatMessage.filter({ session_id: session.id }, 'created_date');

      const transcript = msgs.length > 0
        ? msgs.map(m => `${m.role === 'user' ? 'לקוח' : 'בוט'}: ${m.content}`).join('\n')
        : `לקוח: ${session.inquiry_reason || 'פנייה כללית'}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `נתח את השיחה הבאה והפק ממנה ליד מפורט עבור צוות המכירות.

שיחה:
${transcript}

שם הלקוח: ${session.customer_name || 'לא ידוע'}
טלפון: ${session.customer_phone || 'לא ידוע'}
סיבת פנייה: ${session.inquiry_reason || 'לא ידוע'}

הפק ניתוח מקיף:
- סיכום ותובנות מפתח
- סנטימנט ורגש הלקוח
- ציון כוונת רכישה (0-100)
- רמת דחיפות
- רמת קושי של השיחה
- טיפים לנציג שידורית
- פעולה מומלצת הבאה
- האם הוזכר מתחרה
- עובדות שחולצו מהשיחה`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string", description: "סיכום מפורט של השיחה" },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            intent_score: { type: "number", description: "ציון כוונת רכישה 0-100" },
            urgency_level: { type: "string", enum: ["low", "medium", "high"] },
            priority: { type: "string", enum: ["low", "normal", "high"] },
            ai_suggested_action: { type: "string", description: "פעולה מומלצת הבאה" },
            competitor_detected: { type: "boolean", description: "האם הוזכר מתחרה" },
            difficulty_level: { type: "string", enum: ["easy", "medium", "hard"], description: "רמת קושי השיחה" },
            worker_tips: { type: "string", description: "טיפים קצרים לנציג שידורית לגבי הלקוח" },
            key_takeaways: { type: "array", items: { type: "string" }, description: "תובנות מפתח" },
            customer_temperature: { type: "string", enum: ["cold", "warm", "hot"], description: "חום הלקוח" },
            objections: { type: "array", items: { type: "string" }, description: "התנגדויות שהלקוח העלה" },
            facts: { type: "object", description: "עובדות שחולצו מהשיחה" }
          }
        }
      });

      await base44.entities.Lead.create({
        tenant_id: session.tenant_id,
        customer_name: session.customer_name || 'לא ידוע',
        customer_phone: session.customer_phone || '',
        inquiry_reason: session.inquiry_reason || '',
        status: 'new',
        priority: analysis.priority || 'normal',
        sentiment: analysis.sentiment || 'neutral',
        summary: analysis.summary || '',
        ai_suggested_action: analysis.ai_suggested_action || '',
        intent_score: analysis.intent_score || 50,
        urgency_level: analysis.urgency_level || 'low',
        competitor_detected: analysis.competitor_detected || false,
        notes: [
          analysis.worker_tips ? `💡 טיפים לנציג: ${analysis.worker_tips}` : '',
          analysis.difficulty_level ? `📊 רמת קושי: ${analysis.difficulty_level}` : '',
          analysis.customer_temperature ? `🌡️ חום לקוח: ${analysis.customer_temperature}` : '',
          (analysis.key_takeaways || []).length > 0 ? `🔑 תובנות: ${analysis.key_takeaways.join(', ')}` : '',
          (analysis.objections || []).length > 0 ? `⚠️ התנגדויות: ${analysis.objections.join(', ')}` : '',
        ].filter(Boolean).join('\n'),
        facts_json: {
          ...analysis.facts,
          difficulty_level: analysis.difficulty_level,
          customer_temperature: analysis.customer_temperature,
          key_takeaways: analysis.key_takeaways,
          objections: analysis.objections,
          worker_tips: analysis.worker_tips
        }
      });

      setProgress(i + 1);
    }

    queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast.success(`${sessionsToConvert.length} שיחות הומרו ללידים בהצלחה!`);
    setConverting(false);
    setSelected(new Set());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={eligibleSessions.length === 0}>
          <Sparkles className="w-4 h-4 text-amber-600" />
          המר שיחות ללידים
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>בחר שיחות להמרה ללידים</DialogTitle>
        </DialogHeader>

        {converting ? (
          <div className="py-8 space-y-4">
            <Progress value={(progress / total) * 100} />
            <p className="text-sm text-center text-slate-500">
              מנתח ומייצר ליד {progress} מתוך {total}...
            </p>
            <p className="text-xs text-center text-slate-400">
              AI מחלץ סנטימנט, כוונת רכישה, טיפים לנציג ועוד...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.size === eligibleSessions.length && eligibleSessions.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">בחר הכל ({eligibleSessions.length})</span>
              </div>
              <Badge variant="secondary">{selected.size} נבחרו</Badge>
            </div>
            <ScrollArea className="h-[350px]">
              <div className="space-y-2 py-2">
                {eligibleSessions.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">כל השיחות כבר הומרו ללידים</p>
                ) : (
                  eligibleSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selected.has(session.id)
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}
                      onClick={() => toggleSession(session.id)}
                    >
                      <Checkbox
                        checked={selected.has(session.id)}
                        onCheckedChange={() => toggleSession(session.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-sm">{session.customer_name || 'אורח'}</span>
                        </div>
                        {session.customer_phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3" />
                            {session.customer_phone}
                          </div>
                        )}
                        {session.inquiry_reason && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{session.inquiry_reason}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {session.created_date ? format(new Date(session.created_date), 'dd/MM') : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {!converting && (
          <DialogFooter>
            <Button
              onClick={convertSelected}
              disabled={selected.size === 0}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <Sparkles className="w-4 h-4" />
              המר {selected.size} שיחות ללידים
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
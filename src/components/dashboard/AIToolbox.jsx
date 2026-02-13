import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sparkles, Zap, MessageSquare, Swords, ShieldCheck, 
  TrendingDown, BarChart3, Loader2, ArrowLeft, HelpCircle
} from "lucide-react";
import { toast } from "sonner";

const TOOLS = [
  {
    id: 'lead_scorer',
    name: 'ניקוד לידים',
    nameEn: 'Lead Scorer',
    description: 'ניתוח אוטומטי של כוונת רכישה, דחיפות ומידע עסקי מתוך שיחות',
    icon: Sparkles,
    speed: 'מהיר',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    action: 'select_lead'
  },
  {
    id: 'smart_followup',
    name: 'מעקב חכם',
    nameEn: 'Smart Follow-up',
    description: 'יצירת הודעת וואטסאפ מותאמת אישית על בסיס ההיסטוריה של הליד',
    icon: MessageSquare,
    speed: 'מהיר',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    action: 'select_lead'
  },
  {
    id: 'closer_mode',
    name: 'מצב סגירה',
    nameEn: 'Closer Mode',
    description: 'הפעלת מצב אגרסיבי שדוחף לקביעת פגישה בכל שיחה',
    icon: Zap,
    speed: 'מהיר',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    action: 'toggle'
  },
  {
    id: 'competitor_clash',
    name: 'ניתוח מתחרים',
    nameEn: 'Competitor Clash',
    description: 'זיהוי אזכורי מתחרים ויצירת נקודות מכירה ייחודיות',
    icon: Swords,
    speed: 'מהיר',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    action: 'select_lead'
  },
  {
    id: 'bot_health',
    name: 'בריאות הבוט',
    nameEn: 'Bot Health',
    description: 'יצירת תרחישי בדיקה ("קונה סמוי") לבדיקת איכות הבוט',
    icon: ShieldCheck,
    speed: 'עמוק',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    action: 'run'
  },
  {
    id: 'revenue_leak',
    name: 'דליפות הכנסה',
    nameEn: 'Revenue Leak',
    description: 'ניתוח עמוק של שיחות שנפלו וזיהוי הזדמנויות שפוספסו',
    icon: TrendingDown,
    speed: 'עמוק',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    action: 'run'
  },
  {
    id: 'knowledge_gaps',
    name: 'פערי ידע',
    nameEn: 'Knowledge Gaps',
    description: 'זיהוי שאלות שהבוט לא ידע לענות עליהן — חוסרים בבסיס הידע',
    icon: HelpCircle,
    speed: 'עמוק',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    action: 'run'
  }
];

export default function AIToolbox({ tenantId, tenant, leads = [], sessions = [] }) {
  const [runningTool, setRunningTool] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [toolResult, setToolResult] = useState(null);
  const queryClient = useQueryClient();

  const runTool = async (tool, leadId) => {
    setRunningTool(tool.id);
    setToolResult(null);

    const lead = leadId ? leads.find(l => l.id === leadId) : null;

    const prompts = {
      lead_scorer: `נתח את הליד הבא ותן ציון כוונת רכישה (0-100), רמת דחיפות, וסנטימנט.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}`,
      smart_followup: `צור הודעת וואטסאפ מעקב מותאמת אישית ללקוח.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום שיחה: ${lead?.summary || 'אין'}\nסטטוס: ${lead?.status}\nעסק: ${tenant?.company_name}`,
      closer_mode: '',
      competitor_clash: `נתח את השיחה עם הליד וזהה אזכורי מתחרים. צור נקודות מכירה ייחודיות לעסק.\n\nשם לקוח: ${lead?.customer_name}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}\nעסק: ${tenant?.company_name}`,
      bot_health: `צור 3 תרחישי בדיקה ("קונה סמוי") לבוט AI של העסק "${tenant?.company_name}". כלול שאלות קשות, מצבי קצה, ובדיקות לאיכות השירות. הבוט שם ${tenant?.ai_persona_name || 'נועה'}.`,
      revenue_leak: `נתח את השיחות הבאות וזהה הזדמנויות שפוספסו ודליפות הכנסה.\n\nשיחות סגורות: ${sessions.filter(s => s.status === 'closed').length}\nלידים שאבדו: ${leads.filter(l => l.status === 'lost').length}\nסה"כ לידים: ${leads.length}\nלידים חמים: ${leads.filter(l => l.intent_score >= 70).length}`,
      knowledge_gaps: `אתה מנתח שיחות של בוט AI שירות לקוחות של העסק "${tenant?.company_name}". נתח את כל השיחות וזהה פערי ידע — שאלות שלקוחות שאלו אך הבוט לא ידע לתת להן מענה מדויק, התחמק, נתן תשובה כללית מדי, או הפנה ללא צורך לנציג אנושי.\n\nסה"כ שיחות: ${sessions.length}\nסה"כ לידים: ${leads.length}\nסיכומי לידים:\n${leads.slice(0, 15).map(l => `- ${l.customer_name}: ${l.inquiry_reason || 'לא צוין'} | סיכום: ${l.summary || 'אין'}`).join('\n')}\n\nזהה את הנושאים העיקריים שהבוט לא ידע לענות עליהם, תן דוגמאות ספציפיות, והמלץ איזה ידע צריך להוסיף לבסיס הידע.`
    };

    if (tool.id === 'closer_mode') {
      await base44.entities.Tenant.update(tenantId, { closer_mode_enabled: !tenant?.closer_mode_enabled });
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      toast.success(tenant?.closer_mode_enabled ? 'מצב סגירה כובה' : 'מצב סגירה הופעל');
      setRunningTool(null);
      return;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompts[tool.id],
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          action_items: { type: "array", items: { type: "string" } }
        }
      }
    });

    if (tool.id === 'lead_scorer' && lead) {
      const scoreResult = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[tool.id],
        response_json_schema: {
          type: "object",
          properties: {
            intent_score: { type: "number" },
            urgency_level: { type: "string", enum: ["low", "medium", "high"] },
            sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
            summary: { type: "string" }
          }
        }
      });
      await base44.entities.Lead.update(lead.id, {
        intent_score: scoreResult.intent_score,
        urgency_level: scoreResult.urgency_level,
        sentiment: scoreResult.sentiment
      });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }

    setToolResult(result);
    setRunningTool(null);
  };

  const handleToolClick = (tool) => {
    if (tool.action === 'select_lead') {
      setSelectedTool(tool);
      setSelectedLeadId('');
      setToolResult(null);
    } else if (tool.action === 'toggle') {
      runTool(tool);
    } else {
      setSelectedTool(tool);
      setToolResult(null);
      runTool(tool);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          ארגז כלים AI
        </h2>
        <p className="text-slate-500 text-sm mt-1">כלי אינטליגנציה מבוססי AI</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Card key={tool.id} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <Badge variant="outline" className="text-xs">
                  {tool.speed}
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{tool.name}</span>
                  <tool.icon className={`w-5 h-5 ${tool.color}`} />
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-1 text-right">{tool.nameEn}</p>
              <p className="text-sm text-slate-600 mb-4 text-right">{tool.description}</p>
              
              {tool.id === 'closer_mode' ? (
                <Button
                  variant={tenant?.closer_mode_enabled ? "destructive" : "outline"}
                  className="w-full"
                  disabled={runningTool === tool.id}
                  onClick={() => handleToolClick(tool)}
                >
                  {runningTool === tool.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    tenant?.closer_mode_enabled ? 'כבה מצב סגירה' : 'הפעל מצב סגירה'
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  disabled={runningTool === tool.id}
                  onClick={() => handleToolClick(tool)}
                >
                  {runningTool === tool.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : tool.action === 'select_lead' ? (
                    <>בחר ליד והפעל <ArrowLeft className="w-4 h-4" /></>
                  ) : (
                    'הפעל ניתוח'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ROI Dashboard link */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Button variant="outline" className="gap-2" onClick={() => {}}>
              <BarChart3 className="w-4 h-4" />
              פתח דשבורד
            </Button>
            <div className="text-right">
              <h3 className="font-bold flex items-center justify-end gap-2">
                ביצועים וערך עסקי
                <BarChart3 className="w-5 h-5 text-green-500" />
              </h3>
              <p className="text-sm text-slate-500">דשבורד ROI מלא: שעות שנחסכו, לידים חמים, משפך המרה ותובנות AI</p>
              <Badge variant="outline" className="mt-1 text-xs">עמוק</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead selection dialog */}
      <Dialog open={!!selectedTool && selectedTool.action === 'select_lead'} onOpenChange={(open) => { if (!open) { setSelectedTool(null); setToolResult(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTool && <selectedTool.icon className={`w-5 h-5 ${selectedTool?.color}`} />}
              {selectedTool?.name}
            </DialogTitle>
          </DialogHeader>

          {!toolResult ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">בחר ליד להפעלת הכלי:</p>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר ליד..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.customer_name} - {lead.inquiry_reason || 'פנייה כללית'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                className="w-full" 
                disabled={!selectedLeadId || !!runningTool}
                onClick={() => runTool(selectedTool, selectedLeadId)}
              >
                {runningTool ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {runningTool ? 'מנתח...' : 'הפעל'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold">{toolResult.title}</h3>
              <p className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">{toolResult.content}</p>
              {toolResult.action_items?.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">פעולות מומלצות:</p>
                  <ul className="space-y-1">
                    {toolResult.action_items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => { setToolResult(null); setSelectedLeadId(''); }}>
                הפעל שוב
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deep analysis result dialog */}
      <Dialog open={!!selectedTool && selectedTool.action === 'run' && !!toolResult} onOpenChange={(open) => { if (!open) { setSelectedTool(null); setToolResult(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTool && <selectedTool.icon className={`w-5 h-5 ${selectedTool?.color}`} />}
              {selectedTool?.name}
            </DialogTitle>
          </DialogHeader>
          {toolResult && (
            <div className="space-y-4">
              <h3 className="font-bold">{toolResult.title}</h3>
              <p className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">{toolResult.content}</p>
              {toolResult.action_items?.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">פעולות מומלצות:</p>
                  <ul className="space-y-1">
                    {toolResult.action_items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
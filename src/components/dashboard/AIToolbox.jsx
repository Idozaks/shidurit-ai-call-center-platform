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
  TrendingDown, BarChart3, Loader2, ArrowLeft, HelpCircle, 
  Users, Target
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
    name: 'דליפות הכנסה ונטישה',
    nameEn: 'Revenue Leak & Drop-off',
    description: 'ניתוח עמוק של שיחות שנפלו, דפוסי נטישה, וזיהוי הזדמנויות שפוספסו',
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
  },
  {
    id: 'customer_segments',
    name: 'פילוח לקוחות',
    nameEn: 'Customer Segmentation',
    description: 'חלוקת כל הלידים לקבוצות לפי עניין, דחיפות, סנטימנט והתנהגות',
    icon: Users,
    speed: 'עמוק',
    color: 'text-teal-500',
    bgColor: 'bg-teal-50',
    action: 'run'
  },
  {
    id: 'conversion_forecast',
    name: 'תחזית המרה',
    nameEn: 'Conversion Forecast',
    description: 'ניבוי אילו לידים הכי סביר שיומרו ללקוחות משלמים',
    icon: Target,
    speed: 'עמוק',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    action: 'run'
  }
];

export default function AIToolbox({ tenantId, tenant, leads = [], sessions = [], onNavigateToPerformance }) {
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
      lead_scorer: `נתח את הליד הבא ותן ציון כוונת רכישה (0-100), רמת דחיפות, סנטימנט, תיאור קצר של השיחה (2-3 משפטים), והערה מסכמת.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}`,
      smart_followup: `צור הודעת וואטסאפ מעקב מותאמת אישית ללקוח.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום שיחה: ${lead?.summary || 'אין'}\nסטטוס: ${lead?.status}\nעסק: ${tenant?.company_name}`,
      closer_mode: '',
      competitor_clash: `נתח את השיחה עם הליד וזהה אזכורי מתחרים. צור נקודות מכירה ייחודיות לעסק.\n\nשם לקוח: ${lead?.customer_name}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}\nעסק: ${tenant?.company_name}`,
      bot_health: `צור 3 תרחישי בדיקה ("קונה סמוי") לבוט AI של העסק "${tenant?.company_name}". כלול שאלות קשות, מצבי קצה, ובדיקות לאיכות השירות. הבוט שם ${tenant?.ai_persona_name || 'נועה'}.`,
      revenue_leak: `נתח את כל הלידים והשיחות וזהה דליפות הכנסה ודפוסי נטישה.\n\nסטטיסטיקות:\n- סה"כ לידים: ${leads.length}\n- לידים שאבדו: ${leads.filter(l => l.status === 'lost').length}\n- לידים חמים (intent >= 70): ${leads.filter(l => l.intent_score >= 70).length}\n- לידים חדשים ללא מעקב: ${leads.filter(l => l.status === 'new').length}\n- שיחות סגורות: ${sessions.filter(s => s.status === 'closed').length}\n- שיחות פעילות: ${sessions.filter(s => s.status === 'active').length}\n\nפירוט לידים שאבדו:\n${leads.filter(l => l.status === 'lost').slice(0, 10).map(l => `- ${l.customer_name}: ${l.inquiry_reason || 'לא צוין'} | intent: ${l.intent_score || '?'} | סיכום: ${l.summary || 'אין'}`).join('\n')}\n\nפירוט לידים חמים שלא הומרו:\n${leads.filter(l => l.intent_score >= 70 && l.status !== 'converted').slice(0, 10).map(l => `- ${l.customer_name}: ${l.inquiry_reason || 'לא צוין'} | status: ${l.status} | intent: ${l.intent_score}`).join('\n')}\n\nזהה: 1) דפוסי נטישה - באיזה שלב לקוחות נוטשים 2) הזדמנויות שפוספסו 3) לידים חמים שאפשר להציל 4) שיפורים נדרשים בתהליך`,
      knowledge_gaps: `אתה מנתח שיחות של בוט AI שירות לקוחות של העסק "${tenant?.company_name}". נתח את כל השיחות וזהה פערי ידע — שאלות שלקוחות שאלו אך הבוט לא ידע לתת להן מענה מדויק, התחמק, נתן תשובה כללית מדי, או הפנה ללא צורך לנציג אנושי.\n\nסה"כ שיחות: ${sessions.length}\nסה"כ לידים: ${leads.length}\nסיכומי לידים:\n${leads.slice(0, 15).map(l => `- ${l.customer_name}: ${l.inquiry_reason || 'לא צוין'} | סיכום: ${l.summary || 'אין'}`).join('\n')}\n\nזהה את הנושאים העיקריים שהבוט לא ידע לענות עליהם, תן דוגמאות ספציפיות, והמלץ איזה ידע צריך להוסיף לבסיס הידע.`,
      customer_segments: `נתח את כל הלידים של העסק "${tenant?.company_name}" וחלק אותם לקבוצות (סגמנטים) משמעותיות.\n\nסה"כ לידים: ${leads.length}\n\nפירוט לידים:\n${leads.slice(0, 20).map(l => `- ${l.customer_name}: סיבת פנייה: ${l.inquiry_reason || 'לא צוין'} | סנטימנט: ${l.sentiment || '?'} | intent: ${l.intent_score || '?'} | דחיפות: ${l.urgency_level || '?'} | סטטוס: ${l.status} | מתחרה: ${l.competitor_detected ? 'כן' : 'לא'}`).join('\n')}\n\nחלק ל-3-5 סגמנטים ברורים (לפי תחום עניין, התנהגות, דחיפות). לכל סגמנט ציין: שם, מאפיינים, גודל משוער, והמלצת פעולה מותאמת.`,
      conversion_forecast: `נתח את כל הלידים של העסק "${tenant?.company_name}" ונבא מי הכי סביר שיומר ללקוח משלם.\n\nסטטיסטיקות:\n- סה"כ לידים: ${leads.length}\n- הומרו: ${leads.filter(l => l.status === 'converted').length}\n- חדשים: ${leads.filter(l => l.status === 'new').length}\n- נוצר קשר: ${leads.filter(l => l.status === 'contacted').length}\n- אבודים: ${leads.filter(l => l.status === 'lost').length}\n\nלידים פעילים (לא הומרו ולא אבודים):\n${leads.filter(l => l.status !== 'converted' && l.status !== 'lost').slice(0, 15).map(l => `- ${l.customer_name}: intent: ${l.intent_score || '?'} | דחיפות: ${l.urgency_level || '?'} | סנטימנט: ${l.sentiment || '?'} | סיבה: ${l.inquiry_reason || 'לא צוין'} | סטטוס: ${l.status}`).join('\n')}\n\nדרג את הלידים מהסביר ביותר לפחות סביר להמרה, ולכל אחד הסבר למה ומה הפעולה המומלצת.`
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
            conversation_description: { type: "string" },
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
      // Enrich the general result with score details
      result.scoreDetails = scoreResult;
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
            <Button variant="outline" className="gap-2" onClick={() => onNavigateToPerformance?.()}>
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

              {/* Score details for lead_scorer */}
              {toolResult.scoreDetails && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={toolResult.scoreDetails.sentiment === 'positive' ? 'bg-green-100 text-green-700' : toolResult.scoreDetails.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                      {toolResult.scoreDetails.sentiment === 'positive' ? 'חיובי' : toolResult.scoreDetails.sentiment === 'negative' ? 'שלילי' : 'ניטרלי'}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <Badge className={toolResult.scoreDetails.urgency_level === 'high' ? 'bg-red-100 text-red-700' : toolResult.scoreDetails.urgency_level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                        דחיפות: {toolResult.scoreDetails.urgency_level === 'high' ? 'גבוהה' : toolResult.scoreDetails.urgency_level === 'medium' ? 'בינונית' : 'נמוכה'}
                      </Badge>
                      <div className="text-center">
                        <span className="text-2xl font-bold text-indigo-600">{toolResult.scoreDetails.intent_score}</span>
                        <span className="text-xs text-slate-500">/100</span>
                      </div>
                    </div>
                  </div>
                  {toolResult.scoreDetails.conversation_description && (
                    <p className="text-sm text-slate-600">{toolResult.scoreDetails.conversation_description}</p>
                  )}
                </div>
              )}

              <p className="text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">{toolResult.content}</p>
              {toolResult.action_items?.length > 0 && (
                <div>
                  <p className="font-medium text-sm mb-2">פעולות מומלצות:</p>
                  <ul className="space-y-1">
                    {toolResult.action_items.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {typeof item === 'object' ? (item.name || item.description || item.recommendation || JSON.stringify(item)) : item}
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
                        {typeof item === 'object' ? (item.name || item.description || item.recommendation || JSON.stringify(item)) : item}
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
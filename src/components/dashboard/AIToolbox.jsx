import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, Zap, MessageSquare, Swords, ShieldCheck, 
  TrendingDown, BarChart3, Loader2, ArrowLeft, HelpCircle, 
  Users, Target, AlertTriangle, CheckSquare
} from "lucide-react";
import { toast } from "sonner";
import AIResultDisplay from './AIResultDisplay';

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
    action: 'multi_lead',
    allLabel: 'נתח את כל הלידים',
    allDesc: 'ניקוד אוטומטי לכל הלידים',
    selectLabel: 'בחר לידים לניקוד',
    selectDesc: 'בחירה ידנית של לידים ספציפיים'
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
    action: 'multi_lead',
    allLabel: 'נתח את כל הלידים',
    allDesc: 'סריקת כל השיחות לאזכורי מתחרים',
    selectLabel: 'בחר לידים לניתוח',
    selectDesc: 'בחירה ידנית של לידים ספציפיים'
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
  },
  {
    id: 'hallucination_detector',
    name: 'גלאי הזיות',
    nameEn: 'Hallucination Detector',
    description: 'בחירת ליד וסריקת שיחת הבוט לזיהוי מידע שהומצא — שלא מופיע בבסיס הידע או בהנחיות העסק',
    icon: AlertTriangle,
    speed: 'עמוק',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    action: 'multi_lead',
    allLabel: 'נתח את כל השיחות',
    allDesc: 'סריקה כוללת של כל שיחות הבוט',
    selectLabel: 'בחר לידים לניתוח',
    selectDesc: 'בחירה ידנית של לידים ספציפיים'
  }
];

export default function AIToolbox({ tenantId, tenant, leads = [], sessions = [], knowledge = [], onNavigateToPerformance }) {
  const [runningTool, setRunningTool] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [toolResult, setToolResult] = useState(null);
  const [multiLeadMode, setMultiLeadMode] = useState(null); // null | 'all' | 'select'
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
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

    // Hallucination detector is handled separately via runHallucinationDetector
    if (tool.id === 'hallucination_detector') {
      setRunningTool(null);
      return;
    }

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

  const runMultiLeadTool = async (tool, leadIds) => {
    setRunningTool(tool.id);
    setToolResult(null);

    const targetLeads = leadIds.length > 0 ? leads.filter(l => leadIds.includes(l.id)) : leads;
    const leadNames = leadIds.length > 0 ? targetLeads.map(l => l.customer_name).join(', ') : 'כל הלקוחות';

    if (tool.id === 'hallucination_detector') {
      // Gather bot messages from sessions
      let targetSessions = [];
      if (leadIds.length > 0) {
        for (const leadObj of targetLeads) {
          const matched = sessions.filter(s =>
            s.lead_id === leadObj.id ||
            s.customer_name === leadObj.customer_name ||
            (leadObj.customer_phone && s.customer_phone === leadObj.customer_phone)
          );
          targetSessions.push(...matched);
        }
      }
      if (targetSessions.length === 0) targetSessions = sessions.slice(0, 15);
      targetSessions = [...new Map(targetSessions.map(s => [s.id, s])).values()];

      let allBotMessages = [];
      for (const session of targetSessions.slice(0, 15)) {
        const msgsRes = await base44.entities.ChatMessage.filter({ session_id: session.id }, 'created_date');
        allBotMessages.push(...msgsRes.filter(m => m.role === 'assistant').map(m => ({
          session_id: session.id, customer: session.customer_name || 'לא ידוע', content: m.content
        })));
      }

      const knowledgeText = knowledge.map(e => `[${e.category || 'general'}] ${e.title}: ${e.content}`).join('\n');

      const prompt = `אתה מבקר איכות חמור וקפדן. תפקידך לזהות כל מידע שהבוט AI המציא — כלומר כל דבר שלא מופיע מילה במילה או ברמז ברור במקורות המורשים.

חשוב מאוד: אם הבוט אמר משהו שלא כתוב במפורש במקורות — זו הזיה, גם אם זה נשמע סביר או הגיוני. הבוט חייב להישאר רק עם מה שכתוב במקורות.

=== מקורות מידע מורשים (רק מה שכתוב כאן הבוט רשאי לומר) ===

הנחיות מערכת (System Prompt):
${tenant?.system_prompt || 'אין'}

בסיס ידע (Knowledge Base):
${knowledgeText || 'ריק'}

=== תשובות הבוט לבדיקה ===
${allBotMessages.slice(0, 40).map(m => `[שיחה עם ${m.customer}]:\n${m.content}`).join('\n\n---\n\n')}

=== הוראות ניתוח מפורטות ===
עבור על כל תשובה של הבוט שורה אחרי שורה, ולכל פריט מידע שהבוט ציין, בדוק:

1. **שמות חבילות/מוצרים**: האם שם החבילה מופיע בדיוק במקורות? אם הבוט המציא שם חבילה (למשל "חבילת אקסטרים קורפורייט") שלא קיים במקורות — זו הזיה.
2. **מחירים**: האם המחיר המדויק מופיע במקורות? אם הבוט נתן מחיר שונה מהמקורות או המציא מחיר — זו הזיה קריטית.
3. **תוכן חבילות ושירותים**: האם כל הפריטים שהבוט ציין ככלולים בחבילה/שירות מופיעים במקורות? אם הבוט הוסיף דברים (BBQ, אזור פרטי, אנימציה, צוות ייעודי, מקרן, וכו') שלא מופיעים — זו הזיה.
4. **מתקנים ותשתיות**: האם הבוט ציין מתקנים (אולם הרצאות, חדר ישיבות, וכו') שלא מופיעים במקורות? אם כן — זו הזיה.
5. **שעות, מיקומים, פרטי קשר**: האם הפרטים תואמים למקורות?
6. **הבטחות**: האם הבוט הבטיח משהו שלא קיים במקורות?

לכל הזיה שמצאת, ציין:
- **ציטוט**: מה הבוט אמר (ציטוט מדויק)
- **הבעיה**: מה לא קיים במקורות
- **מה נכון**: מה כתוב בפועל במקורות (או "לא קיים במקורות כלל")
- **חומרה**: קריטי (מחירים שגויים, חבילות בדויות), בינוני (תוכן נוסף שלא קיים), נמוך (ניסוח מוגזם)

היה קפדן ומחמיר. עדיף לסמן יותר מדי הזיות מאשר לפספס. אם הבוט אמר "יש לנו X" ו-X לא מופיע במקורות, זו הזיה.
כתוב בעברית.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt, response_json_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, action_items: { type: "array", items: { type: "string" } } } }
      });
      setToolResult(result);

    } else if (tool.id === 'lead_scorer') {
      const leadsInfo = targetLeads.slice(0, 20).map(l =>
        `- ${l.customer_name}: סיבת פנייה: ${l.inquiry_reason || 'לא צוין'} | סיכום: ${l.summary || 'אין'} | עובדות: ${JSON.stringify(l.facts_json || {})}`
      ).join('\n');

      const prompt = `נתח את הלידים הבאים של העסק "${tenant?.company_name}" ותן לכל אחד ציון כוונת רכישה (0-100), רמת דחיפות (low/medium/high), סנטימנט, ותיאור קצר.

לידים לניתוח (${leadNames}):
${leadsInfo}

לכל ליד ציין: שם, ציון, דחיפות, סנטימנט, והסבר קצר. לאחר מכן תן סיכום כללי והמלצות.
כתוב בעברית.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt, response_json_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, action_items: { type: "array", items: { type: "string" } } } }
      });

      // Also update each lead with individual scores
      if (leadIds.length > 0) {
        const scorePrompt = `תן ציון לכל ליד. החזר JSON.\n\n${leadsInfo}`;
        const scores = await base44.integrations.Core.InvokeLLM({
          prompt: scorePrompt,
          response_json_schema: {
            type: "object",
            properties: {
              scores: { type: "array", items: { type: "object", properties: { name: { type: "string" }, intent_score: { type: "number" }, urgency_level: { type: "string" }, sentiment: { type: "string" } } } }
            }
          }
        });
        for (const score of (scores.scores || [])) {
          const matchLead = targetLeads.find(l => l.customer_name === score.name);
          if (matchLead) {
            await base44.entities.Lead.update(matchLead.id, {
              intent_score: score.intent_score,
              urgency_level: score.urgency_level,
              sentiment: score.sentiment
            });
          }
        }
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }

      setToolResult(result);

    } else if (tool.id === 'competitor_clash') {
      const leadsInfo = targetLeads.slice(0, 20).map(l =>
        `- ${l.customer_name}: סיבת פנייה: ${l.inquiry_reason || 'לא צוין'} | סיכום: ${l.summary || 'אין'} | עובדות: ${JSON.stringify(l.facts_json || {})} | מתחרה זוהה: ${l.competitor_detected ? 'כן' : 'לא'}`
      ).join('\n');

      const prompt = `נתח את השיחות עם הלידים הבאים של העסק "${tenant?.company_name}" וזהה אזכורי מתחרים. צור נקודות מכירה ייחודיות לעסק.

לידים (${leadNames}):
${leadsInfo}

זהה: 1) אילו מתחרים הוזכרו 2) מה הלקוחות השוו 3) נקודות מכירה ייחודיות שאפשר להדגיש 4) המלצות לשיפור. כתוב בעברית.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt, response_json_schema: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, action_items: { type: "array", items: { type: "string" } } } }
      });
      setToolResult(result);
    }

    setRunningTool(null);
  };

  const handleToolClick = (tool) => {
    if (tool.action === 'multi_lead') {
      setSelectedTool(tool);
      setToolResult(null);
      setMultiLeadMode(null);
      setSelectedLeadIds([]);
    } else if (tool.action === 'select_lead') {
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

  const toggleLeadSelection = (leadId) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
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
                  ) : tool.action === 'multi_lead' ? (
                    <>בחר לידים והפעל <ArrowLeft className="w-4 h-4" /></>
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
            <AIResultDisplay
              toolResult={toolResult}
              selectedTool={selectedTool}
              scoreDetails={toolResult.scoreDetails}
              onReset={() => { setToolResult(null); setSelectedLeadId(''); }}
            />
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
            <AIResultDisplay
              toolResult={toolResult}
              selectedTool={selectedTool}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-lead selection dialog (hallucination, lead_scorer, competitor_clash) */}
      <Dialog open={!!selectedTool && selectedTool.action === 'multi_lead'} onOpenChange={(open) => { if (!open) { setSelectedTool(null); setToolResult(null); setMultiLeadMode(null); setSelectedLeadIds([]); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTool && <selectedTool.icon className={`w-5 h-5 ${selectedTool?.color}`} />}
              {selectedTool?.name}
            </DialogTitle>
          </DialogHeader>

          {!toolResult ? (
            <div className="space-y-4">
              {!multiLeadMode ? (
                <>
                  <p className="text-sm text-slate-500">בחר אופן ניתוח:</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      disabled={!!runningTool}
                      onClick={() => {
                        setMultiLeadMode('all');
                        runMultiLeadTool(selectedTool, []);
                      }}
                    >
                      {runningTool === selectedTool?.id && multiLeadMode === 'all' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Users className={`w-5 h-5 ${selectedTool?.color}`} />
                      )}
                      <span className="font-bold">{selectedTool?.allLabel || 'נתח הכל'}</span>
                      <span className="text-xs text-slate-400">{selectedTool?.allDesc}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => setMultiLeadMode('select')}
                    >
                      <CheckSquare className={`w-5 h-5 ${selectedTool?.color}`} />
                      <span className="font-bold">{selectedTool?.selectLabel || 'בחר לידים'}</span>
                      <span className="text-xs text-slate-400">{selectedTool?.selectDesc}</span>
                    </Button>
                  </div>
                </>
              ) : multiLeadMode === 'all' ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className={`w-8 h-8 animate-spin ${selectedTool?.color}`} />
                  <p className="text-sm text-slate-500">מנתח...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">בחר לידים לניתוח ({selectedLeadIds.length} נבחרו):</p>
                  <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                    {leads.map(lead => (
                      <label 
                        key={lead.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedLeadIds.includes(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">{lead.customer_name}</span>
                          <span className="text-xs text-slate-400 block truncate">{lead.inquiry_reason || 'פנייה כללית'}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setMultiLeadMode(null)}>
                      חזרה
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={selectedLeadIds.length === 0 || !!runningTool}
                      onClick={() => runMultiLeadTool(selectedTool, selectedLeadIds)}
                    >
                      {runningTool === selectedTool?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {runningTool === selectedTool?.id ? 'מנתח...' : `נתח ${selectedLeadIds.length} לידים`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-xl p-4 ${selectedTool?.bgColor} border`}>
                <div className="flex items-center gap-2 mb-1">
                  {selectedTool && <selectedTool.icon className={`w-5 h-5 ${selectedTool?.color}`} />}
                  <h3 className="font-bold text-base">{toolResult.title}</h3>
                </div>
              </div>
              <div className="text-sm bg-white border rounded-xl p-5 prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_strong]:text-slate-800 [&_li]:my-0.5 [&_p]:my-1.5 [&_ul]:my-1 [&_ol]:my-1 [&_hr]:my-3" dir="rtl">
                <ReactMarkdown>{toolResult.content}</ReactMarkdown>
              </div>
              {toolResult.action_items?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    פעולות מומלצות
                  </p>
                  <div className="space-y-2">
                    {toolResult.action_items.map((item, i) => (
                      <div key={i} className="text-sm flex items-start gap-2.5 bg-white rounded-lg px-3 py-2 border border-amber-100">
                        <span className="bg-amber-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{typeof item === 'object' ? (item.name || item.description || item.recommendation || JSON.stringify(item)) : item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="outline" className="w-full rounded-xl" onClick={() => { setToolResult(null); setMultiLeadMode(null); setSelectedLeadIds([]); }}>
                🔄 הפעל שוב
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
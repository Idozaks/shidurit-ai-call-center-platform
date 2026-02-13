import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, Phone, MessageSquare, Archive, CheckCircle, 
  Loader2, User, Bot, X, Zap, Swords, ShieldCheck, TrendingDown, Copy, HelpCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LeadMetricsCards from './LeadMetricsCards';

export default function LeadDetailDialog({ lead, tenantId, tenant, leads = [], sessions = [], onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [followUpMsg, setFollowUpMsg] = useState('');
  const [generatingMsg, setGeneratingMsg] = useState(false);
  const [runningToolId, setRunningToolId] = useState(null);
  const [toolResult, setToolResult] = useState(null);
  const [detailedAnalysis, setDetailedAnalysis] = useState('');
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    }
  });

  // Find session by lead_id first, then fall back to phone match
  const { data: leadSessions = [] } = useQuery({
    queryKey: ['lead-sessions', lead?.id, tenantId],
    queryFn: async () => {
      // Try by lead_id first
      const byLeadId = await base44.entities.ChatSession.filter({ tenant_id: tenantId, lead_id: lead.id });
      if (byLeadId.length > 0) return byLeadId;
      // Fall back to customer_name match
      if (lead.customer_name) {
        const byName = await base44.entities.ChatSession.filter({ tenant_id: tenantId, customer_name: lead.customer_name });
        if (byName.length > 0) return byName;
      }
      // Fall back to phone match
      if (lead.customer_phone) {
        return base44.entities.ChatSession.filter({ tenant_id: tenantId, customer_phone: lead.customer_phone });
      }
      return [];
    },
    enabled: !!lead?.id && !!tenantId
  });

  const sessionId = leadSessions[0]?.id;

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['lead-messages', sessionId],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter({ session_id: sessionId });
      return msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    },
    enabled: !!sessionId,
    refetchInterval: 5000
  });

  // Real-time: refresh messages & lead data as conversation happens
  useEffect(() => {
    const unsubs = [
      base44.entities.ChatMessage.subscribe(() => {
        if (sessionId) queryClient.invalidateQueries({ queryKey: ['lead-messages', sessionId] });
      }),
      base44.entities.Lead.subscribe((event) => {
        if (event.id === lead?.id) {
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [sessionId, lead?.id, queryClient]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    const transcript = messages.map(m => `${m.role === 'user' ? 'לקוח' : 'בוט'}: ${m.content}`).join('\n');
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את השיחה הבאה עם הליד וספק סנטימנט, סיכום קצר (שורה אחת), ניתוח מפורט (כמה פסקאות), ציון כוונה, ופעולה מומלצת.

שם: ${lead.customer_name}
עסק: ${tenant?.company_name || ''}
שיחה:
${transcript}

הסיכום הקצר (summary) צריך להיות שורה אחת תמציתית.
הניתוח המפורט (detailed_analysis) צריך לכלול:
- ניתוח צרכי הלקוח
- נקודות מפתח מהשיחה
- הערכת מוכנות לרכישה/סגירה
- המלצות ספציפיות לנציג
- סיכון ונקודות לשיפור`,
      response_json_schema: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          summary: { type: "string" },
          detailed_analysis: { type: "string" },
          intent_score: { type: "number" },
          ai_suggested_action: { type: "string" },
          urgency_level: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    });

    await base44.entities.Lead.update(lead.id, {
      sentiment: result.sentiment,
      summary: result.summary,
      intent_score: result.intent_score,
      ai_suggested_action: result.ai_suggested_action,
      urgency_level: result.urgency_level,
      last_analysis_at: new Date().toISOString()
    });
    setDetailedAnalysis(result.detailed_analysis || '');
    setAnalysisExpanded(true);
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast.success('ניתוח AI הושלם');
    setAnalyzing(false);
  };

  const INLINE_TOOLS = [
    { id: 'lead_scorer', name: 'ניקוד ליד', icon: Sparkles, color: 'text-amber-500' },
    { id: 'smart_followup', name: 'הודעת מעקב', icon: MessageSquare, color: 'text-green-500' },
    { id: 'competitor_clash', name: 'ניתוח מתחרים', icon: Swords, color: 'text-purple-500' },
    { id: 'revenue_leak', name: 'דליפות ונטישה', icon: TrendingDown, color: 'text-red-500' },
    { id: 'knowledge_gaps', name: 'פערי ידע', icon: HelpCircle, color: 'text-orange-500' },
  ];

  const runInlineTool = async (toolId) => {
    setRunningToolId(toolId);
    setToolResult(null);

    const prompts = {
      lead_scorer: `נתח את הליד הבא ותן ציון כוונת רכישה (0-100), רמת דחיפות, וסנטימנט.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}`,
      smart_followup: `צור הודעת וואטסאפ מעקב מותאמת אישית ללקוח.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום שיחה: ${lead?.summary || 'אין'}\nסטטוס: ${lead?.status}\nעסק: ${tenant?.company_name}`,
      competitor_clash: `נתח את השיחה עם הליד וזהה אזכורי מתחרים. צור נקודות מכירה ייחודיות לעסק.\n\nשם לקוח: ${lead?.customer_name}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}\nעסק: ${tenant?.company_name}`,
      revenue_leak: `נתח את השיחות הבאות וזהה הזדמנויות שפוספסו ודליפות הכנסה.\n\nשיחות סגורות: ${sessions.filter(s => s.status === 'closed').length}\nלידים שאבדו: ${leads.filter(l => l.status === 'lost').length}\nסה"כ לידים: ${leads.length}\nלידים חמים: ${leads.filter(l => (l.intent_score || 0) >= 70).length}`,
      knowledge_gaps: `נתח את השיחה עם הליד וזהה שאלות שהבוט לא ידע לענות עליהן — מידע חסר, תשובות כלליות מדי, או הפניות מיותרות לנציג.\n\nשם: ${lead?.customer_name}\nסיבת פנייה: ${lead?.inquiry_reason}\nסיכום: ${lead?.summary || 'אין'}\nעובדות: ${JSON.stringify(lead?.facts_json || {})}\nעסק: ${tenant?.company_name}\n\nזהה פערי ידע ספציפיים והמלץ איזה תוכן צריך להוסיף לבסיס הידע.`
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompts[toolId],
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          action_items: { type: "array", items: { type: "string" } }
        }
      }
    });

    if (toolId === 'lead_scorer' && lead) {
      const scoreResult = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[toolId],
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
    setRunningToolId(null);
    toast.success('הכלי הופעל בהצלחה');
  };

  const generateFollowUp = async () => {
    setGeneratingMsg(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `צור הודעת מעקב קצרה וחמימה בעברית ללקוח.\nשם: ${lead.customer_name}\nסיבת פנייה: ${lead.inquiry_reason}\nסיכום: ${lead.summary || ''}\nפעולה מומלצת: ${lead.ai_suggested_action || ''}`,
    });
    setFollowUpMsg(result);
    setGeneratingMsg(false);
  };

  const getSentimentBadge = (sentiment) => {
    const config = {
      positive: { label: 'חיובי', className: 'bg-green-100 text-green-700' },
      neutral: { label: 'ניטרלי', className: 'bg-slate-100 text-slate-700' },
      negative: { label: 'שלילי', className: 'bg-red-100 text-red-700' }
    };
    const c = config[sentiment] || config.neutral;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  if (!lead) return null;

  return (
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div />
          <div className="text-right">
            <DialogTitle className="text-lg">{lead.customer_name}</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">{lead.inquiry_reason || 'פנייה כללית'}</p>
          </div>
        </div>
      </DialogHeader>

      {/* Phone */}
      {lead.customer_phone && (
        <div className="flex items-center gap-2 justify-end text-sm text-slate-600">
          {lead.customer_phone}
          <Phone className="w-4 h-4" />
        </div>
      )}

      {/* Metrics Cards */}
      <LeadMetricsCards lead={lead} messagesCount={messages.length} />

      {/* AI Analysis */}
      <div className="flex items-center gap-2 justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          disabled={analyzing || messages.length === 0}
          onClick={runAnalysis}
        >
          {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          ניתוח AI
        </Button>
      </div>

      {/* Sentiment + Summary */}
      {lead.sentiment && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 justify-end">
            {getSentimentBadge(lead.sentiment)}
            <span className="text-sm text-slate-500">סנטימנט</span>
          </div>
          {lead.summary && (
            <div>
              <p className="text-sm text-slate-500 text-right">סיכום</p>
              <p className="text-sm bg-slate-50 p-3 rounded-lg text-right">{lead.summary}</p>
            </div>
          )}
          {/* Detailed Analysis - collapsible */}
          {detailedAnalysis && (
            <div className="border border-indigo-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setAnalysisExpanded(!analysisExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/50 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  {analysisExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-indigo-700">ניתוח מפורט</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </div>
              </button>
              <AnimatePresence initial={false}>
                {analysisExpanded && (
                  <motion.div
                    key="analysis-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 py-3 bg-white">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap text-right leading-relaxed">{detailedAnalysis}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* AI Toolbox Inline */}
      <div className="space-y-2">
        <p className="text-sm text-slate-500 text-right">כלי AI</p>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {INLINE_TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7 px-2.5"
              disabled={!!runningToolId}
              onClick={() => runInlineTool(tool.id)}
            >
              {runningToolId === tool.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <tool.icon className={`w-3 h-3 ${tool.color}`} />
              )}
              {tool.name}
            </Button>
          ))}
        </div>

        {/* Tool Result */}
        {toolResult && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(toolResult.content); toast.success('הועתק!'); }}>
                <Copy className="w-3 h-3" /> העתק
              </Button>
              <p className="text-sm font-bold text-amber-800">{toolResult.title}</p>
            </div>
            <p className="text-xs text-amber-900 whitespace-pre-wrap">{toolResult.content}</p>
            {toolResult.action_items?.length > 0 && (
              <ul className="space-y-0.5">
                {toolResult.action_items.map((item, i) => (
                  <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs text-amber-600" onClick={() => setToolResult(null)}>
              סגור תוצאה
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-2 justify-center flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={generateFollowUp}
          disabled={generatingMsg}
        >
          {generatingMsg ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
          הודעת מעקב
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => {
            updateMutation.mutate({ id: lead.id, data: { status: 'contacted' } });
            toast.success('סומן כנוצר קשר');
          }}
        >
          <CheckCircle className="w-3 h-3" />
          סמן כנוצר קשר
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 text-red-600"
          onClick={() => {
            updateMutation.mutate({ id: lead.id, data: { status: 'lost' } });
            toast.success('הועבר לארכיון');
          }}
        >
          <Archive className="w-3 h-3" />
          ארכיון
        </Button>
      </div>

      {/* Follow-up message */}
      {followUpMsg && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-right">הודעת מעקב מוצעת:</p>
          <Textarea value={followUpMsg} onChange={(e) => setFollowUpMsg(e.target.value)} rows={4} className="text-right" />
          <Button size="sm" variant="outline" className="gap-1" onClick={() => { navigator.clipboard.writeText(followUpMsg); toast.success('הועתק!'); }}>
            העתק
          </Button>
        </div>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 justify-end">
        <Select
          value={lead.status}
          onValueChange={(value) => updateMutation.mutate({ id: lead.id, data: { status: value } })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">חדש</SelectItem>
            <SelectItem value="contacted">נוצר קשר</SelectItem>
            <SelectItem value="converted">הומר</SelectItem>
            <SelectItem value="lost">אבוד</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">סטטוס</span>
      </div>

      {/* Notes */}
      <div>
        <p className="text-sm text-slate-500 mb-1 text-right">הערות</p>
        <Textarea
          value={lead.notes || ''}
          onChange={(e) => updateMutation.mutate({ id: lead.id, data: { notes: e.target.value } })}
          placeholder="הוסף הערות..."
          className="text-right"
        />
      </div>

      <Separator />

      {/* Chat Transcript */}
      <div>
        <p className="text-sm font-medium flex items-center gap-2 justify-end mb-3">
          תמלול שיחה
          <MessageSquare className="w-4 h-4" />
        </p>
        {msgsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">אין שיחה מקושרת</p>
        ) : (
          <div className="space-y-3 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 rounded-tr-sm'
                      : 'bg-slate-50 dark:bg-slate-700/50 rounded-tl-sm'
                  }`}>
                    <p className="text-xs text-slate-400 mb-1">{msg.role === 'user' ? 'לקוח' : 'בוט'}</p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
    </DialogContent>
  );
}
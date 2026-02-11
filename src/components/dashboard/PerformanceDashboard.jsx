import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, TrendingUp, Clock, Users, Target, 
  Loader2, Sparkles, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

export default function PerformanceDashboard({ tenantId, leads = [], sessions = [] }) {
  const [roiAnalysis, setRoiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['all-messages', tenantId],
    queryFn: async () => {
      const allMsgs = [];
      for (const session of sessions.slice(0, 20)) {
        const msgs = await base44.entities.ChatMessage.filter({ session_id: session.id });
        allMsgs.push(...msgs);
      }
      return allMsgs;
    },
    enabled: sessions.length > 0
  });

  const totalMessages = messages.length;
  const avgIntentScore = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.intent_score || 0), 0) / leads.length)
    : 0;
  const hotLeads = leads.filter(l => l.intent_score >= 70).length;
  const hotLeadsPercent = leads.length > 0 ? Math.round((hotLeads / leads.length) * 100) : 0;
  const leadsWithContact = leads.filter(l => l.customer_phone || l.customer_email).length;
  const hoursSaved = (totalMessages * 0.04).toFixed(1); // ~2.4 min per message saved

  const statusBreakdown = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };

  const sentimentBreakdown = {
    positive: leads.filter(l => l.sentiment === 'positive').length,
    neutral: leads.filter(l => l.sentiment === 'neutral').length,
    negative: leads.filter(l => l.sentiment === 'negative').length,
  };

  const runROI = async () => {
    setAnalyzing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את הביצועים העסקיים הבאים ותן תובנות ROI:\n\nסה"כ שיחות: ${sessions.length}\nסה"כ הודעות: ${totalMessages}\nלידים: ${leads.length}\nלידים חמים (70+): ${hotLeads}\nהומרו: ${statusBreakdown.converted}\nאבדו: ${statusBreakdown.lost}\nציון כוונה ממוצע: ${avgIntentScore}\nשעות שנחסכו: ${hoursSaved}`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          roi_insights: { type: "array", items: { type: "string" } },
          improvement_tips: { type: "array", items: { type: "string" } }
        }
      }
    });
    setRoiAnalysis(result);
    setAnalyzing(false);
    toast.success('ניתוח ROI הושלם');
  };

  // Collect all unique tags/facts from leads
  const allTags = [];
  leads.forEach(lead => {
    if (lead.sentiment) allTags.push({ label: lead.sentiment === 'positive' ? 'חיובי' : lead.sentiment === 'negative' ? 'שלילי' : 'ניטרלי', color: lead.sentiment === 'positive' ? 'bg-green-100 text-green-700' : lead.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700' });
    if (lead.urgency_level === 'high') allTags.push({ label: 'דחיפות גבוהה', color: 'bg-orange-100 text-orange-700' });
    if (lead.competitor_detected) allTags.push({ label: 'מתחרה זוהה', color: 'bg-purple-100 text-purple-700' });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          onClick={runROI}
          disabled={analyzing}
        >
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          ROI הפעל ניתוח
        </Button>
        <div className="text-right">
          <h2 className="text-xl font-bold">ביצועים וערך עסקי</h2>
          <p className="text-sm text-slate-500">תמדדי ביצוע של הבוט סקירת ROI</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-3xl font-bold text-indigo-600">{avgIntentScore}</p>
            <p className="text-xs text-slate-500">ציון כוונה ממוצע</p>
            <p className="text-xs text-slate-400 mt-1">מתוך {totalMessages} הודעות</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-3xl font-bold text-orange-600">{leads.length}</p>
            <p className="text-xs text-slate-500">סה"כ לידים</p>
            <p className="text-xs text-slate-400 mt-1">עם פרטי קשר {leadsWithContact}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-3xl font-bold text-green-600">{hotLeadsPercent}%</p>
            <p className="text-xs text-slate-500">לידים חמים</p>
            <p className="text-xs text-slate-400 mt-1">{hotLeads} מתוך {leads.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-3xl font-bold text-blue-600">{hoursSaved}</p>
            <p className="text-xs text-slate-500">שעות שנחסכו</p>
            <p className="text-xs text-slate-400 mt-1">בהשוואה למענה אנושי</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-end">
              משפך המרה
              <BarChart3 className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-blue-600">{sessions.length}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">שיחות שהתחילו</p>
              </div>
              <div className="text-xs text-slate-400">↓ {leads.length > 0 && sessions.length > 0 ? Math.round((leads.length / sessions.length) * 100) : 0}%</div>
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-green-600">{leads.length}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">לידים שולצו</p>
              </div>
              <div className="text-xs text-slate-400">↓ {hotLeads > 0 && leads.length > 0 ? Math.round((hotLeads / leads.length) * 100) : 0}%</div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                  <span className="text-xl font-bold text-orange-600">{hotLeads}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">כוונה גבוהה</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Breakdown */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-end">
              פילוח לידים
              <Users className="w-4 h-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-right mb-2">לפי סטטוס</p>
              <div className="flex flex-wrap gap-2 justify-end">
                <Badge className="bg-blue-100 text-blue-700">חדש: {statusBreakdown.new}</Badge>
                <Badge className="bg-amber-100 text-amber-700">נוצר קשר: {statusBreakdown.contacted}</Badge>
                <Badge className="bg-green-100 text-green-700">הומר: {statusBreakdown.converted}</Badge>
                <Badge className="bg-red-100 text-red-700">אבוד: {statusBreakdown.lost}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-right mb-2">לפי סנטימנט</p>
              <div className="flex flex-wrap gap-2 justify-end">
                <Badge className="bg-green-100 text-green-700">חיובי: {sentimentBreakdown.positive}</Badge>
                <Badge className="bg-slate-100 text-slate-700">ניטרלי: {sentimentBreakdown.neutral}</Badge>
                <Badge className="bg-red-100 text-red-700">שלילי: {sentimentBreakdown.negative}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{totalMessages}</p>
                <p className="text-xs text-slate-500">הודעות</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-slate-500">תגובות נפילה</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROI Analysis Result */}
      {roiAnalysis && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-end">
              תובנות ROI
              <Sparkles className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{roiAnalysis.summary}</p>
            {roiAnalysis.roi_insights?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 text-right">תובנות:</p>
                <ul className="space-y-1">
                  {roiAnalysis.roi_insights.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 justify-end">
                      {item}
                      <span className="text-amber-500 mt-0.5">•</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {roiAnalysis.improvement_tips?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2 text-right">טיפים לשיפור:</p>
                <ul className="space-y-1">
                  {roiAnalysis.improvement_tips.map((item, i) => (
                    <li key={i} className="text-sm flex items-start gap-2 justify-end">
                      {item}
                      <span className="text-green-500 mt-0.5">✓</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
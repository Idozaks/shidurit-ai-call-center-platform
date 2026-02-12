import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Search, Eye, Phone, Clock, User, 
  Bot, Loader2, Mic, Sparkles, RefreshCw
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import GenerateConversationsDialog from './GenerateConversationsDialog';
import ConvertToLeadsButton from './ConvertToLeadsButton';

export default function SessionsList({ tenantId, sessions = [], tenant, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', selectedSession?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ session_id: selectedSession.id }, 'created_date'),
    enabled: !!selectedSession
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', tenantId],
    queryFn: () => base44.entities.Lead.filter({ tenant_id: tenantId }),
    enabled: !!tenantId
  });

  const sessionHasLead = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;
    return leads.some(l => 
      l.customer_phone === session.customer_phone && 
      l.tenant_id === session.tenant_id
    );
  };

  const analyzeSession = async (session) => {
    setAnalyzingId(session.id);
    const msgs = await base44.entities.ChatMessage.filter({ session_id: session.id }, 'created_date');
    if (msgs.length === 0) {
      toast.error('אין הודעות בשיחה לניתוח');
      setAnalyzingId(null);
      return;
    }

    const transcript = msgs.map(m => `${m.role === 'user' ? 'לקוח' : 'בוט'}: ${m.content}`).join('\n');

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את השיחה הבאה בין לקוח לבוט AI של עסק. חלץ מידע רלוונטי ליצירת ליד.\n\nשיחה:\n${transcript}\n\nשם הלקוח: ${session.customer_name || 'לא ידוע'}\nטלפון: ${session.customer_phone || 'לא ידוע'}\nסיבת פנייה: ${session.inquiry_reason || 'לא ידוע'}`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string", description: "סיכום קצר של השיחה" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          intent_score: { type: "number", description: "ציון כוונת רכישה 0-100" },
          urgency_level: { type: "string", enum: ["low", "medium", "high"] },
          ai_suggested_action: { type: "string", description: "פעולה מומלצת" },
          priority: { type: "string", enum: ["low", "normal", "high"] },
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
      facts_json: analysis.facts || {}
    });

    queryClient.invalidateQueries({ queryKey: ['leads'] });
    toast.success(`ליד חדש נוצר עבור ${session.customer_name}`);
    setAnalyzingId(null);
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'פעיל', variant: 'default' },
      waiting_for_agent: { label: 'ממתין לנציג', variant: 'secondary' },
      agent_active: { label: 'נציג פעיל', variant: 'default' },
      closed: { label: 'סגור', variant: 'outline' }
    };
    const { label, variant } = config[status] || config.active;
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
      <CardHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            שיחות
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <GenerateConversationsDialog tenantId={tenantId} tenant={tenant} />
            <ConvertToLeadsButton tenantId={tenantId} sessions={sessions} existingLeads={leads} />
            <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-1">
              <RefreshCw className="w-4 h-4" />
              רענן
            </Button>
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חיפוש..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="waiting_for_agent">ממתין לנציג</SelectItem>
                <SelectItem value="agent_active">נציג פעיל</SelectItem>
                <SelectItem value="closed">סגור</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין שיחות להצגה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div 
                key={session.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                onClick={() => navigate(createPageUrl('ConversationView') + `?sessionId=${session.id}&tenantId=${tenantId}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{session.customer_name || 'אורח'}</h3>
                        {session.mode === 'voice' && (
                          <Badge variant="outline" className="gap-1">
                            <Mic className="w-3 h-3" />
                            קולי
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        {getStatusBadge(session.status)}
                        {session.customer_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {session.customer_phone}
                          </span>
                        )}
                        {session.created_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(session.created_date), 'dd/MM HH:mm')}
                          </span>
                        )}
                      </div>
                      {session.inquiry_reason && (
                        <p className="text-sm text-slate-600 mt-2">{session.inquiry_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!sessionHasLead(session.id) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            disabled={analyzingId === session.id}
                            onClick={() => analyzeSession(session)}
                          >
                            {analyzingId === session.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            <span className="text-xs hidden sm:inline">נתח והמר לליד</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>נתח שיחה באמצעות AI והמר לליד</TooltipContent>
                      </Tooltip>
                    )}
                    {sessionHasLead(session.id) && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">ליד קיים</Badge>
                    )}
                    <Dialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedSession(session)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>הצג שיחה מלאה</TooltipContent>
                      </Tooltip>
                    <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
                      <DialogHeader>
                        <DialogTitle>שיחה עם {session.customer_name || 'אורח'}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[60vh] px-4">
                        {messagesLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        ) : messages.length === 0 ? (
                          <p className="text-center text-slate-400 py-8">אין הודעות</p>
                        ) : (
                          <div className="space-y-4">
                            {messages.map((msg) => (
                              <div 
                                key={msg.id}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                              >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                  msg.role === 'user' 
                                    ? 'bg-slate-200' 
                                    : msg.role === 'worker'
                                    ? 'bg-green-100'
                                    : 'bg-indigo-100'
                                }`}>
                                  {msg.role === 'user' ? (
                                    <User className="w-4 h-4 text-slate-600" />
                                  ) : msg.role === 'worker' ? (
                                    <User className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Bot className="w-4 h-4 text-indigo-600" />
                                  )}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-2xl ${
                                  msg.role === 'user'
                                    ? 'bg-slate-200 dark:bg-slate-700 rounded-tr-sm'
                                    : msg.role === 'worker'
                                    ? 'bg-green-100 dark:bg-green-900 rounded-tl-sm'
                                    : 'bg-indigo-100 dark:bg-indigo-900 rounded-tl-sm'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  {msg.created_date && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      {format(new Date(msg.created_date), 'HH:mm')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
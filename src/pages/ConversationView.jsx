import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowRight, User, Bot, Loader2, Phone, Clock, 
  Mic, Sparkles, MessageSquare, UserCheck, Send, Hand, RotateCcw, XCircle
} from "lucide-react";
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";

export default function ConversationView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('sessionId');
  const tenantId = urlParams.get('tenantId');
  const messagesEndRef = useRef(null);
  const [workerInput, setWorkerInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentWorker, setCurrentWorker] = useState(null);

  useEffect(() => {
    const workerData = localStorage.getItem('shidurit_worker');
    if (workerData) setCurrentWorker(JSON.parse(workerData));
  }, []);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-detail', sessionId],
    queryFn: async () => {
      const sessions = await base44.entities.ChatSession.filter({ id: sessionId });
      return sessions[0];
    },
    enabled: !!sessionId
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', sessionId],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter({ session_id: sessionId }, 'created_date');
      return msgs.sort((a, b) => {
        const dateCompare = new Date(a.created_date) - new Date(b.created_date);
        if (dateCompare !== 0) return dateCompare;
        return a.id.localeCompare(b.id);
      });
    },
    enabled: !!sessionId,
    refetchInterval: 3000
  });

  // Real-time subscription for new messages
  useEffect(() => {
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.session_id === sessionId || event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', sessionId] });
      }
    });
    return () => unsub();
  }, [sessionId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isWorkerActive = session?.status === 'agent_active';

  const handleTakeControl = () => handleChangeStatus('agent_active');
  const handleReleaseToBot = () => handleChangeStatus('active');

  const handleChangeStatus = async (newStatus) => {
    const updateData = { status: newStatus };
    if (newStatus === 'agent_active') {
      updateData.assigned_worker_id = currentWorker?.id || '';
    } else if (newStatus === 'active') {
      updateData.assigned_worker_id = '';
    }
    await base44.entities.ChatSession.update(sessionId, updateData);
    queryClient.invalidateQueries({ queryKey: ['session-detail', sessionId] });
    const labels = { active: 'פעיל (בוט)', waiting_for_agent: 'ממתין לנציג', agent_active: 'נציג פעיל', closed: 'סגור' };
    toast.success(`הסטטוס שונה ל: ${labels[newStatus]}`);
  };

  const handleSendWorkerMessage = async (e) => {
    e.preventDefault();
    if (!workerInput.trim() || isSending) return;
    setIsSending(true);
    await base44.entities.ChatMessage.create({
      session_id: sessionId,
      role: 'worker',
      content: workerInput.trim()
    });
    setWorkerInput('');
    queryClient.invalidateQueries({ queryKey: ['conversation-messages', sessionId] });
    setIsSending(false);
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-slate-400">לא נמצאה שיחה</p>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'פעיל', className: 'bg-green-100 text-green-700 border-green-200' },
      waiting_for_agent: { label: 'ממתין לנציג', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      agent_active: { label: 'נציג פעיל', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      closed: { label: 'סגור', className: 'bg-slate-100 text-slate-600 border-slate-200' }
    };
    const { label, className } = config[status] || config.active;
    return <Badge variant="outline" className={className}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(createPageUrl('TenantDashboard') + `?id=${tenantId}`)}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg">{session?.customer_name || 'אורח'}</h1>
                {session?.mode === 'voice' && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Mic className="w-3 h-3" />
                    קולי
                  </Badge>
                )}
                {getStatusBadge(session?.status)}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {session?.customer_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {session.customer_phone}
                  </span>
                )}
                {session?.created_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(session.created_date), 'dd/MM/yyyy HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Select value={session?.status || 'active'} onValueChange={handleChangeStatus}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">🤖 פעיל (בוט)</SelectItem>
              <SelectItem value="waiting_for_agent">⏳ ממתין לנציג</SelectItem>
              <SelectItem value="agent_active">👤 נציג פעיל</SelectItem>
              <SelectItem value="closed">🔒 סגור</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Take control bar */}
      {currentWorker && (
        <div className="sticky top-[65px] z-[9] max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-2 bg-blue-50 border-b border-blue-200">
          {isWorkerActive ? (
            <>
              <div className="flex items-center gap-1.5 text-blue-700 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                אתה שולט בשיחה — הבוט מושבת
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                onClick={handleReleaseToBot}
              >
                <RotateCcw className="w-4 h-4" />
                החזר לבוט
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                הבוט מנהל את השיחה
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleTakeControl}
              >
                <Hand className="w-4 h-4" />
                השתלט על השיחה
              </Button>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {messagesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>אין הודעות עדיין</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-slate-200' 
                      : msg.role === 'worker'
                      ? 'bg-green-100'
                      : 'bg-indigo-100'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-slate-600" />
                    ) : msg.role === 'worker' ? (
                      <UserCheck className="w-4 h-4 text-green-600" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-white rounded-tr-sm'
                      : msg.role === 'worker'
                      ? 'bg-green-50 border border-green-200 rounded-tl-sm'
                      : 'bg-white border border-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.created_date && (
                      <p className={`text-[10px] mt-1.5 ${
                        msg.role === 'user' ? 'text-white/50' : 'text-slate-400'
                      }`}>
                        {format(new Date(msg.created_date), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Worker input bar */}
      {isWorkerActive && currentWorker && (
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-4 py-3">
          <form onSubmit={handleSendWorkerMessage} className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={workerInput}
              onChange={(e) => setWorkerInput(e.target.value)}
              placeholder="הקלד הודעה כנציג..."
              className="flex-1 h-11"
              disabled={isSending}
              autoFocus
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-11 w-11 bg-blue-600 hover:bg-blue-700"
              disabled={!workerInput.trim() || isSending}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
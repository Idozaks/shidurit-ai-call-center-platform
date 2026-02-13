import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, Loader2, Phone, Sparkles, Building2, MessageCircle,
  User, Keyboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import VoiceChat from '../components/chat/VoiceChat';
import SuggestionChips from '../components/chat/SuggestionChips';
import DetailsInputModal from '../components/chat/DetailsInputModal';

// Helper to call the public backend function (supports both auth and non-auth)
const publicApi = async (payload) => {
  try {
    // Try SDK first (works when user is authenticated)
    const { base44 } = await import('@/api/base44Client');
    const response = await base44.functions.invoke('publicChat', payload);
    return response.data;
  } catch (sdkErr) {
    console.warn('SDK invoke failed, trying direct fetch:', sdkErr.message);
    // Fallback: direct HTTP call for unauthenticated users
    const res = await fetch(`/functions/publicChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

export default function PublicChat() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [leadId, setLeadId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const leadIdRef = useRef(null);
  const [chatMode, setChatMode] = useState('voice'); // 'text' or 'voice'
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const messagesEndRef = useRef(null);
  const [sessionStatus, setSessionStatus] = useState('active');
  const [collectedDetails, setCollectedDetails] = useState({});

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['publicTenant', slug],
    queryFn: async () => {
      const res = await publicApi({ action: 'getTenant', slug });
      return res.tenant;
    },
    enabled: !!slug
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ name }) => {
      const res = await publicApi({
        action: 'createSession',
        tenant_id: tenant.id,
        customer_name: name,
        mode: chatMode === 'voice' ? 'voice' : 'text'
      });
      return res.session;
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      setSessionStatus(session.status || 'active');
      setShowNameInput(false);
      if (tenant?.welcome_message) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: tenant.welcome_message
        }]);
      }
    }
  });

  // Poll session status & new worker messages when session exists
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(async () => {
      const sessionRes = await publicApi({ action: 'getSession', session_id: sessionId });
      const s = sessionRes.session;
      if (s) {
        setSessionStatus(s.status);
      }
      // Fetch any worker messages not yet shown
      const msgsRes = await publicApi({ action: 'getMessages', session_id: sessionId });
      const allMsgs = msgsRes.messages || [];
      const workerMsgs = allMsgs.filter(m => m.role === 'worker');
      if (workerMsgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newWorkerMsgs = workerMsgs.filter(m => !existingIds.has(m.id));
          if (newWorkerMsgs.length === 0) return prev;
          return [...prev, ...newWorkerMsgs.map(m => ({
            id: m.id,
            role: 'assistant', // Show worker messages as assistant to customer
            content: m.content
          }))];
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }) => {
      // Save user message
      await publicApi({ action: 'sendMessage', session_id: sessionId, role: 'user', content });

      // If a worker has taken control, don't generate AI response
      if (sessionStatus === 'agent_active') {
        return null;
      }

      // Get AI response
      const llmRes = await publicApi({ action: 'invokeLLM', prompt: buildPrompt(content), response_json_schema: null });
      const aiResponse = llmRes.result;

      // Save AI response
      await publicApi({ action: 'sendMessage', session_id: sessionId, role: 'assistant', content: aiResponse });

      // Update usage
      if (tenant) {
        await publicApi({ action: 'updateTenantUsage', tenant_id: tenant.id, usage_count: (tenant.usage_count || 0) + 1 });
      }

      return aiResponse;
    },
    onSuccess: (response) => {
      // Run lead intelligence in background after each message exchange
      if (response !== null) {
        extractAndStoreDetails();
        analyzeAndManageLead();
      }
    }
  });

  const extractAndStoreDetails = async () => {
    const allMessages = messages.map(m => 
      `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
    ).join('\n');

    const llmRes = await publicApi({
      action: 'invokeLLM',
      prompt: `Extract customer contact details from this conversation. Only extract details the CUSTOMER explicitly shared (not the bot asking for them).

Conversation:
${allMessages}

Customer name given at start: ${customerName}

Currently stored details: ${JSON.stringify(collectedDetails)}

Extract any NEW details found. If a field was already collected and hasn't changed, keep the old value. Return null for fields not yet provided.`,
      response_json_schema: {
        type: "object",
        properties: {
          full_name: { type: "string", description: "Customer's full name if shared" },
          phone: { type: "string", description: "Phone number if shared" },
          email: { type: "string", description: "Email if shared" },
          preferred_time: { type: "string", description: "Preferred meeting/call time if mentioned" },
          notes: { type: "string", description: "Any other personal details shared" }
        }
      }
    });

    const extracted = llmRes.result;
    // Merge: keep old values, override with new non-null values
    const merged = { ...collectedDetails };
    for (const [key, val] of Object.entries(extracted)) {
      if (val && val !== 'null' && val.trim() !== '') {
        merged[key] = val;
      }
    }

    // Only update if something new was found
    if (JSON.stringify(merged) !== JSON.stringify(collectedDetails)) {
      setCollectedDetails(merged);
      // Persist to session
      if (sessionId) {
        await publicApi({ action: 'updateSession', session_id: sessionId, data: { collected_details: merged, customer_phone: merged.phone || undefined } });
      }
      // Also update lead if exists
      const currentLeadId = leadIdRef.current;
      if (currentLeadId) {
        const leadUpdate = {};
        if (merged.phone) leadUpdate.customer_phone = merged.phone;
        if (merged.email) leadUpdate.customer_email = merged.email;
        if (Object.keys(leadUpdate).length > 0) {
          await publicApi({ action: 'updateLead', lead_id: currentLeadId, data: leadUpdate });
        }
      }
    }
  };

  const analyzeAndManageLead = async () => {
    const allMessages = messages.map(m => 
      `${m.role === 'user' ? 'לקוח' : 'נציג'}: ${m.content}`
    ).join('\n');

    const currentLeadId = leadIdRef.current;

    const businessType = tenant?.system_prompt || '';
    const businessName = tenant?.company_name || 'העסק';

    const llmAnalysis = await publicApi({
      action: 'invokeLLM',
      prompt: `You are a lead detection engine. Analyze this customer service conversation and decide if the person qualifies as a lead.

Business name: ${businessName}
Business context/category: ${businessType}
Customer name: ${customerName}

Conversation:
${allMessages}

=== LEAD DETECTION CRITERIA ===
A person becomes a lead when ANY of these conditions are met:
- intent_score reaches 40 or above
- They shared ANY personal details (name beyond greeting, phone, email, address, even small details)
- They asked about pricing, costs, or fees
- They asked about specific services, products, or treatments the business offers
- They showed interest in scheduling, booking, or making an appointment
- They expressed desire to contact or speak with the business owner/staff
- They asked about availability, opening hours with intent to visit
- They compared options or mentioned competitors (signals active shopping)

A person is NOT a lead if they:
- Only said hello/greeting without substance
- Asked something completely unrelated to the business
- Are clearly a bot or spam

IMPORTANT: Adapt your judgment to the business category. For example:
- Medical/clinic: asking about symptoms, treatments, doctors = lead
- Restaurant: asking about menu, reservations, catering = lead  
- Legal: asking about case types, consultation = lead
- E-commerce: asking about products, shipping, returns = lead
- Services: asking about availability, pricing, process = lead

=== ANALYSIS FIELDS ===
1. is_lead: boolean based on criteria above
2. intent_score (0-100): 0=no intent, 20=slightly curious, 40=interested (LEAD THRESHOLD), 60=seriously considering, 80=ready to act, 95+=urgent need
3. sentiment: "positive", "neutral", or "negative"
4. inquiry_reason: Short Hebrew description of what they want
5. urgency_level: "low", "medium", or "high"
6. priority: "low", "normal", or "high" based on intent + urgency combined
7. summary: Brief Hebrew summary of conversation (1-2 sentences)
8. ai_suggested_action: Short Hebrew next-step suggestion for the business owner
9. competitor_detected: boolean
10. status: "new" if just started showing interest, "contacted" if actively engaged`,
      response_json_schema: {
        type: "object",
        properties: {
          is_lead: { type: "boolean" },
          intent_score: { type: "number" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
          inquiry_reason: { type: "string" },
          urgency_level: { type: "string", enum: ["low", "medium", "high"] },
          priority: { type: "string", enum: ["low", "normal", "high"] },
          summary: { type: "string" },
          ai_suggested_action: { type: "string" },
          competitor_detected: { type: "boolean" },
          status: { type: "string", enum: ["new", "contacted"] }
        },
        required: ["is_lead", "intent_score", "sentiment", "inquiry_reason", "urgency_level", "priority", "summary", "ai_suggested_action", "competitor_detected", "status"]
      }
    });
    const analysis = llmAnalysis.result;

    if (!analysis.is_lead) return;

    const leadData = {
      intent_score: analysis.intent_score,
      sentiment: analysis.sentiment,
      inquiry_reason: analysis.inquiry_reason,
      urgency_level: analysis.urgency_level,
      priority: analysis.priority,
      summary: analysis.summary,
      ai_suggested_action: analysis.ai_suggested_action,
      competitor_detected: analysis.competitor_detected,
      status: analysis.status,
      last_analysis_at: new Date().toISOString()
    };

    if (currentLeadId) {
      // Lead exists — update it with fresh intelligence
      await publicApi({ action: 'updateLead', lead_id: currentLeadId, data: leadData });
    } else {
      // Create lead for the first time
      const leadRes = await publicApi({
        action: 'createLead',
        leadData: {
          tenant_id: tenant.id,
          customer_name: customerName,
          ...leadData
        }
      });
      const newLead = leadRes.lead;
      leadIdRef.current = newLead.id;
      setLeadId(newLead.id);
      // Link session to lead
      if (sessionId) {
        await publicApi({ action: 'updateSession', session_id: sessionId, data: { lead_id: newLead.id } });
      }
    }
  };

  const buildPrompt = (userMessage) => {
    const history = messages.map(m => `${m.role === 'user' ? 'לקוח' : tenant?.ai_persona_name || 'נועה'}: ${m.content}`).join('\n');
    const isFirstMessage = messages.filter(m => m.role === 'user').length === 0;
    
    return `אתה ${tenant?.ai_persona_name || 'נועה'}, נציג/ת שירות לקוחות של ${tenant?.company_name || 'העסק'}.
${tenant?.system_prompt || ''}

היסטוריית השיחה:
${history}

לקוח: ${userMessage}

כללים חשובים:
- CRITICAL: You MUST respond ONLY in Hebrew. Do NOT use any other language (no English, no Chinese, no Arabic, no other language). Every single word in your response must be in Hebrew.
- ענה בעברית בצורה ידידותית ומקצועית. היה תמציתי וענייני.
- ${isFirstMessage ? 'זו ההודעה הראשונה של הלקוח - הצג את עצמך בשמך פעם אחת בלבד.' : 'זו שיחה מתמשכת - אל תציג את עצמך שוב, אל תגיד שלום שוב, אל תחזור על שמך. פשוט המשך את השיחה ישירות וענה לשאלה.'}
- אל תחזור על מידע שכבר אמרת בהיסטוריית השיחה.`;
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (customerName.trim()) {
      createSessionMutation.mutate({ name: customerName });
    }
  };

  const sendChat = async (text) => {
    if (!text.trim() || isTyping) return;
    const userMessage = text.trim();
    setInputValue('');
    
    // Add user message
    const newUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage
    };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const response = await sendMessageMutation.mutateAsync({ content: userMessage });
      
      // Add AI response (only if bot responded, not when worker is active)
      if (response) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: response
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'מצטער, נתקלתי בבעיה. אנא נסה שוב.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendChat(inputValue);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" dir="rtl">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">לא נמצא עסק</p>
        </Card>
      </div>
    );
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" dir="rtl">
        <Card className="p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-600">העסק אינו זמין</p>
        </Card>
      </div>
    );
  }

  const themeColor = tenant.theme_color || '#6366f1';

  return (
    <div 
      className="h-[100dvh] flex flex-col overflow-hidden"
      dir="rtl"
      style={{ 
        background: `linear-gradient(135deg, ${themeColor}10 0%, white 50%, ${themeColor}05 100%)` 
      }}
    >
      {/* Header */}
      <header 
        className="sticky top-0 z-10 backdrop-blur-lg border-b"
        style={{ 
          backgroundColor: `${themeColor}f5`,
          borderColor: `${themeColor}30`
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-lg"
            style={{ backgroundColor: themeColor }}
          >
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">{tenant.company_name}</h1>
            <p className="text-white/80 text-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {tenant.ai_persona_name || 'נועה'} - עוזרת וירטואלית
            </p>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto max-w-3xl w-full mx-auto px-4 py-6">
        {showNameInput ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center h-full"
          >
            <Card className="p-8 w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <div className="text-center mb-6">
                <div 
                  className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"
                  style={{ backgroundColor: themeColor }}
                >
                  <MessageCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2">שלום! 👋</h2>
                <p className="text-slate-600">
                  אני {tenant.ai_persona_name || 'נועה'}, העוזרת הוירטואלית של {tenant.company_name}
                </p>
              </div>
              <form onSubmit={handleStartChat} className="space-y-4">
                <div>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="מה השם שלך?"
                    className="text-center text-lg h-12"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 text-lg"
                    style={{ backgroundColor: themeColor }}
                    disabled={createSessionMutation.isPending}
                    onClick={() => setChatMode('text')}
                  >
                    {createSessionMutation.isPending && chatMode === 'text' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><Keyboard className="w-5 h-5 ml-2" /> צ'אט</>
                    )}
                  </Button>
                  <Button 
                    type="submit"
                    className="flex-1 h-12 text-lg"
                    style={{ backgroundColor: themeColor }}
                    disabled={createSessionMutation.isPending}
                    onClick={() => setChatMode('voice')}
                  >
                    {createSessionMutation.isPending && chatMode === 'voice' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><Phone className="w-5 h-5 ml-2" /> שיחה קולית</>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : chatMode === 'voice' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 gap-6">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl"
              style={{ backgroundColor: themeColor }}
            >
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <Sparkles className="w-12 h-12" />
              )}
            </div>
            <h2 className="text-xl font-bold">{tenant.ai_persona_name || 'נועה'}</h2>
            
            {/* Voice transcripts */}
            {messages.length > 0 && (
              <div className="w-full max-w-md space-y-2 mb-4">
                {messages.slice(-4).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm px-3 py-2 rounded-xl ${
                      msg.role === 'user' ? 'bg-slate-200 mr-auto text-right' : 'bg-white border ml-auto text-right'
                    } max-w-[85%]`}
                  >
                    {msg.content}
                  </motion.div>
                ))}
              </div>
            )}

            <VoiceChat 
              tenant={tenant} 
              themeColor={themeColor}
              onTranscript={(role, text) => {
                if (role === 'user_transcript' || role === 'assistant_transcript') {
                  setMessages(prev => {
                    const displayRole = role === 'user_transcript' ? 'user' : 'assistant';
                    // Append to last message of same role, or create new
                    if (prev.length > 0 && prev[prev.length - 1].role === displayRole) {
                      const updated = [...prev];
                      updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: updated[updated.length - 1].content + text
                      };
                      return updated;
                    }
                    return [...prev, { id: Date.now(), role: displayRole, content: text }];
                  });
                }
              }}
            />
            
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              onClick={() => setChatMode('text')}
            >
              <Keyboard className="w-4 h-4 ml-1" /> עבור לצ'אט טקסט
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="space-y-4 pb-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback 
                        style={{ 
                          backgroundColor: message.role === 'user' ? '#e2e8f0' : themeColor,
                          color: message.role === 'user' ? '#64748b' : 'white'
                        }}
                      >
                        {message.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-slate-200 dark:bg-slate-700 rounded-tr-sm' 
                          : 'bg-white dark:bg-slate-800 rounded-tl-sm border'
                      }`}
                    >
                      <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback style={{ backgroundColor: themeColor, color: 'white' }}>
                      <Sparkles className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      <DetailsInputModal
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onSubmit={(text) => {
          setDetailsSubmitted(true);
          sendChat(text);
        }}
        themeColor={themeColor}
      />

      {/* Input */}
      {!showNameInput && chatMode === 'text' && (
        <div className="flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t px-4 pt-2 pb-4">
          <div className="max-w-3xl mx-auto">
            {!isTyping && (
                <SuggestionChips
                  tenantId={tenant?.id}
                  messages={messages}
                  onSelect={(text) => sendChat(text)}
                  themeColor={themeColor}
                  disabled={isTyping}
                  onOpenDetailsModal={() => setShowDetailsModal(true)}
                  detailsSubmitted={detailsSubmitted}
                />
              )}
          </div>
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="הקלד הודעה..."
              className="flex-1 h-12"
              disabled={isTyping}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12"
              style={{ backgroundColor: themeColor }}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
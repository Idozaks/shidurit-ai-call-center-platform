import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

export default function PublicChat() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [chatMode, setChatMode] = useState('voice'); // 'text' or 'voice'
  const messagesEndRef = useRef(null);

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['publicTenant', slug],
    queryFn: async () => {
      const tenants = await base44.entities.Tenant.filter({ slug, is_active: true });
      return tenants[0];
    },
    enabled: !!slug
  });

  const createSessionMutation = useMutation({
    mutationFn: async ({ name }) => {
      const lead = await base44.entities.Lead.create({
        tenant_id: tenant.id,
        customer_name: name,
        status: 'new'
      });
      const session = await base44.entities.ChatSession.create({
        tenant_id: tenant.id,
        lead_id: lead.id,
        customer_name: name,
        status: 'active',
        mode: 'text'
      });
      return session;
    },
    onSuccess: (session) => {
      setSessionId(session.id);
      setShowNameInput(false);
      // Add welcome message
      if (tenant?.welcome_message) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: tenant.welcome_message
        }]);
      }
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content }) => {
      // Save user message
      await base44.entities.ChatMessage.create({
        session_id: sessionId,
        role: 'user',
        content
      });

      // Get AI response
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(content),
        response_json_schema: null
      });

      // Save AI response
      await base44.entities.ChatMessage.create({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse
      });

      // Update usage
      if (tenant) {
        await base44.entities.Tenant.update(tenant.id, {
          usage_count: (tenant.usage_count || 0) + 1
        });
      }

      return aiResponse;
    }
  });

  const buildPrompt = (userMessage) => {
    const history = messages.map(m => `${m.role === 'user' ? 'לקוח' : tenant?.ai_persona_name || 'נועה'}: ${m.content}`).join('\n');
    
    return `אתה ${tenant?.ai_persona_name || 'נועה'}, נציג/ת שירות לקוחות של ${tenant?.company_name || 'העסק'}.
${tenant?.system_prompt || ''}

היסטוריית השיחה:
${history}

לקוח: ${userMessage}

ענה בעברית בצורה ידידותית ומקצועית. היה תמציתי וענייני.`;
  };

  const handleStartChat = (e) => {
    e.preventDefault();
    if (customerName.trim()) {
      createSessionMutation.mutate({ name: customerName });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
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
      
      // Add AI response
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: response
      }]);
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
      className="min-h-screen flex flex-col"
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
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
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

      {/* Input */}
      {!showNameInput && (
        <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t p-4">
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
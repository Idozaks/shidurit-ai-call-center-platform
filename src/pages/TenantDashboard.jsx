import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, Settings, Users, MessageSquare, BookOpen, 
  ExternalLink, BarChart3, UserPlus, FileText, Sparkles,
  Phone, Mail, Clock, TrendingUp, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";

import LeadsTable from '@/components/dashboard/LeadsTable.jsx';
import KnowledgeManager from '@/components/dashboard/KnowledgeManager.jsx';
import DoctorsManager from '@/components/dashboard/DoctorsManager.jsx';
import TenantSettings from '@/components/dashboard/TenantSettings.jsx';
import SessionsList from '@/components/dashboard/SessionsList.jsx';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const tenants = await base44.entities.Tenant.filter({ id: tenantId });
      return tenants[0];
    },
    enabled: !!tenantId
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', tenantId],
    queryFn: () => base44.entities.Lead.filter({ tenant_id: tenantId }, '-created_date'),
    enabled: !!tenantId
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', tenantId],
    queryFn: () => base44.entities.ChatSession.filter({ tenant_id: tenantId }, '-created_date'),
    enabled: !!tenantId
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ['knowledge', tenantId],
    queryFn: () => base44.entities.KnowledgeEntry.filter({ tenant_id: tenantId }),
    enabled: !!tenantId
  });

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p>לא נמצא עסק</p>
      </div>
    );
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    hotLeads: leads.filter(l => l.intent_score >= 70).length,
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.status === 'active').length
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20" dir="rtl">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                onClick={() => navigate(createPageUrl('Home'))}
                className="mb-4 gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </Button>
            </TooltipTrigger>
            <TooltipContent>חזרה לדף הבית</TooltipContent>
          </Tooltip>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                style={{ backgroundColor: tenant?.theme_color || '#6366f1' }}
              >
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  tenant?.company_name?.charAt(0)
                )}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">{tenant?.company_name}</h1>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="text-sm">/{tenant?.slug}</span>
                  <Badge variant={tenant?.is_active ? "default" : "secondary"}>
                    {tenant?.is_active ? 'פעיל' : 'מושבת'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href={createPageUrl('PublicChat') + `?slug=${tenant?.slug}`} target="_blank">
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      פתח צ׳אט
                    </Button>
                  </a>
                </TooltipTrigger>
                <TooltipContent>פתח את הצ'אט הציבורי</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          {[
            { title: 'לידים חדשים', value: stats.newLeads, icon: UserPlus, color: 'text-blue-600' },
            { title: 'לידים חמים', value: stats.hotLeads, icon: TrendingUp, color: 'text-orange-600' },
            { title: 'סה"כ לידים', value: stats.totalLeads, icon: Users, color: 'text-indigo-600' },
            { title: 'שיחות פעילות', value: stats.activeSessions, icon: MessageSquare, color: 'text-green-600' },
            { title: 'שימוש', value: `${tenant?.usage_count || 0}/${tenant?.usage_limit || 100}`, icon: BarChart3, color: 'text-violet-600' },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-md bg-white/70 dark:bg-slate-800/70">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <div>
                    <p className="text-xs text-slate-500">{stat.title}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/70 dark:bg-slate-800/70 p-1 mb-6 flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">סקירה</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">לידים</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">שיחות</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">בסיס ידע</span>
              </TabsTrigger>
              <TabsTrigger value="doctors" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">מומחים</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 text-xs sm:text-sm flex-shrink-0">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">הגדרות</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Leads */}
                <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      לידים אחרונים
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leads.slice(0, 5).length === 0 ? (
                      <p className="text-center text-slate-400 py-8">אין לידים עדיין</p>
                    ) : (
                      <div className="space-y-3">
                        {leads.slice(0, 5).map((lead) => (
                          <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                            <div>
                              <p className="font-medium">{lead.customer_name}</p>
                              <p className="text-sm text-slate-500">{lead.inquiry_reason || 'פנייה כללית'}</p>
                            </div>
                            <Badge variant={lead.status === 'new' ? 'default' : 'secondary'}>
                              {lead.status === 'new' ? 'חדש' : lead.status === 'contacted' ? 'נוצר קשר' : lead.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Persona */}
                <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet-600" />
                      פרסונת AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">שם הבוט</p>
                      <p className="font-medium">{tenant?.ai_persona_name || 'נועה'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">הודעת פתיחה</p>
                      <p className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                        {tenant?.welcome_message || 'שלום! איך אוכל לעזור לך היום?'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">בסיס ידע</p>
                      <p className="font-medium">{knowledge.length} פריטים</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="leads">
              <LeadsTable tenantId={tenantId} leads={leads} />
            </TabsContent>

            <TabsContent value="sessions">
              <SessionsList tenantId={tenantId} sessions={sessions} />
            </TabsContent>

            <TabsContent value="knowledge">
              <KnowledgeManager tenantId={tenantId} knowledge={knowledge} />
            </TabsContent>

            <TabsContent value="doctors">
              <DoctorsManager tenantId={tenantId} />
            </TabsContent>

            <TabsContent value="settings">
              <TenantSettings tenant={tenant} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}
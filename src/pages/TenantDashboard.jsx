import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Phone, Mail, Clock, TrendingUp, AlertCircle, Wrench, Key, UserCheck, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

import LeadsTable from '@/components/dashboard/LeadsTable.jsx';
import KnowledgeManager from '@/components/dashboard/KnowledgeManager.jsx';
import DoctorsManager from '@/components/dashboard/DoctorsManager.jsx';
import TenantSettings from '@/components/dashboard/TenantSettings.jsx';
import SessionsList from '@/components/dashboard/SessionsList.jsx';
import AIToolbox from '@/components/dashboard/AIToolbox.jsx';
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard.jsx';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['leads', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['sessions', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['knowledge', tenantId] });
  };

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
            <TabsList className="bg-gradient-to-r from-amber-500 to-orange-500 p-1.5 mb-6 flex-wrap h-auto gap-1 mx-auto w-fit">
              <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <BarChart3 className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">סקירה</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <Users className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">לידים</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">שיחות</span>
              </TabsTrigger>
              
              <TabsTrigger value="toolbox" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <Wrench className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">ארגז כלים</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <BarChart3 className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">ביצועים</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <Settings className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">הגדרות בוט</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <Key className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">API</span>
              </TabsTrigger>
              <TabsTrigger value="doctors" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <UserCheck className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">רופאים / אנשי קשר</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">מידע</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm flex-shrink-0 text-white/80 data-[state=active]:text-orange-700 data-[state=active]:bg-white transition-all duration-200 hover:scale-105 hover:bg-white/20">
                <Users className="w-4 h-4" />
                <span className="text-[10px] sm:text-sm leading-tight">פרופיל</span>
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
              <LeadsTable tenantId={tenantId} leads={leads} onRefresh={refreshAll} />
            </TabsContent>

            <TabsContent value="sessions">
              <SessionsList tenantId={tenantId} sessions={sessions} tenant={tenant} onRefresh={refreshAll} />
            </TabsContent>

            {/* knowledge moved to "info" tab */}

            <TabsContent value="toolbox">
              <AIToolbox tenantId={tenantId} tenant={tenant} leads={leads} sessions={sessions} />
            </TabsContent>

            <TabsContent value="performance">
              <PerformanceDashboard tenantId={tenantId} leads={leads} sessions={sessions} />
            </TabsContent>

            <TabsContent value="doctors">
              <DoctorsManager tenantId={tenantId} />
            </TabsContent>

            <TabsContent value="settings">
              <TenantSettings tenant={tenant} />
            </TabsContent>

            <TabsContent value="api">
              <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-indigo-600" />
                    מפתח API
                  </CardTitle>
                  <CardDescription>מפתח לגישה ישירה לבוט דרך API חיצוני</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg font-mono text-sm break-all direction-ltr text-left">
                    sk-{tenantId?.slice(0, 8)}-{tenant?.slug}-{tenantId?.slice(-8)}
                  </div>
                  <p className="text-sm text-slate-500">השתמש במפתח זה בכותרת Authorization כ-Bearer token.</p>
                  <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs text-left direction-ltr overflow-x-auto">
                    <pre>{`curl -X POST https://api.shidurit.ai/v1/chat \\
  -H "Authorization: Bearer sk-${tenantId?.slice(0, 8)}-${tenant?.slug}-${tenantId?.slice(-8)}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "שלום", "customer_name": "ישראל"}'`}</pre>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <KnowledgeManager tenantId={tenantId} knowledge={knowledge} />
            </TabsContent>

            <TabsContent value="profile">
              <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    פרופיל עסק
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">שם העסק</p>
                      <p className="font-medium">{tenant?.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Slug</p>
                      <p className="font-medium direction-ltr text-left">/{tenant?.slug}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">צבע מותג</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md" style={{ backgroundColor: tenant?.theme_color || '#6366f1' }} />
                        <span className="text-sm">{tenant?.theme_color || '#6366f1'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">סטטוס</p>
                      <Badge variant={tenant?.is_active ? "default" : "secondary"}>
                        {tenant?.is_active ? 'פעיל' : 'מושבת'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">שם הבוט</p>
                      <p className="font-medium">{tenant?.ai_persona_name || 'נועה'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">שימוש</p>
                      <p className="font-medium">{tenant?.usage_count || 0} / {tenant?.usage_limit || 100}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
    </TooltipProvider>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, Building2, MessageSquare, Users, TrendingUp, 
  Search, Settings, ExternalLink, BarChart3, Sparkles, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const currentWorker = React.useMemo(() => {
    const data = localStorage.getItem('shidurit_worker');
    return data ? JSON.parse(data) : null;
  }, []);

  const isSuperAdmin = currentWorker?.is_super_admin === true;

  const { data: allTenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list('-created_date')
  });

  const tenants = isSuperAdmin
    ? allTenants
    : allTenants.filter(t => t.id === currentWorker?.tenant_id);

  const tenantIds = tenants.map(t => t.id);

  const { data: allLeads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date', 100)
  });

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.ChatSession.list('-created_date', 100)
  });

  const leads = isSuperAdmin ? allLeads : allLeads.filter(l => tenantIds.includes(l.tenant_id));
  const sessions = isSuperAdmin ? allSessions : allSessions.filter(s => tenantIds.includes(s.tenant_id));

  const filteredTenants = tenants.filter(t => 
    t.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.is_active).length,
    totalLeads: leads.length,
    totalSessions: sessions.length
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-l from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                שידורית AI
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                פלטפורמת מוקד שירות אוטונומי מונע בינה מלאכותית
              </p>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    disabled={isRefreshing}
                    onClick={async () => {
                      setIsRefreshing(true);
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['tenants'] }),
                        queryClient.invalidateQueries({ queryKey: ['leads'] }),
                        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
                      ]);
                      setTimeout(() => setIsRefreshing(false), 800);
                    }}
                  >
                    <RefreshCw className={`w-4 h-4 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>רענן נתונים</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={createPageUrl('CreateTenant')}>
                    <Button className="bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25">
                      <Plus className="w-4 h-4 ml-2" />
                      הוסף עסק חדש
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>יצירת עסק חדש במערכת</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { title: 'סה"כ עסקים', value: stats.totalTenants, icon: Building2, color: 'from-blue-500 to-cyan-500' },
            { title: 'עסקים פעילים', value: stats.activeTenants, icon: Sparkles, color: 'from-green-500 to-emerald-500' },
            { title: 'לידים', value: stats.totalLeads, icon: Users, color: 'from-violet-500 to-purple-500' },
            { title: 'שיחות', value: stats.totalSessions, icon: MessageSquare, color: 'from-orange-500 to-amber-500' },
          ].map((stat, i) => (
            <Card key={i} className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</p>
                    <p className="text-2xl lg:text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש עסקים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border-slate-200 dark:border-slate-700"
            />
          </div>
        </motion.div>

        {/* Tenants Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
                <CardContent className="p-6">
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : filteredTenants.length === 0 ? (
            <Card className="col-span-full border-0 shadow-lg bg-white/70 dark:bg-slate-800/70">
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">אין עסקים עדיין</h3>
                <p className="text-slate-400 mt-1">צור את העסק הראשון שלך כדי להתחיל</p>
              </CardContent>
            </Card>
          ) : (
            filteredTenants.map((tenant, i) => (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className="group border-0 shadow-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <div 
                    className="h-2 w-full" 
                    style={{ backgroundColor: tenant.theme_color || '#6366f1' }} 
                  />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {tenant.logo_url ? (
                          <img src={tenant.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: tenant.theme_color || '#6366f1' }}
                          >
                            {tenant.company_name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">{tenant.company_name}</CardTitle>
                          <CardDescription className="text-xs">/{tenant.slug}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={tenant.is_active ? "default" : "secondary"}>
                        {tenant.is_active ? 'פעיל' : 'מושבת'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span>{tenant.ai_persona_name || 'נועה'}</span>
                      <span className="mx-1">•</span>
                      <span>{tenant.usage_count || 0}/{tenant.usage_limit || 100} שימושים</span>
                    </div>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={createPageUrl('TenantDashboard') + `?id=${tenant.id}`} className="flex-1">
                            <Button variant="outline" className="w-full" size="sm">
                              <BarChart3 className="w-4 h-4 ml-2" />
                              ניהול
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>עבור לדשבורד העסק</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={createPageUrl('PublicChat') + `?slug=${tenant.slug}`}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>פתח צ'אט ציבורי</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
    </TooltipProvider>
  );
}
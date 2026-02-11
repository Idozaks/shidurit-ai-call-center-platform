import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowRight, Building2, Palette, Sparkles, MessageSquare, 
  Upload, Loader2, CheckCircle
} from "lucide-react";
import { motion } from "framer-motion";

export default function CreateTenant() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    company_name: '',
    slug: '',
    theme_color: '#6366f1',
    ai_persona_name: 'נועה',
    welcome_message: 'שלום! איך אוכל לעזור לך היום?',
    system_prompt: '',
    usage_limit: 100,
    is_active: true
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tenant.create(data),
    onSuccess: (newTenant) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate(createPageUrl('TenantDashboard') + `?id=${newTenant.id}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s\u0590-\u05FF]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20" dir="rtl">
      <div className="max-w-2xl mx-auto p-6 lg:p-8">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                onClick={() => navigate(createPageUrl('Home'))}
                className="gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </Button>
            </TooltipTrigger>
            <TooltipContent>חזרה לדף הבית</TooltipContent>
          </Tooltip>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-l from-indigo-600 to-violet-600" />
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">יצירת עסק חדש</CardTitle>
              <CardDescription>הגדר את פרטי העסק והבוט שלך</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">שם העסק</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          company_name: e.target.value,
                          slug: generateSlug(e.target.value)
                        });
                      }}
                      placeholder="לדוגמה: מרפאת שיניים ד״ר כהן"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">כתובת URL</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">/c/</span>
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="slug"
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="theme_color">צבע מותג</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="theme_color"
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <Input
                        value={formData.theme_color}
                        onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* AI Settings */}
                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span>הגדרות AI</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ai_persona_name">שם הבוט</Label>
                    <Input
                      id="ai_persona_name"
                      value={formData.ai_persona_name}
                      onChange={(e) => setFormData({ ...formData, ai_persona_name: e.target.value })}
                      placeholder="נועה"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcome_message">הודעת פתיחה</Label>
                    <Textarea
                      id="welcome_message"
                      value={formData.welcome_message}
                      onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                      placeholder="שלום! איך אוכל לעזור לך היום?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="system_prompt">הוראות מערכת (אופציונלי)</Label>
                    <Textarea
                      id="system_prompt"
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      placeholder="הוראות מיוחדות לבוט..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usage_limit">מגבלת שימושים</Label>
                    <Input
                      id="usage_limit"
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 100 })}
                      min={1}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">עסק פעיל</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-l from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          יוצר עסק...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 ml-2" />
                          צור עסק
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>שמור ויצור עסק חדש</TooltipContent>
                </Tooltip>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    </TooltipProvider>
  );
}